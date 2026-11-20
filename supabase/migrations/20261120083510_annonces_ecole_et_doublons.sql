-- Étape 5 : annonces d'écoles à part, et fusion des doublons entre sources.

-- Annonce publiée par une école, un CFA ou un organisme de formation (catégorie à part sur le site).
alter table public.offres add column annonce_ecole boolean not null default false;
create index offres_annonce_ecole_idx on public.offres (annonce_ecole);

-- Marque les doublons : même titre + même entreprise (cle_doublon) à moins de 5 km.
-- L'offre gardée est celle de la source la plus fiable : La Bonne Alternance, puis France Travail, puis Adzuna.
-- Les autres pointent vers elle avec doublon_de. Renvoie le nombre de lignes modifiées.
create function public.marquer_doublons()
returns integer
language sql
set search_path = ''
as $$
  with choix as (
    select
      o.id,
      (
        select o2.id
        from public.offres o2
        where o2.cle_doublon = o.cle_doublon
          and o2.position is not null
          and extensions.st_dwithin(o2.position, o.position, 5000)
        order by
          case o2.source when 'lba' then 1 when 'france_travail' then 2 else 3 end,
          o2.id
        limit 1
      ) as principal
    from public.offres o
    where o.cle_doublon is not null
      and o.position is not null
  ),
  maj as (
    update public.offres o
    set doublon_de = nullif(c.principal, o.id)
    from choix c
    where c.id = o.id
      and o.doublon_de is distinct from nullif(c.principal, o.id)
    returning 1
  )
  select count(*)::integer from maj;
$$;

-- Seul le script de collecte (clé secrète) peut lancer la fusion.
revoke execute on function public.marquer_doublons() from public, anon, authenticated;
grant execute on function public.marquer_doublons() to service_role;
