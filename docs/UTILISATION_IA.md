# Utilisation de l'intelligence artificielle dans NEXUS ANALYTICS

> Ce document distingue ce qui a **réellement** été fait par l'IA de ce qui doit être **complété par le développeur**.
> Les sections marquées ✍️ sont des emplacements à remplir : aucune conversation ni aucun résultat n'y a été inventé.

## Lien vers la conversation

✍️ **Lien de la conversation IA utilisée pendant le développement :** `[à compléter]`

Outil utilisé pour la première version : Claude (modèle Claude Opus 5.5), via Claude Code dans l'application de bureau Claude, avec accès à un dossier de travail, un terminal et un navigateur intégré.

## 1. Tâches pour lesquelles l'IA a été utilisée

Lors de la session initiale, l'IA a, à partir d'un prompt unique (section 2) :

- conçu l'architecture (backend Express + frontend React/Vite, dossier `shared/` commun) ;
- écrit l'ensemble du code initial : backend, client Riot, cache, limiteur de débit, mode démo, moteur d'analyse, interface, graphiques, comparateur, pages méthode et éthique ;
- écrit 25 tests unitaires (Vitest) et les a exécutés (tous passent) ;
- vérifié le typage (`tsc --noEmit`) et le build de production ;
- lancé l'application et testé dans le navigateur intégré : validation du format Riot ID, page profil complète, comparateur, affichage mobile (absence de défilement horizontal) ;
- testé le backend avec une **fausse** clé API pour vérifier qu'un vrai appel à Riot renvoyant 401 est correctement traduit (aucune clé réelle n'a été utilisée) ;
- vérifié la palette des graphiques avec un script de validation (contraste et séparation des couleurs pour les daltonismes) ;
- rédigé le `README.md` et ce document.

## 2. Prompts utilisés

### Prompt initial (réel)

Le prompt fourni à l'IA est le cahier des charges complet « PROJET : NEXUS ANALYTICS — League of Legends Tracker » (12 sections : objectif, design, accueil, profil, 4 règles métier, comparateur, visualisation, intégration API Riot, technologies, charte éthique, documentation, priorités). Il est à joindre en annexe tel quel.

✍️ Annexe — texte intégral du prompt initial : `[coller ici le prompt exact]`

### Prompts suivants

✍️ `[Ajouter ici, dans l'ordre, les prompts de suivi réellement envoyés (corrections, ajouts, questions), avec la date.]`

## 3. Décisions techniques proposées par l'IA

| Sujet | Proposition de l'IA | Justification donnée |
|---|---|---|
| Architecture | Express (TypeScript via `tsx`) + Vite/React dans un seul dépôt, proxy `/api` en développement | Simple pour un projet étudiant ; la clé reste côté serveur |
| Calcul des règles | Fonctions pures dans `shared/analysis/`, exécutées dans le navigateur | Testables, réutilisables par le profil et le comparateur, aucun appel API supplémentaire |
| KDA moyen | KDA agrégé `(ΣK + ΣA) / ΣD` plutôt que moyenne des KDA par partie | Évite qu'une partie sans mort fausse la moyenne |
| KDA à 0 mort | Valeur `K + A` marquée « Parfait » | Pas de division par zéro ni de valeur infinie |
| Remakes | Exclus des analyses (durée < 5 min ou abandon anticipé) | Ces parties ne reflètent pas la performance |
| Dynamique | Score à signaux : winrate ±20 pts, KDA ±20 %, série ≥ 3 (±0,5) | Seuils explicites et documentés ; ±20 pts = une victoire d'écart sur 5 |
| Classement de LEAGUE-V4 | Endpoint `entries/by-puuid` | Évite l'identifiant d'invocateur, retiré des réponses récentes de SUMMONER-V4 |
| Débit | Limiteur à fenêtres glissantes par hôte (18/1 s et 95/2 min par défaut), pause sur `Retry-After`, 1 nouvel essai | Respect des limites d'une clé de développement |
| Cache | Mémoire, TTL par type de donnée (parties : 12 h, rangs : 5 min…) + profil agrégé 2 min | Les parties sont immuables ; les rangs évoluent |
| Mode démo | Données fictives déterministes, triple signalement (bandeau, badge de navigation, badge de profil) | Exigence « aucune confusion avec des données réelles » |
| Couleurs des graphiques | Cyan `#0ea5b7` / violet `#8b5cf6` (joueurs), vert `#10a37f` / rouge `#e5484d` (victoire / défaite) | Validées pour le contraste et la distinction en cas de daltonisme ; libellés toujours présents |
| Variable de port | `API_PORT` plutôt que `PORT` | Voir section 5 |

## 4. Décisions finalement retenues par le développeur

✍️ `[Pour chaque proposition ci-dessus : retenue / modifiée / rejetée, et pourquoi. Exemple de format : « Seuil de la dynamique — modifié : 2 victoires d'écart au lieu d'une, car … »]`

## 5. Modifications et corrections

### Corrections faites par l'IA pendant la session (constatées lors de ses propres tests)

- **Conflit de port** : l'outil de prévisualisation définissait `PORT=5173`, que le backend reprenait, ce qui l'empêchait de recevoir les requêtes `/api`. La variable a été renommée `API_PORT`.
- **Page profil vide** : une légende Recharts personnalisée utilisait l'icône `plainline`, qui provoquait une erreur JavaScript à l'affichage. Correction de l'icône, et ajout d'un composant `ErrorBoundary` autour de chaque carte pour qu'une erreur d'affichage ne vide plus la page entière.
- **Mise en page** : le panneau des 4 règles, trop serré sur 4 colonnes, est passé en grille 2 × 2.

### Modifications et corrections manuelles du développeur

✍️ `[Lister les modifications faites à la main après la génération : fichiers, raison, avant/après.]`

## 6. Limites des réponses de l'IA

Constatées pendant la session :

- **Aucun test avec des données réelles** : aucune clé Riot valide n'était disponible. Le chemin réseau et la gestion du 401 ont été vérifiés, mais pas l'analyse d'une vraie réponse MATCH-V5. Les formes de réponse utilisées viennent de la documentation Riot telle que l'IA la connaît : **à vérifier** avec une vraie clé (notamment LEAGUE-V4 `by-puuid` et les champs de MATCH-V5).
- **Erreurs non détectées à l'écriture** : le bug de légende et le conflit de port n'ont été trouvés qu'en lançant l'application, pas pendant la génération du code.
- **Seuils arbitraires** : les seuils de la règle 4 (20 pts, 20 %, séries de 3) sont un choix raisonné mais non validé statistiquement.
- **Données de démo** : générées aléatoirement, elles peuvent produire des combinaisons peu réalistes (ex. rang bas et winrate de saison élevé).
- **Connaissances datées** : les identifiants de files (`queueId`) et certains endpoints Riot évoluent ; la liste de `shared/queues.ts` peut être incomplète.

✍️ `[Ajouter les limites constatées par le développeur.]`

## 7. Réflexion sur la complémentarité humain / IA

✍️ `[Réflexion personnelle du développeur. Pistes : ce que l'IA a accéléré (structure, code répétitif, documentation), ce qui a demandé un jugement humain (choix des seuils, vérification avec des données réelles, conformité aux politiques Riot, lecture critique du code), ce qui a été appris, et ce que vous feriez différemment.]`
