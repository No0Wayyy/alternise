# Alternise

Toutes les offres d'alternance au même endroit, filtrées selon ton trajet.

Sources : La Bonne Alternance, France Travail, Adzuna (APIs officielles uniquement).

## Lancer le site sur ton PC

```bash
npm install
```

```bash
npm run dev
```

Puis ouvre http://localhost:3000.

## Collecte des offres

Le script `scripts/collecte/` récupère les offres d'alternance et les range dans Supabase.

```bash
npm run collecte
```

```bash
npm test
```

Règles :

- Sources : La Bonne Alternance (tous les métiers des secteurs), Adzuna (titres qui parlent d'alternance). France Travail : à venir.
- **Alternance uniquement** : une offre sans contrat d'apprentissage ou de professionnalisation est refusée, comme un titre de stage, CDI, CDD, intérim, freelance ou job saisonnier. Chez Adzuna, le titre doit dire « alternance », « apprenti »…
- **Annonces d'écoles** (CFA, BTS, « Devenez… ») : gardées mais marquées `annonce_ecole`, pour une catégorie à part.
- **Doublons** : même titre + même entreprise à moins de 5 km → une seule offre affichée (priorité La Bonne Alternance, puis France Travail, puis Adzuna).
- Adzuna : nombre d'appels limité par collecte (`ADZUNA_PAGES_MAX`), le temps de connaître le quota gratuit. Afficher « Adzuna » avec un lien sur leurs offres (obligatoire).
- Un métier (code ROME) à la fois, moins de 2 appels par seconde.
- Les offres expirées sont supprimées. Une offre LBA plus vue depuis 48 h aussi, sauf si plus de 5 % des demandes ont échoué. Une offre Adzuna de plus de 45 jours aussi.
- On ne garde ni téléphone ni SIRET : seulement ce qui sert à l'étudiant.

Les secteurs et leurs codes métiers sont dans [src/lib/secteurs.ts](src/lib/secteurs.ts).

### Collecte automatique (GitHub Actions)

Le fichier [.github/workflows/collecte.yml](.github/workflows/collecte.yml) lance les tests puis la collecte **chaque heure à hh:17 (UTC)**. Adzuna n'est interrogé qu'une heure sur 4 (quota).

- Voir les collectes : onglet **Actions** du dépôt sur GitHub.
- Lancer à la main : **Actions > Collecte des offres > Run workflow**.
- Les clés sont dans **Settings > Secrets and variables > Actions** (jamais dans le code).
- Attention : sur un dépôt public, GitHub met en pause les tâches planifiées après **60 jours sans activité** sur le dépôt. Il prévient par e-mail ; un clic sur « Enable workflow » les relance.

## Clés API

Les clés vont dans `.env.local`, qui n'est jamais envoyé sur GitHub.
La liste des clés et où les créer : [docs/recherche-apis.md](docs/recherche-apis.md).

## Technique

Next.js 16, TypeScript, Tailwind CSS 4, Supabase (Postgres + PostGIS), hébergement Vercel.
