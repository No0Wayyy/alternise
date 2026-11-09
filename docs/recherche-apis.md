# Recherche des APIs (vérifiée le 9 novembre 2026)

Légende : ✅ vérifié sur la doc officielle · ⚠️ à confirmer (doc non lisible sans compte, ou de mémoire)

## 1. La Bonne Alternance (API Apprentissage) — source principale

- Inscription : https://api.apprentissage.beta.gouv.fr/fr/compte/profil ✅
  Gratuite, ouverte à tous, par simple e-mail. Pas de SIRET demandé. ✅
- Authentification : `Authorization: Bearer <jeton>` ✅ (schéma OpenAPI du dépôt GitHub mission-apprentissage/api-apprentissage)
- Recherche : `GET /job/v1/search` ✅
  Paramètres : `latitude`, `longitude`, `radius`, `romes`, `rncp`, `target_diploma_level`, `departements`, `opco`, `partners_to_exclude`, `page_size`, `page_index`.
  Autres routes utiles : `/job/v1/offer/{id}`, `/job/v1/export` (export complet).
- Résultats (3 familles) ✅ :
  - `offres_emploi_lba` : offres déposées sur La Bonne Alternance (~25 000)
  - `offres_emploi_partenaires` : France Travail, Météojobs, etc. (~325 000)
  - `recruteurs_lba` : entreprises qui recrutent souvent en alternance (~400 000) → candidatures spontanées
- Mise à jour des données : quotidienne. ✅
- Limites de débit : non publiées. ⚠️
- CGU ✅ : usage **non lucratif** uniquement ; jeton secret ; ne pas revendre ni transmettre les données.

## 2. France Travail — Offres d'emploi v2

- Accès ✅ : créer un compte sur https://francetravail.io, créer une « application », y ajouter l'API « Offres d'emploi ». On reçoit un identifiant client + une clé secrète. Accès libre et gratuit.
- La doc technique demande d'être connecté : détails ci-dessous ⚠️ (à confirmer une fois le compte créé).
  - Jeton OAuth2 : `POST https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire`, `grant_type=client_credentials`, scope `api_offresdemploiv2 o2dsoffre`
  - Recherche : `GET https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search`
  - Filtre alternance : `natureContrat=E2` (apprentissage) et `FS` (professionnalisation)
  - Pagination : `range=0-149` (150 max par appel)
  - Débit : environ 10 appels / seconde
- Remarque : La Bonne Alternance reprend déjà les offres France Travail. On garde France Travail pour avoir les offres plus vite et en direct, puis on fusionne les doublons.

## 3. Adzuna

- Inscription : https://developer.adzuna.com/signup — clé gratuite immédiate (`app_id` + `app_key`). ✅
- Recherche : `GET https://api.adzuna.com/v1/api/jobs/fr/search/{page}` ✅ (pays `fr` à tester)
- Pas de filtre « alternance » : recherche par mot-clé (`what=alternance`). ✅
- Palier gratuit « pour évaluer l'API » ; quotas visibles dans le compte. ⚠️
- CGU ✅ : afficher « Adzuna » (au moins 116×23 px) avec un lien vers adzuna.fr sur chaque offre. Usage commercial = licence payante.

## 4. Jooble

- Clé via formulaire : https://fr.jooble.org/api/about (une clé par pays). ✅
- **500 requêtes au total, pour toute la vie de la clé.** ✅
  → Inutilisable pour une collecte toutes les heures (720 appels/mois). À laisser de côté en v1.

## 5. Géocodage (Géoplateforme IGN)

- `https://data.geopf.fr/geocodage/search` et `/reverse`. Sans clé. 50 requêtes/s par IP. ✅
- L'ancienne URL api-adresse.data.gouv.fr est annoncée comme arrêtée : ne pas l'utiliser. ✅

## 6. OpenRouteService

- Clé gratuite (plan « Standard ») sur https://account.heigit.org ✅
- 500 isochrones par jour ✅ ; 5 points max par requête ; à pied jusqu'à 20 h, vélo 5 h, voiture 1 h ; 120 km max. ✅
- Conséquence : on calcule **une** isochrone autour de l'adresse de l'étudiant (pas une par offre), puis la base filtre les offres dedans.

## 7. Transports en commun

- Fichier national des arrêts : https://transport.data.gouv.fr/datasets/arrets-de-transport-en-france (CSV, sans clé). ✅
  Expérimental, doublons possibles, dernière mise à jour 13/01/2026.
- Gares SNCF : https://ressources.data.sncf.com/explore/dataset/gares-de-voyageurs/ ✅
- Navitia : site inaccessible, aucun plan gratuit trouvé. ⚠️ → pas en v1.

## 8. Carte

- OpenFreeMap : gratuit, sans clé, sans limite, usage commercial permis. Attribution automatique avec MapLibre. ✅
  Style : `https://tiles.openfreemap.org/styles/liberty`

## 9. Paliers gratuits des hébergeurs ✅

- Supabase : 500 Mo de base par projet ; projet mis en pause après 1 semaine sans activité (la collecte horaire l'évite).
- Vercel Hobby : usage personnel et **non commercial** uniquement.
- GitHub Actions : gratuit et illimité sur un dépôt **public** ; environ 2 000 min/mois sur un dépôt privé.
  Sur un dépôt public, les tâches planifiées s'arrêtent après 60 jours sans activité du dépôt. ⚠️
