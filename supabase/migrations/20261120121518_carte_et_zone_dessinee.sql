-- Étape 8 : la carte des offres et la zone dessinée.
-- 1. offres_filtrees : tous les filtres de recherche au même endroit (liste et carte).
-- 2. rechercher_offres : la liste, avec un nouveau filtre p_polygone (zone dessinée sur la carte).
-- 3. points_offres : les points de la carte, sans les descriptions (réponse légère).

create function public.offres_filtrees(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,              -- [{"lat":45.76,"lon":4.83,"rayon_km":20}, …]
  p_polygone jsonb default null,           -- [[lon,lat], [lon,lat], …] : 3 à 30 coins
  p_ecoles boolean default false
)
returns setof public.offres
language plpgsql
stable
set search_path = ''
as $$
declare
  v_zones jsonb := coalesce(p_zones, '[]'::jsonb);
  v_texte text := nullif(trim(p_texte), '');
  v_zone extensions.geometry;
begin
  -- Garde-fous : 10 villes maximum, 100 caractères maximum, 3 à 30 coins pour la zone.
  if jsonb_typeof(v_zones) <> 'array' or jsonb_array_length(v_zones) > 10 then
    raise exception 'p_zones : liste de 10 zones maximum';
  end if;
  if length(v_texte) > 100 then
    raise exception 'p_texte : 100 caractères maximum';
  end if;

  if p_polygone is not null then
    if jsonb_typeof(p_polygone) <> 'array' or jsonb_array_length(p_polygone) not between 3 and 30 then
      raise exception 'p_polygone : de 3 à 30 points [lon, lat]';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_polygone) as c
      where jsonb_typeof(c) <> 'array'
        or abs((c ->> 0)::float8) > 180
        or abs((c ->> 1)::float8) > 90
    ) then
      raise exception 'p_polygone : point invalide';
    end if;
    -- On referme la zone (dernier point = premier) ; st_makevalid répare un tracé qui se croise.
    select extensions.st_makevalid(
             extensions.st_makepolygon(extensions.st_makeline(array_agg(s.pt order by s.n) || (array_agg(s.pt order by s.n))[1]))
           )
      into v_zone
      from (
        select e.n, extensions.st_setsrid(extensions.st_makepoint((e.c ->> 0)::float8, (e.c ->> 1)::float8), 4326) as pt
        from jsonb_array_elements(p_polygone) with ordinality as e(c, n)
      ) s;
  end if;

  return query
  with zones as (
    select
      extensions.st_setsrid(extensions.st_makepoint((z ->> 'lon')::float8, (z ->> 'lat')::float8), 4326)::extensions.geography as point,
      least(greatest(coalesce((z ->> 'rayon_km')::float8, 20), 1), 200) * 1000 as rayon_m
    from jsonb_array_elements(v_zones) as z
  )
  select o.*
  from public.offres o
  where o.doublon_de is null
    and o.annonce_ecole = coalesce(p_ecoles, false)
    and (p_secteurs is null or o.secteur = any (p_secteurs))
    and (
      v_texte is null
      or o.titre ilike '%' || v_texte || '%'
      or o.entreprise ilike '%' || v_texte || '%'
    )
    and (
      p_niveaux is null
      or o.niveau_diplome = any (p_niveaux)
      or (o.niveau_diplome is null and coalesce(p_inclure_sans_niveau, true))
    )
    and (p_depuis_jours is null or coalesce(o.publiee_le, o.cree_le) >= now() - make_interval(days => p_depuis_jours))
    and (
      jsonb_array_length(v_zones) = 0
      or exists (
        select 1 from zones zo
        where o.position is not null and extensions.st_dwithin(o.position, zo.point, zo.rayon_m)
      )
    )
    and (
      v_zone is null
      or (o.position is not null and extensions.st_intersects(v_zone, o.position::extensions.geometry))
    );
end;
$$;

comment on function public.offres_filtrees is 'Offres affichables (sans doublons) qui passent tous les filtres de recherche.';

-- La liste : même chose qu'avant, avec le filtre de zone en plus.
drop function public.rechercher_offres(text[], text, text[], boolean, integer, jsonb, boolean, text, integer, integer);

create function public.rechercher_offres(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,
  p_polygone jsonb default null,
  p_ecoles boolean default false,
  p_tri text default 'date',               -- 'date' ou 'distance'
  p_limite integer default 30,             -- 50 maximum
  p_decalage integer default 0
)
returns table (
  id bigint,
  titre text,
  entreprise text,
  description text,
  secteur text,
  types_contrat text[],
  niveau_diplome text,
  debut_contrat date,
  ville text,
  code_postal text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  url_postuler text,
  source text,
  origine text,
  publiee_le timestamptz,
  est_nouvelle boolean,
  total bigint
)
language plpgsql
stable
set search_path = ''
as $$
begin
  p_limite := least(greatest(coalesce(p_limite, 30), 1), 50);
  p_decalage := greatest(coalesce(p_decalage, 0), 0);

  return query
  with zones as (
    select
      extensions.st_setsrid(extensions.st_makepoint((z ->> 'lon')::float8, (z ->> 'lat')::float8), 4326)::extensions.geography as point
    from jsonb_array_elements(coalesce(p_zones, '[]'::jsonb)) as z
  ),
  trouvees as (
    select
      o.*,
      (select min(extensions.st_distance(o.position, zo.point)) from zones zo) / 1000 as dist_km,
      coalesce(o.publiee_le, o.cree_le) as date_tri
    from public.offres_filtrees(
      p_secteurs, p_texte, p_niveaux, p_inclure_sans_niveau, p_depuis_jours, p_zones, p_polygone, p_ecoles
    ) o
  )
  select
    t.id,
    t.titre,
    t.entreprise,
    left(t.description, 300),
    t.secteur,
    t.types_contrat,
    t.niveau_diplome,
    t.debut_contrat,
    t.ville,
    t.code_postal,
    extensions.st_y(t.position::extensions.geometry),
    extensions.st_x(t.position::extensions.geometry),
    round(t.dist_km::numeric, 1)::float8,
    t.url_postuler,
    t.source,
    t.origine,
    t.publiee_le,
    t.date_tri >= now() - interval '24 hours',
    count(*) over ()
  from trouvees t
  order by
    case when p_tri = 'distance' then t.dist_km end asc nulls last,
    t.date_tri desc,
    t.id desc
  limit p_limite
  offset p_decalage;
end;
$$;

comment on function public.rechercher_offres is 'Recherche des offres d''alternance affichables (sans doublons), avec filtres et distances.';

-- La carte : seulement ce qu'il faut pour un point et sa petite fiche. 2000 points maximum.
create function public.points_offres(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,
  p_polygone jsonb default null,
  p_ecoles boolean default false
)
returns table (
  id bigint,
  titre text,
  entreprise text,
  ville text,
  latitude double precision,
  longitude double precision,
  url_postuler text
)
language sql
stable
set search_path = ''
as $$
  select
    o.id,
    o.titre,
    o.entreprise,
    o.ville,
    round(extensions.st_y(o.position::extensions.geometry)::numeric, 5)::float8,
    round(extensions.st_x(o.position::extensions.geometry)::numeric, 5)::float8,
    o.url_postuler
  from public.offres_filtrees(
    p_secteurs, p_texte, p_niveaux, p_inclure_sans_niveau, p_depuis_jours, p_zones, p_polygone, p_ecoles
  ) o
  where o.position is not null
  order by coalesce(o.publiee_le, o.cree_le) desc, o.id desc
  limit 2000;
$$;

comment on function public.points_offres is 'Points de la carte des offres (2000 maximum, les plus récentes d''abord).';

-- Lecture seule sur des offres déjà publiques : le site peut appeler ces fonctions avec la clé publique.
revoke all on function public.offres_filtrees from public;
revoke all on function public.rechercher_offres from public;
revoke all on function public.points_offres from public;
grant execute on function public.offres_filtrees to anon, authenticated, service_role;
grant execute on function public.rechercher_offres to anon, authenticated, service_role;
grant execute on function public.points_offres to anon, authenticated, service_role;
