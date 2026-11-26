import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Activity, Ban, Crosshair, Database, FileWarning, KeyRound, Scale, Scroll, ShieldCheck, Swords, TrendingUp, UserX } from "lucide-react";
import { THRESHOLDS } from "../../shared/analysis/rules";
import { RIOT_DISCLAIMER } from "../components/Layout";

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 max-w-3xl text-ink-2">{intro}</p>
      <div className="mt-8 space-y-5">{children}</div>
    </div>
  );
}

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card flex gap-4 p-5 animate-fade-up">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-nexus-cyan/10 text-nexus-cyan">{icon}</div>
      <div>
        <h2 className="font-display font-semibold">{title}</h2>
        <div className="mt-1 space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  );
}

export function Ethics() {
  return (
    <Page
      title="Charte éthique & transparence"
      intro="NEXUS ANALYTICS est un outil d'aide à la progression. Voici les engagements qui encadrent la collecte, le traitement et la présentation des données."
    >
      <Item icon={<Database className="h-5 w-5" />} title="Des données issues des API officielles">
        <p>Toutes les statistiques proviennent des API officielles de Riot Games (ACCOUNT-V1, SUMMONER-V4, LEAGUE-V4, MATCH-V5, CHAMPION-MASTERY-V4) et du CDN public Data Dragon pour les icônes.</p>
      </Item>
      <Item icon={<UserX className="h-5 w-5" />} title="Pas de collecte inutile de données personnelles">
        <p>Aucun compte utilisateur, aucun traceur publicitaire, aucune base de données de joueurs. Les réponses de l'API sont gardées en mémoire vive sur le serveur, pour une durée limitée (de 2 minutes à 12 heures selon le type de donnée), uniquement pour réduire le nombre d'appels.</p>
        <p>Les recherches récentes sont stockées uniquement dans votre navigateur (localStorage) et peuvent être effacées depuis l'accueil.</p>
      </Item>
      <Item icon={<KeyRound className="h-5 w-5" />} title="Une clé API protégée">
        <p>La clé Riot est lue depuis la variable d'environnement <code className="num text-xs">RIOT_API_KEY</code> du serveur. Elle n'apparaît jamais dans le code source, ni dans le navigateur : le frontend ne communique qu'avec le backend NEXUS.</p>
      </Item>
      <Item icon={<Scale className="h-5 w-5" />} title="Des analyses indicatives">
        <p>Les analyses décrivent des résultats sur un échantillon de parties : elles ne constituent pas une évaluation absolue du joueur. Un winrate ou un KDA dépend du rôle, des coéquipiers, des files de jeu et de nombreux facteurs non mesurés.</p>
        <p>Les recommandations ne sont jamais présentées comme des vérités : elles sont accompagnées du volume de parties sur lequel elles reposent.</p>
      </Item>
      <Item icon={<FileWarning className="h-5 w-5" />} title="Aucune donnée inventée">
        <p>Les résultats sont calculés uniquement à partir des données disponibles. Quand une donnée manque (joueur non classé, maîtrise indisponible, moins de 10 parties pour la dynamique, moins de 5 parties sur un champion), l'interface l'indique au lieu de la compléter.</p>
        <p>Sans clé API, un <strong>mode démonstration</strong> clairement signalé affiche des profils fictifs : ils ne sont jamais présentés comme des données réelles.</p>
      </Item>
      <Item icon={<Ban className="h-5 w-5" />} title="Respect des politiques de Riot Games">
        <p>Le projet respecte les conditions d'utilisation et les politiques développeur de Riot Games : limites de débit appliquées côté serveur, mise en cache, pas de revente de données, pas de classement dénigrant des joueurs, identité visuelle originale sans reprise des logos de Riot Games.</p>
      </Item>
      <Item icon={<Scroll className="h-5 w-5" />} title="Mention légale Riot Games">
        <p className="rounded-lg border border-line bg-night-900/70 p-3 text-xs italic">{RIOT_DISCLAIMER}</p>
        <p>Cette mention figure également en pied de chaque page.</p>
      </Item>
    </Page>
  );
}

export function Method() {
  const T = THRESHOLDS;
  return (
    <Page
      title="Méthode d'analyse"
      intro="Le moteur d'analyse applique automatiquement 4 règles aux parties récupérées via MATCH-V5. Les remakes (partie de moins de 5 minutes ou abandon anticipé) sont exclus de tous les calculs."
    >
      <Item icon={<Activity className="h-5 w-5" />} title="Règle 1 — Analyse du winrate">
        <p><code className="num">Winrate = (victoires / parties) × 100</code></p>
        <p>Au-dessus de {T.winrate.positive} % : tendance positive · entre {T.winrate.negative} % et {T.winrate.positive} % : résultats équilibrés · en dessous de {T.winrate.negative} % : tendance négative. Sous {T.smallSample} parties, un avertissement « échantillon réduit » est affiché. Ces seuils ne mesurent pas le niveau réel du joueur.</p>
      </Item>
      <Item icon={<Swords className="h-5 w-5" />} title="Règle 2 — Analyse des champions">
        <p>Pour chaque champion : nombre de parties, victoires, winrate, moyenne K/D/A et KDA agrégé. Les champions sont classés par volume de jeu.</p>
        <p>Un champion n'est considéré comme « tendance exploitable » qu'à partir de {T.champions.minGames} parties. Les meilleurs champions sont ensuite triés par winrate, puis par KDA. Aucun champion n'est mis en avant sur la base d'une seule partie.</p>
      </Item>
      <Item icon={<Crosshair className="h-5 w-5" />} title="Règle 3 — Analyse du KDA">
        <p><code className="num">KDA = (Kills + Assists) / Deaths</code>. Si Deaths = 0, la division n'est pas effectuée : le KDA est « parfait » et vaut Kills + Assists pour les comparaisons.</p>
        <p>Le KDA moyen est un KDA agrégé (ΣK + ΣA) / ΣD, plus robuste qu'une moyenne de ratios. ≥ {T.kda.excellent} : très bon ratio · {T.kda.intermediate} à {T.kda.excellent} : intermédiaire · &lt; {T.kda.intermediate} : à améliorer. Le KDA seul ne détermine pas la qualité d'une partie.</p>
      </Item>
      <Item icon={<TrendingUp className="h-5 w-5" />} title="Règle 4 — Analyse de la dynamique">
        <p>Les {T.dynamics.blockSize} dernières parties sont comparées aux {T.dynamics.blockSize} précédentes ({T.dynamics.blockSize * 2} parties exploitables minimum, sinon aucun verdict).</p>
        <p>Signaux : écart de winrate ≥ {T.dynamics.winrateDeltaPts} points (+1 / −1), variation relative du KDA ≥ {T.dynamics.kdaDeltaRatio * 100} % (+1 / −1), série en cours d'au moins {T.dynamics.streakMin} victoires ou défaites (+0,5 / −0,5). Score ≥ 1 : progression positive · score ≤ −1 : baisse des performances · sinon : situation stable.</p>
      </Item>
      <Item icon={<ShieldCheck className="h-5 w-5" />} title="Fiabilité">
        <p>Les règles sont des fonctions pures couvertes par des tests unitaires (<code className="num text-xs">npm test</code>). Voir aussi la <Link to="/ethique" className="text-nexus-cyan hover:underline">charte éthique</Link>.</p>
      </Item>
    </Page>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="num text-6xl font-bold text-gradient">404</div>
      <p className="mt-3 text-ink-2">Cette page n'existe pas.</p>
      <Link to="/" className="mt-6 inline-block text-nexus-cyan hover:underline">Retour à l'accueil</Link>
    </div>
  );
}
