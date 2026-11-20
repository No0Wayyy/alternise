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

- **Alternance uniquement** : une offre sans contrat d'apprentissage ou de professionnalisation est refusée, comme un titre de stage, CDI, CDD, intérim ou job saisonnier.
- Un métier (code ROME) à la fois, moins de 2 appels par seconde.
- Les offres expirées sont supprimées. Une offre plus vue depuis 48 h aussi, sauf si plus de 5 % des demandes ont échoué.
- On ne garde ni téléphone ni SIRET : seulement ce qui sert à l'étudiant.

Les secteurs et leurs codes métiers sont dans [src/lib/secteurs.ts](src/lib/secteurs.ts).

## Clés API

Les clés vont dans `.env.local`, qui n'est jamais envoyé sur GitHub.
La liste des clés et où les créer : [docs/recherche-apis.md](docs/recherche-apis.md).

## Technique

Next.js 16, TypeScript, Tailwind CSS 4, Supabase (Postgres + PostGIS), hébergement Vercel.
