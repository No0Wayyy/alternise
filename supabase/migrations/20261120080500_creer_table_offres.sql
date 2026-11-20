-- Étape 3 : la table des offres d'alternance.
-- Le script de collecte la remplit (clé secrète). Le site la lit (clé publique).

-- PostGIS : calcule les distances entre points GPS.
create extension if not exists postgis with schema extensions;

create table public.offres (
  id bigint generated always as identity primary key,

  -- D'où vient l'offre
  source text not null check (source in ('lba', 'france_travail', 'adzuna')),
  source_id text not null,

  -- Contenu
  titre text not null check (char_length(titre) <= 300),
  entreprise text check (char_length(entreprise) <= 300),
  description text check (char_length(description) <= 2000),

  -- Métier
  secteur text not null check (
    secteur in ('communication', 'marketing', 'commerce', 'hotellerie_restauration', 'industrie_maintenance')
  ),
  rome_codes text[] not null default '{}',

  -- Contrat
  types_contrat text[] not null default '{}',
  niveau_diplome text,
  debut_contrat date,

  -- Lieu
  ville text,
  code_postal text,
  position extensions.geography(point, 4326),

  -- Lien vers l'offre d'origine : http ou https seulement (pas de lien piégé)
  url_postuler text not null check (url_postuler ~* '^https?://'),

  -- Dates
  publiee_le timestamptz,
  vue_le timestamptz not null default now(), -- dernière collecte qui l'a vue
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),

  -- Doublons : même offre vue sur plusieurs sources
  cle_doublon text,
  doublon_de bigint references public.offres (id) on delete set null,

  unique (source, source_id)
);

comment on table public.offres is 'Offres d''alternance collectées chaque heure (La Bonne Alternance, France Travail, Adzuna).';

-- Index : rendent les recherches rapides.
create index offres_position_idx on public.offres using gist (position);
create index offres_rome_codes_idx on public.offres using gin (rome_codes);
create index offres_publiee_le_idx on public.offres (publiee_le desc);
create index offres_secteur_idx on public.offres (secteur);
create index offres_cle_doublon_idx on public.offres (cle_doublon);
create index offres_doublon_de_idx on public.offres (doublon_de);
create index offres_vue_le_idx on public.offres (vue_le);

-- Met à jour maj_le à chaque modification.
create function public.maj_date_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;

create trigger offres_maj_le
before update on public.offres
for each row execute function public.maj_date_modification();

-- Sécurité (RLS) : lecture pour tous, aucune écriture depuis le site.
alter table public.offres enable row level security;

create policy "Tout le monde peut lire les offres"
on public.offres
for select
to anon, authenticated
using (true);

grant select on public.offres to anon, authenticated;

-- Le script de collecte utilise la clé secrète (rôle service_role).
grant select, insert, update, delete on public.offres to service_role;
