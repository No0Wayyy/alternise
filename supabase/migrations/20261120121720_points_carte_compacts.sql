-- La carte reçoit ses points en un seul bloc compact : [[id, lon, lat], …].
-- Une liste de lignes serait coupée à 1000 par Supabase, et serait 10 fois plus lourde.
-- Le titre, l'entreprise et le lien sont lus seulement quand l'étudiant touche un point.

drop function public.points_offres(text[], text, text[], boolean, integer, jsonb, jsonb, boolean);

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
      p_secteurs, p_texte, p_niveaux, p_inclure_sans_niveau, p_depuis_jours, p_zones, p_polygone, p_ecoles
    ) o
    where o.position is not null
    order by coalesce(o.publiee_le, o.cree_le) desc, o.id desc
    limit 5000
  ) p;
$$;

comment on function public.points_offres is 'Points de la carte des offres, [[id, lon, lat], …] (5000 maximum, les plus récentes d''abord).';

revoke all on function public.points_offres from public;
grant execute on function public.points_offres to anon, authenticated, service_role;
