# Alternise : prompt de lancement

Ce fichier a 5 parties :

1. Comment t'en servir
2. Le prompt à copier
3. Les skills et outils à ajouter
4. Ce qui est gratuit (et les pièges)
5. Petit lexique

---

## 1. Comment t'en servir

1. Installe les outils de la partie 3 (10 minutes).
2. Ouvre une nouvelle session Claude Code dans le dossier `App Alternise`.
3. Colle le prompt de la partie 2 et envoie-le.

Claude lira aussi `CLAUDE.md` tout seul. Ce fichier contient tes garde-fous : pas de données perso, pas de fichiers hors du projet sans ton accord, pas de clé secrète dans le code.

---

## 2. Le prompt à copier

```text
Tu es mon binôme développeur. Je débute : explique chaque étape en mots
simples, en français, et dis-moi ce que tu fais avant de le faire.
Respecte les règles de CLAUDE.md.

## Le projet
Site web "Alternise". Il réunit en un seul endroit les offres d'alternance
d'un secteur choisi, et aide l'étudiant à postuler très vite.

## Contraintes
- 100 % gratuit (paliers gratuits uniquement).
- En ligne 24 h/24.
- Simple à maintenir par un débutant.
- Clair et rapide, d'abord sur téléphone.

## Sources d'offres (APIs officielles uniquement)
Avant de coder, vérifie la doc à jour de chaque API (Context7 ou site
officiel) et dis-moi quelles clés je dois créer. Je les crée moi-même.
1. La Bonne Alternance (API publique de l'État, portail
   api.apprentissage.beta.gouv.fr) : offres d'alternance de France Travail
   et des partenaires, plus les entreprises qui recrutent souvent en
   alternance (pour les candidatures spontanées).
2. France Travail, API "Offres d'emploi" (francetravail.io) : filtrer sur
   les contrats d'apprentissage et de professionnalisation.
3. Adzuna API et Jooble API (paliers gratuits) : offres reprises d'autres
   sites d'emploi.
Interdit : scraper Indeed, LinkedIn, Welcome to the Jungle, HelloWork.
À la place : boutons "Chercher aussi sur Indeed / LinkedIn / WTTJ /
HelloWork" qui ouvrent leur recherche déjà remplie avec mes critères.

## Géographie et transport
- Adresse vers coordonnées GPS : API de géocodage de la Géoplateforme IGN
  (ancienne API Adresse), gratuite.
- Temps de trajet à pied, vélo, voiture : OpenRouteService (isochrones,
  clé gratuite).
- Bus, tram, train : données GTFS de transport.data.gouv.fr pour trouver
  les arrêts et gares près de chaque offre. Navitia en option si le
  quota gratuit suffit.
- Carte : MapLibre ou Leaflet avec tuiles OpenStreetMap / OpenFreeMap.

## Version 1 (MVP)
- Recherche par secteur et métier (codes ROME), niveau de diplôme, date.
- Plusieurs zones à la fois : villes + rayon en km, ou zone dessinée sur
  la carte.
- Filtres trajet : "à moins de X min à pied", "arrêt de bus/tram à moins
  de 500 m", "gare à moins de X km", distance max.
- Vue liste + vue carte. Tri par date ou distance. Badge "Nouveau" pour
  les offres de moins de 24 h.
- Fusion des doublons (même offre vue sur plusieurs sources).
- Bouton "Postuler" qui mène direct à l'offre d'origine.
- Favoris et suivi des candidatures (À postuler / Envoyée / Relance /
  Entretien), gardés dans le navigateur. Pas de compte.

## Version 2 (plus tard)
- Alertes email (Resend, palier gratuit) dès qu'une offre colle aux
  critères enregistrés.
- Rappel de relance 7 jours après l'envoi.
- Liste d'entreprises qui recrutent souvent en alternance près de moi.
- Site installable sur téléphone (PWA) avec notifications.
- Comptes (Supabase Auth) seulement si vraiment utile.

## Technique
- Next.js + TypeScript + Tailwind.
- Base de données : Supabase (palier gratuit), Postgres + PostGIS pour
  les calculs de distance.
- Collecte : GitHub Actions lance un script toutes les heures. Le script
  appelle les APIs, nettoie, fusionne les doublons, met la base à jour,
  et supprime les offres expirées.
- Hébergement : Cloudflare Pages ou Vercel (palier Hobby).
- Code sur GitHub. Secrets dans .env.local et dans les "secrets" GitHub.

## Ta méthode
1. Commence par un plan court en étapes. Attends mon OK.
2. Une étape à la fois. Pour chaque étape : ce que tu fais, pourquoi,
   comment je vérifie que ça marche.
3. Donne-moi les commandes à taper une par une.
4. Teste chaque étape (tests + vérification dans le navigateur).
5. Utilise les skills utiles : /superpowers:brainstorming pour cadrer,
   /frontend-design pour l'interface, /design:ux-copy pour les textes,
   /design:accessibility-review, /engineering:testing-strategy,
   /security-review avant chaque mise en ligne,
   /engineering:deploy-checklist avant de publier.

Premier travail : vérifie les docs des APIs, liste les clés à créer et
où les créer, puis propose le plan du MVP.
```

---

## 3. Les skills et outils à ajouter

Un skill, c'est une fiche de méthode que Claude suit pour une tâche. Un MCP, c'est un outil branché à Claude (un accès à une doc, un navigateur, une base).

### Déjà dans ton app (rien à installer)

| Skill | Quand l'utiliser |
|---|---|
| `/frontend-design` | Dessiner une interface propre |
| `/design:ux-copy` | Écrire les textes des boutons, messages |
| `/design:accessibility-review` | Vérifier que le site est lisible par tous |
| `/engineering:system-design` | Organiser la base et les APIs |
| `/engineering:testing-strategy` | Savoir quoi tester |
| `/code-review` | Relire le code avant de valider |
| `/security-review` | Chercher les failles avant la mise en ligne |
| `/engineering:deploy-checklist` | Liste à cocher avant de publier |
| `/prompt-fixer` | Améliorer une demande floue |

### À ajouter (communautaires et officiels)

Ces commandes se tapent dans un terminal où tu as lancé `claude`.
Un plugin communautaire, c'est du code écrit par d'autres : regarde sa page GitHub avant de l'installer.

Superpowers (communautaire, très utilisé) : cadrer une idée, écrire un plan, coder avec des tests.

```bash
/plugin marketplace add obra/superpowers-marketplace
```

```bash
/plugin install superpowers@superpowers-marketplace
```

Skills officiels Anthropic, dont `webapp-testing` (tester le site dans un vrai navigateur) :

```bash
/plugin marketplace add anthropics/skills
```

Context7 (MCP) : donne à Claude la doc à jour de Next.js, Supabase, etc. Évite le code périmé.

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

Playwright (MCP de Microsoft) : Claude ouvre ton site et clique dedans pour tester.

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Supabase (MCP officiel), en lecture seule pour rester prudent :

```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?read_only=true"
```

GitHub : le plugin est déjà là, mais il faut l'autoriser une fois avec `/mcp` dans un terminal `claude`.

---

## 4. Ce qui est gratuit (et les pièges)

| Brique | Outil | Piège à connaître |
|---|---|---|
| Code | GitHub | Aucun |
| Site en ligne | Cloudflare Pages | Aucun pour un petit site |
| Site en ligne (option) | Vercel Hobby | Interdit l'usage commercial |
| Base de données | Supabase | Se met en pause après 7 jours sans visite. Le script horaire la garde éveillée |
| Tâche toutes les heures | GitHub Actions | Gratuit sans limite sur un dépôt public, quota mensuel sur un dépôt privé |
| Emails | Resend | Environ 100 mails par jour |
| Trajets | OpenRouteService | Quota par jour, mettre les résultats en cache |
| Offres | La Bonne Alternance, France Travail | Inscription et clé requises |

Les quotas changent. Claude doit les revérifier au début (c'est dans le prompt).

---

## 5. Petit lexique

- API : une porte qu'un site ouvre pour que ton code lui demande des données.
- Clé API : ton badge pour passer cette porte. Secret, jamais dans le code.
- Base de données : le grand tableau où le site range les offres.
- Cron : une tâche qui se lance seule à heure fixe.
- Isochrone : la zone qu'on atteint en X minutes depuis un point.
- GTFS : le format des horaires et arrêts de bus, tram et train.
- MVP : la première version, petite mais utile.
- Scraper : copier un site automatiquement. Interdit sur beaucoup de sites.
- RGPD : la loi européenne sur les données perso.
