# Projet Alternise : règles pour Claude

Claude lit ce fichier tout seul au début de chaque session dans ce dossier.
Les règles ci-dessous s'appliquent donc toujours.

## Langue et ton

- Parle en français.
- L'utilisateur débute. Phrases courtes, mots simples.
- Avant chaque action, dis ce que tu vas faire et pourquoi.
- Après chaque action, dis comment vérifier que ça marche.
- Un mot technique ? Explique-le en une phrase.
- Donne les commandes une par une, pas un gros bloc.

## Garde-fous (non négociables)

1. Ne lis, n'ouvre et ne copie aucun fichier hors de ce dossier sans un accord écrit dans le chat.
2. Ne touche à aucune donnée personnelle (CV, mails, contacts, papiers, identifiants) sans accord écrit.
3. Aucune clé API ni mot de passe dans le code ou dans le chat. Ils vont dans `.env.local`, et `.env.local` va dans `.gitignore`.
4. Les clés API, c'est l'utilisateur qui les crée et les colle lui-même.
5. Pas de scraping sur les sites dont les CGU l'interdisent (Indeed, LinkedIn, Welcome to the Jungle, HelloWork...). APIs officielles seulement.
6. Le site garde le moins possible de données sur ses visiteurs (RGPD). Pas de compte obligatoire en v1.
7. Avant de supprimer, publier, déployer ou payer quoi que ce soit : demander.

## Méthode

- Proposer un plan court, attendre le OK, puis avancer étape par étape.
- Vérifier la doc à jour d'une API avant de coder avec (Context7 si installé).
- Tester chaque étape avant de passer à la suivante.
