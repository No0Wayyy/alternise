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

## Clés API

Les clés vont dans `.env.local`, qui n'est jamais envoyé sur GitHub.
La liste des clés et où les créer : [docs/recherche-apis.md](docs/recherche-apis.md).

## Technique

Next.js 16, TypeScript, Tailwind CSS 4, Supabase (Postgres + PostGIS), hébergement Vercel.
