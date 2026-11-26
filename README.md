# NEXUS ANALYTICS — League of Legends Tracker

> Outil d'analyse et de suivi des performances des joueurs de League of Legends, alimenté par les API officielles de Riot Games.

---

## 1. Présentation du projet

NEXUS ANALYTICS permet de rechercher un joueur grâce à son **Riot ID** (`Pseudo#TAG`) et sa région, de consulter ses statistiques (rangs, historique, champions, maîtrise), d'obtenir une **analyse automatique** de ses performances via un moteur de 4 règles métier, et de **comparer deux joueurs**.

Le projet s'inspire des sites de statistiques gaming, avec une identité visuelle originale (thème sombre noir / bleu nuit / violet / cyan) et une orientation centrée sur l'**aide à la progression** plutôt que sur le simple affichage de chiffres.

## 2. Objectifs

- Fournir un **MVP réellement fonctionnel** exploitant des données réelles (pas une maquette).
- Proposer des analyses **fiables, reproductibles et prudentes** (jamais de conclusion sur des données insuffisantes).
- Garantir la **sécurité** de la clé API (jamais exposée au navigateur).
- Respecter les **limites de débit** et les politiques développeur de Riot Games.
- Offrir une interface claire, responsive et utilisable au quotidien.

## 3. Fonctionnalités

| Page | Contenu |
|---|---|
| **Accueil** | Logo, navigation, recherche centrale (Riot ID + sélecteur de 15 régions), validation du format, recherches récentes (stockées localement), présentation des fonctionnalités et des analyses. |
| **Profil** | Riot ID, icône, niveau, région ; rangs Solo/Duo et Flex ; victoires, défaites, winrate, KDA moyen, parties analysées ; moteur d'analyse (4 règles) ; 4 graphiques ; tableau par champion ; maîtrise ; historique filtrable par file (mode, champion, résultat, K/D/A, durée, date). |
| **Comparateur** | Deux Riot ID (régions indépendantes) ; tableau comparatif (rang, parties, winrates, KDA, forme récente, dynamique) ; graphiques comparatifs ; champions les plus joués ; avertissement explicite sur les écarts de volume de parties. |
| **Méthode d'analyse** | Formules et seuils de chaque règle. |
| **Éthique & transparence** | Charte éthique + mention légale Riot Games (aussi présente en pied de chaque page). |

Gestion des erreurs côté interface : joueur introuvable, Riot ID existant mais sans compte LoL sur la région, format invalide, clé invalide (401) ou expirée (403), limite de requêtes (429, avec délai), erreurs de l'API Riot (5xx) et problèmes de connexion au serveur.

**Mode démonstration** : si `RIOT_API_KEY` n'est pas définie, le serveur génère des profils **fictifs** (déterministes) ; un bandeau permanent, un badge « Mode démo » dans la barre de navigation et un badge « DONNÉES FICTIVES » sur chaque profil empêchent toute confusion avec des données réelles.

## 4. Technologies utilisées

| Domaine | Choix |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, React Router 6 |
| Style | Tailwind CSS 4 (thème personnalisé), polices Space Grotesk / Inter / JetBrains Mono |
| Graphiques | Recharts 2 (palette vérifiée : contraste ≥ 3:1 et séparation pour les daltonismes) |
| Icônes | lucide-react |
| Backend | Node.js 20+ / Express 4, exécuté avec `tsx` (TypeScript sans étape de compilation) |
| Tests | Vitest (règles d'analyse, client Riot, limiteur, routage) |

## 5. Architecture technique

```
nexus-analytics/
├── server/                 # Backend sécurisé (seul détenteur de la clé)
│   ├── index.ts            # Routes Express /api, gestion centralisée des erreurs, service du build
│   ├── config.ts           # Lecture des variables d'environnement
│   ├── riotClient.ts       # Appels Riot : cache, déduplication, limiteur, erreurs 401/403/404/429/5xx
│   ├── rateLimiter.ts      # Limiteur à fenêtres glissantes multiples, par hôte de routage
│   ├── cache.ts            # Cache mémoire TTL + éviction LRU
│   ├── routing.ts          # Serveur (euw1…) -> cluster régional (europe…)
│   ├── profileService.ts   # Orchestration des 5 API + normalisation des données
│   ├── ddragon.ts          # Data Dragon (noms et icônes de champions)
│   ├── demo.ts             # Données fictives du mode démo
│   └── errors.ts
├── shared/                 # Code commun (sans dépendance)
│   ├── types.ts            # Modèle de données normalisé, régions
│   ├── riotId.ts           # Validation Pseudo#TAG
│   ├── queues.ts           # Libellés des files de jeu
│   └── analysis/
│       ├── stats.ts        # Calculs statistiques purs (winrate, KDA, séries chronologiques)
│       ├── rules.ts        # MOTEUR D'ANALYSE : les 4 règles métier
│       └── rank.ts         # Ordre et libellés des rangs
├── src/                    # Interface utilisateur
│   ├── lib/                # api.ts (appels /api), hooks.ts, format.ts
│   ├── components/         # Layout, SearchForm, ui, charts, profile, ErrorBoundary
│   └── pages/              # Home, Profile, Compare, Info (méthode, éthique, 404)
├── tests/                  # Tests unitaires Vitest
└── docs/UTILISATION_IA.md  # Documentation de l'usage de l'IA
```

Séparation des responsabilités :

- **Interface** : `src/components`, `src/pages`
- **Appels API** : `server/riotClient.ts`, `server/profileService.ts` (serveur) et `src/lib/api.ts` (client → `/api` uniquement)
- **Calculs statistiques** : `shared/analysis/stats.ts`
- **Règles d'analyse** : `shared/analysis/rules.ts`
- **Gestion des erreurs** : `server/errors.ts` + gestionnaire Express, `ApiError` et `ErrorState` côté client, `ErrorBoundary` pour l'affichage

Flux d'une recherche : `Navigateur → GET /api/profile/:region/:pseudo/:tag → Express → (cache ?) → limiteur → API Riot → normalisation → JSON → calcul des 4 règles dans le navigateur → affichage`.

Les règles d'analyse sont exécutées côté client à partir des données normalisées : elles sont pures, testées, et ne nécessitent aucun appel supplémentaire.

## 6. Installation du projet

Prérequis : **Node.js 20 ou plus récent** et npm.

```bash
npm install
# créer un fichier .env à la racine et y mettre RIOT_API_KEY (voir §7)
npm run dev                 # backend sur :3001 + frontend sur http://localhost:5173
```

Autres commandes :

```bash
npm test                    # tests unitaires
npm run build               # vérification TypeScript + build du frontend dans dist/
npm start                   # mode production : Express sert l'API et dist/ sur :3001
```

Sans clé, l'application démarre en **mode démonstration**.

## 7. Configuration de la clé API Riot

1. Se connecter sur <https://developer.riotgames.com> avec un compte Riot.
2. Copier la **Development API Key** affichée sur le tableau de bord (elle **expire toutes les 24 h** ; pour un usage durable, demander une *Personal* ou *Production* key).
3. La placer dans le fichier `.env` à la racine (jamais commité, il est dans `.gitignore`) :

```env
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
API_PORT=3001
MATCH_COUNT=20
# Derrière un hébergeur (Render, Railway…) : 1. En local : 0.
TRUST_PROXY=0
# Optionnel : limites de la clé, format "max:secondes,..." (défaut adapté à une clé de dev)
# RIOT_RATE_LIMITS=18:1,95:120
```

4. Redémarrer `npm run dev`. Le badge de la barre de navigation passe de « Mode démo » à « API Riot connectée ».

Sécurité :

- la clé n'est lue que par `server/config.ts` et envoyée uniquement dans l'en-tête `X-Riot-Token` vers `*.api.riotgames.com` ;
- le navigateur n'appelle que `/api/...` : la clé n'apparaît ni dans le bundle, ni dans les réponses, ni dans les journaux ;
- les erreurs renvoyées au client sont génériques (aucun détail interne) ;
- une limite de 30 recherches par minute et par IP protège le quota de la clé (table nettoyée chaque minute, plafonnée à 10 000 IP) ;
- en-têtes de sécurité sur toutes les réponses (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`), plus une `Content-Security-Policy` stricte et HSTS en production (scripts limités au site lui-même, images limitées à Data Dragon, aucun script inline) ;
- validation des entrées : région sur liste blanche (empêche d'appeler un autre hôte que `*.api.riotgames.com`), pseudo et tag filtrés (caractères de contrôle, `/ \ # ? % < > " '` refusés), paramètres encodés avant l'appel à Riot ;
- interface React : tout texte venant de l'API est échappé (aucun `dangerouslySetInnerHTML`) ;
- dépendances auditées : `npm audit --omit=dev` ne signale aucune vulnérabilité (Express 4.22.3, React Router 7.18.7) ;
- déploiement derrière un hébergeur : définir `TRUST_PROXY=1` pour que la limite par IP utilise la vraie adresse des visiteurs.

## 8. Explication des endpoints utilisés

### API Riot Games

| API | Endpoint | Hôte | Usage | Cache |
|---|---|---|---|---|
| ACCOUNT-V1 | `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | régional (`europe`, `americas`, `asia`) | Riot ID → PUUID | 30 min |
| SUMMONER-V4 | `/lol/summoner/v4/summoners/by-puuid/{puuid}` | serveur (`euw1`…) | icône, niveau | 10 min |
| LEAGUE-V4 | `/lol/league/v4/entries/by-puuid/{puuid}` | serveur | rangs Solo/Duo et Flex | 5 min |
| CHAMPION-MASTERY-V4 | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top?count=10` | serveur | maîtrise | 15 min |
| MATCH-V5 | `/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=20` | régional (`europe`, `americas`, `asia`, `sea`) | identifiants des parties | 2 min |
| MATCH-V5 | `/lol/match/v5/matches/{matchId}` | régional | détail d'une partie (immuable) | 12 h |

Routage : `euw1, eun1, tr1, ru, me1 → europe` · `na1, br1, la1, la2 → americas` · `kr, jp1 → asia` · `oc1, sg2, tw2, vn2 → sea` (Account-V1 n'étant pas servi par `sea`, ces serveurs passent par `asia`). Exemple EUW : Account-V1 et Match-V5 sur `europe.api.riotgames.com`, les autres sur `euw1.api.riotgames.com`.

Data Dragon (CDN public, sans clé) : `versions.json` et `champion.json` pour les noms et icônes.

Un profil complet coûte environ **25 requêtes** (1 + 4 + 20 parties) lors de la première recherche, puis beaucoup moins grâce au cache (les détails de parties sont réutilisés).

### API interne NEXUS

| Route | Réponse |
|---|---|
| `GET /api/status` | `{ configured, mode: "live" \| "demo", matchCount }` |
| `GET /api/profile/:region/:gameName/:tagLine` | `PlayerProfile` normalisé (voir `shared/types.ts`) |

Codes d'erreur : `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `429 RATE_LIMITED` (+ en-tête `Retry-After`), `502 UPSTREAM_ERROR`, `504 NETWORK_ERROR`.

Gestion du 429 Riot : le limiteur de l'hôte est mis en pause pendant `Retry-After` ; si ce délai est ≤ 10 s, la requête est rejouée une fois, sinon l'erreur est renvoyée avec le délai. Les erreurs 5xx et réseau sont rejouées une fois.

## 9. Description détaillée des 4 règles d'analyse

Toutes les règles sont dans `shared/analysis/rules.ts`, avec des seuils centralisés (`THRESHOLDS`). Les **remakes** (durée < 5 min ou abandon anticipé) sont exclus de tous les calculs.

### Règle 1 — Analyse du winrate

`Winrate = (victoires / parties) × 100`

| Winrate | Interprétation |
|---|---|
| > 55 % | Tendance positive |
| 45 % – 55 % (bornes incluses) | Résultats relativement équilibrés |
| < 45 % | Tendance négative |

Si aucune partie n'est exploitable, le winrate vaut `null` (aucune valeur inventée). Sous 10 parties, la mention « échantillon réduit » est ajoutée. Le texte précise systématiquement que le seuil ne mesure pas le niveau réel du joueur.

### Règle 2 — Analyse des champions

Pour chaque champion : parties, victoires, défaites, winrate, moyennes K/D/A et KDA agrégé. Les champions sont triés par nombre de parties (« les plus joués »).

Un champion n'est déclaré **fiable** qu'à partir de **5 parties** ; seuls les champions fiables apparaissent dans « meilleurs résultats », triés par winrate puis KDA. Si aucun champion n'atteint 5 parties, un message l'explique et aucune recommandation n'est faite.

### Règle 3 — Analyse du KDA

`KDA = (Kills + Assists) / Deaths`

- Si `Deaths = 0` : pas de division ; le KDA est marqué **« Parfait »** et vaut `Kills + Assists` pour les comparaisons et graphiques (aucune erreur, aucune valeur infinie).
- Le KDA moyen d'un ensemble de parties est un **KDA agrégé** `(ΣK + ΣA) / ΣD`, plus robuste qu'une moyenne de ratios (une partie à 0 mort ne fait pas exploser la moyenne).

| KDA | Interprétation (indicative) |
|---|---|
| ≥ 4 | Très bon ratio |
| 2 – 4 | Ratio intermédiaire |
| < 2 | Ratio à améliorer |

Mise en garde affichée : le KDA seul ne détermine pas la qualité d'une partie.

### Règle 4 — Analyse de la dynamique

Les parties exploitables sont triées de la plus récente à la plus ancienne ; les **5 dernières** sont comparées aux **5 précédentes**. Il faut donc au moins **10 parties exploitables** ; sinon, un message « données insuffisantes » est affiché et **aucune conclusion n'est produite**.

Calculs : winrate et KDA agrégé de chaque bloc, écart de winrate (points), écart absolu et relatif de KDA, série en cours, plus longues séries de victoires et de défaites.

Score :

| Signal | Effet |
|---|---|
| Écart de winrate ≥ +20 pts / ≤ −20 pts (≥ 1 victoire d'écart sur 5) | +1 / −1 |
| Variation relative du KDA ≥ +20 % / ≤ −20 % | +1 / −1 |
| Série en cours ≥ 3 victoires / ≥ 3 défaites | +0,5 / −0,5 |

Conclusion : score ≥ 1 → **Progression positive** · score ≤ −1 → **Baisse des performances** · sinon → **Situation stable**. Chaque signal retenu est affiché en clair, avec un rappel que la comparaison porte sur deux petits échantillons.

### Tests

`npm test` exécute 25 tests couvrant : formules, bornes des seuils, KDA à 0 mort, exclusion des remakes, seuil de 5 parties par champion, refus de conclure sous 10 parties, les trois conclusions de dynamique, séries, ordre des rangs, traduction des erreurs HTTP 401/403/404/429, cache, en-tête de clé, limiteur et routage régional.

## 10. Limites techniques et pistes d'amélioration

**Limites**

- **Clé de développement** : expire toutes les 24 h et limite à 20 req/s et 100 req/2 min. La première recherche d'un profil (~25 requêtes) prend quelques secondes ; au-delà d'environ 4 nouveaux profils en 2 minutes, l'utilisateur reçoit une erreur 429 explicite.
- **Échantillon** : 20 parties par défaut, toutes files confondues (classées, normales, ARAM…). Les statistiques mélangent donc des contextes différents.
- **Cache en mémoire** : perdu au redémarrage et non partagé entre plusieurs instances.
- **Indicateurs limités** : winrate et KDA ne reflètent ni le rôle, ni la vision, ni l'impact sur les objectifs.
- **Mode démo** : données fictives, utiles pour présenter l'interface uniquement.
- Le projet n'a pas été vérifié avec une clé Riot valide pendant le développement assisté par IA (voir `docs/UTILISATION_IA.md`) : le chemin réel (appel aux serveurs Riot et traduction d'une réponse 401) a été vérifié, mais pas une réponse complète avec des données réelles.

**Pistes d'amélioration**

- Filtre par file (Solo/Duo uniquement) appliqué aux analyses, et pagination de l'historique (« charger plus »).
- Cache persistant (Redis / SQLite) et file d'attente partagée des requêtes.
- Indicateurs supplémentaires : CS/min, vision/min, part des dégâts, performance par rôle.
- Comparaison des seuils au rang du joueur (moyennes par palier).
- Tests de bout en bout (Playwright) et tests de composants.
- Demande d'une clé *Personal/Production* pour un déploiement public.

---

**Mention légale** — NEXUS ANALYTICS isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
