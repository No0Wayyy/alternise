-- Étape 4 : deux infos utiles venues de La Bonne Alternance.

-- Plateforme d'origine de l'offre (ex. "France Travail", "Hellowork"), affichée à l'étudiant.
alter table public.offres add column origine text check (char_length(origine) <= 100);

-- Date d'expiration annoncée : la collecte supprime les offres expirées.
alter table public.offres add column expire_le timestamptz;
create index offres_expire_le_idx on public.offres (expire_le);
