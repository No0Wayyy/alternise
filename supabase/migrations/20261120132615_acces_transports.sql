-- Étape 9 : accès en transports et temps de trajet.
-- 1. Tables arrets (bus, car, tram, métro… de toute la France) et gares (SNCF), remplies une fois par mois.
-- 2. Pour chaque offre : distance à l'arrêt le plus proche (arret_m) et à la gare la plus proche (gare_m).
-- 3. Nouveaux filtres p_arret_max_m et p_gare_max_m ; zone jusqu'à 500 coins (zone de trajet calculée par ORS).

create table public.arrets (
  id bigint generated always as identity primary key,
  position extensions.geography(point, 4326) not null
);
create index arrets_position_idx on public.arrets using gist (position);
comment on table public.arrets is 'Arrêts de transport en commun (source : transport.data.gouv.fr, sans les réseaux scolaires), dédoublonnés.';

create table public.gares (
  id bigint generated always as identity primary key,
  nom text not null check (length(nom) <= 200),
  position extensions.geography(point, 4326) not null
);
create index gares_position_idx on public.gares using gist (position);
comment on table public.gares is 'Gares de voyageurs SNCF (licence ODbL).';

-- Ces deux tables servent seulement aux calculs : le site ne les lit pas directement.
alter table public.arrets enable row level security;
alter table public.gares enable row level security;
revoke all on public.arrets, public.gares from anon, authenticated;
grant all on public.arrets, public.gares to service_role;

alter table public.offres
  add column arret_m integer,
  add column gare_m integer,
  add column acces_calcule boolean not null default false;
comment on column public.offres.arret_m is 'Distance (mètres, à vol d''oiseau) à l''arrêt de transport le plus proche.';
comment on column public.offres.gare_m is 'Distance (mètres, à vol d''oiseau) à la gare SNCF la plus proche.';

-- Calcule les distances des offres pas encore calculées (ou de toutes avec p_tout, après un rechargement).
create function public.calculer_acces(p_tout boolean default false)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_nombre integer;
begin
  update public.offres o
  set
    arret_m = (
      select round(extensions.st_distance(o.position, a.position))::integer
      from public.arrets a
      order by a.position operator(extensions.<->) o.position
      limit 1
    ),
    gare_m = (
      select round(extensions.st_distance(o.position, g.position))::integer
      from public.gares g
      order by g.position operator(extensions.<->) o.position
      limit 1
    ),
    acces_calcule = true
  where o.position is not null
    and (coalesce(p_tout, false) or not o.acces_calcule);
  get diagnostics v_nombre = row_count;
  return v_nombre;
end;
$$;
revoke all on function public.calculer_acces from public, anon, authenticated;
grant execute on function public.calculer_acces to service_role;

-- Les fonctions de recherche changent de paramètres : on les recrée.
drop function public.points_offres(text[], text, text[], boolean, integer, jsonb, jsonb, boolean);
drop function public.rechercher_offres(text[], text, text[], boolean, integer, jsonb, jsonb, boolean, text, integer, integer);
drop function public.offres_filtrees(text[], text, text[], boolean, integer, jsonb, jsonb, boolean);

create function public.offres_filtrees(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,              -- [{"lat":45.76,"lon":4.83,"rayon_km":20}, …]
  p_polygone jsonb default null,           -- [[lon,lat], …] : 3 à 500 coins (zone dessinée ou zone de trajet)
  p_ecoles boolean default false,
  p_arret_max_m integer default null,      -- arrêt de transport à moins de N mètres
  p_gare_max_m integer default null        -- gare à moins de N mètres
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
  if jsonb_typeof(v_zones) <> 'array' or jsonb_array_length(v_zones) > 10 then
    raise exception 'p_zones : liste de 10 zones maximum';
  end if;
  if length(v_texte) > 100 then
    raise exception 'p_texte : 100 caractères maximum';
  end if;

  if p_polygone is not null then
    if jsonb_typeof(p_polygone) <> 'array' or jsonb_array_length(p_polygone) not between 3 and 500 then
      raise exception 'p_polygone : de 3 à 500 points [lon, lat]';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_polygone) as c
      where jsonb_typeof(c) <> 'array'
        or abs((c ->> 0)::float8) > 180
        or abs((c ->> 1)::float8) > 90
    ) then
      raise exception 'p_polygone : point invalide';
    end if;
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
    )
    and (p_arret_max_m is null or o.arret_m <= p_arret_max_m)
    and (p_gare_max_m is null or o.gare_m <= p_gare_max_m);
end;
$$;
comment on function public.offres_filtrees is 'Offres affichables (sans doublons) qui passent tous les filtres de recherche.';

create function public.rechercher_offres(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,
  p_polygone jsonb default null,
  p_ecoles boolean default false,
  p_arret_max_m integer default null,
  p_gare_max_m integer default null,
  p_tri text default 'date',
  p_limite integer default 30,
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
  arret_m integer,
  gare_m integer,
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
      p_secteurs, p_texte, p_niveaux, p_inclure_sans_niveau, p_depuis_jours, p_zones, p_polygone, p_ecoles,
      p_arret_max_m, p_gare_max_m
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
    t.arret_m,
    t.gare_m,
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

create function public.points_offres(
  p_secteurs text[] default null,
  p_texte text default null,
  p_niveaux text[] default null,
  p_inclure_sans_niveau boolean default true,
  p_depuis_jours integer default null,
  p_zones jsonb default null,
  p_polygone jsonb default null,
  p_ecoles boolean default false,
  p_arret_max_m integer default null,
  p_gare_max_m integer default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_array(p.id, p.lon, p.lat)), '[]'::jsonb)
  from (
    select
      o.id,
      round(extensions.st_x(o.position::extensions.geometry)::numeric, 5) as lon,
      round(extensions.st_y(o.position::extensions.geometry)::numeric, 5) as lat
    from public.offres_filtrees(
      p_secteurs, p_texte, p_niveaux, p_inclure_sans_niveau, p_depuis_jours, p_zones, p_polygone, p_ecoles,
      p_arret_max_m, p_gare_max_m
    ) o
    where o.position is not null
    order by coalesce(o.publiee_le, o.cree_le) desc, o.id desc
    limit 5000
  ) p;
$$;
comment on function public.points_offres is 'Points de la carte des offres, [[id, lon, lat], …] (5000 maximum, les plus récentes d''abord).';

revoke all on function public.offres_filtrees from public;
revoke all on function public.rechercher_offres from public;
revoke all on function public.points_offres from public;
grant execute on function public.offres_filtrees to anon, authenticated, service_role;
grant execute on function public.rechercher_offres to anon, authenticated, service_role;
grant execute on function public.points_offres to anon, authenticated, service_role;
