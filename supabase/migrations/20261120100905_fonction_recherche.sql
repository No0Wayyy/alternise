-- Étape 7 : la fonction de recherche utilisée par le site (clé publique).
-- Elle ne renvoie que des offres affichables (pas les doublons) et calcule les distances avec PostGIS.

create function public.rechercher_offres(
  p_secteurs text[] default null,          -- ex. {commerce,marketing} ; null = tous
  p_texte text default null,               -- mot-clé dans le titre ou l'entreprise, ex. « vendeur »
  p_niveaux text[] default null,           -- niveaux de diplôme (libellés) ; null = tous
  p_inclure_sans_niveau boolean default true, -- garder les offres qui ne précisent pas le niveau
  p_depuis_jours integer default null,     -- publiées depuis moins de N jours ; null = toutes
  p_zones jsonb default null,              -- [{"lat":45.76,"lon":4.83,"rayon_km":20}, …] ; null = toute la France
  p_ecoles boolean default false,          -- false : offres d'entreprises ; true : annonces d'écoles
  p_tri text default 'date',               -- 'date' ou 'distance'
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
declare
  v_zones jsonb := coalesce(p_zones, '[]'::jsonb);
  v_texte text := nullif(trim(p_texte), '');
begin
  -- Garde-fous : pas plus de 10 zones, rayon entre 1 et 200 km, 50 résultats max par page.
  if jsonb_typeof(v_zones) <> 'array' or jsonb_array_length(v_zones) > 10 then
    raise exception 'p_zones : liste de 10 zones maximum';
  end if;
  if length(v_texte) > 100 then
    raise exception 'p_texte : 100 caractères maximum';
  end if;
  p_limite := least(greatest(coalesce(p_limite, 30), 1), 50);
  p_decalage := greatest(coalesce(p_decalage, 0), 0);

  return query
  with zones as (
    select
      extensions.st_setsrid(extensions.st_makepoint((z ->> 'lon')::float8, (z ->> 'lat')::float8), 4326)::extensions.geography as point,
      least(greatest(coalesce((z ->> 'rayon_km')::float8, 20), 1), 200) * 1000 as rayon_m
    from jsonb_array_elements(v_zones) as z
  ),
  trouvees as (
    select
      o.*,
      (select min(extensions.st_distance(o.position, zo.point)) from zones zo) / 1000 as dist_km,
      coalesce(o.publiee_le, o.cree_le) as date_tri
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

grant execute on function public.rechercher_offres to anon, authenticated;
