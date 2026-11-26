import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, BarChart3, Search, Clock, Crosshair, GitCompareArrows, ShieldCheck, Swords, TrendingUp, X } from "lucide-react";
import { SearchForm } from "../components/SearchForm";
import { profilePath } from "../lib/api";
import { clearRecent, pushRecent, readRecent } from "../lib/hooks";
import { regionLabel } from "../../shared/types";

const FEATURES = [
  { icon: <Search className="h-5 w-5" />, title: "Recherche par Riot ID", text: "Saisissez Pseudo#TAG et la région : le profil est récupéré en direct depuis les API officielles de Riot Games." },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Statistiques détaillées", text: "Rangs Solo/Duo et Flex, victoires, défaites, KDA, historique des parties et maîtrise des champions." },
  { icon: <TrendingUp className="h-5 w-5" />, title: "Graphiques interactifs", text: "Évolution du winrate et du KDA, répartition victoires/défaites, champions les plus joués." },
  { icon: <GitCompareArrows className="h-5 w-5" />, title: "Comparateur de joueurs", text: "Confrontez deux profils sur le rang, le winrate, le KDA et la forme récente, avec les volumes de parties." },
];

const RULES = [
  { icon: <Activity className="h-5 w-5" />, n: 1, title: "Winrate", text: "Victoires / parties × 100. Au-dessus de 55 % : tendance positive ; 45–55 % : équilibré ; sous 45 % : tendance négative." },
  { icon: <Swords className="h-5 w-5" />, n: 2, title: "Champions", text: "Parties, winrate et KDA par champion. Aucune tendance n'est affichée en dessous de 5 parties sur un champion." },
  { icon: <Crosshair className="h-5 w-5" />, n: 3, title: "KDA", text: "(Kills + Assists) / Deaths, sans erreur à 0 mort. ≥ 4 très bon, 2–4 intermédiaire, < 2 à améliorer." },
  { icon: <TrendingUp className="h-5 w-5" />, n: 4, title: "Dynamique", text: "Les 5 dernières parties comparées aux 5 précédentes : winrate, KDA, séries. Pas de conclusion sans données suffisantes." },
];

export default function Home() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState(readRecent);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-night-900/70 px-3 py-1 text-xs text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-nexus-cyan" /> Analyse de performances · League of Legends
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Comprenez vos parties.<br />
            <span className="text-gradient">Progressez avec méthode.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-2 sm:text-lg">
            NEXUS ANALYTICS transforme votre historique de parties en indicateurs clairs et en analyses prudentes, calculés à partir des données officielles Riot Games.
          </p>
          <div className="mx-auto mt-9 max-w-3xl">
            <SearchForm
              onSearch={(region, id) => {
                pushRecent({ region, ...id });
                navigate(profilePath(region, id.gameName, id.tagLine));
              }}
            />
            <p className="mt-3 text-left text-xs text-ink-3">Format attendu : <span className="num text-ink-2">Pseudo#TAG</span> — par exemple <span className="num text-ink-2">Caps#EUW</span>.</p>
          </div>
          {recent.length > 0 && (
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-ink-3"><Clock className="h-3.5 w-3.5" /> Récents :</span>
              {recent.map((r) => (
                <Link key={`${r.region}${r.gameName}${r.tagLine}`} to={profilePath(r.region, r.gameName, r.tagLine)}
                  className="rounded-md border border-line bg-night-900/70 px-2.5 py-1 text-ink-2 hover:border-nexus-cyan/50 hover:text-ink">
                  {r.gameName}<span className="text-ink-3">#{r.tagLine}</span> <span className="text-ink-3">· {regionLabel(r.region)}</span>
                </Link>
              ))}
              <button onClick={() => { clearRecent(); setRecent([]); }} className="flex items-center gap-1 text-ink-3 hover:text-ink" aria-label="Effacer l'historique de recherche">
                <X className="h-3.5 w-3.5" /> Effacer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Fonctionnalités</h2>
        <p className="mt-1 text-sm text-ink-3">Un outil pensé pour un usage quotidien, entre deux parties.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-nexus-cyan/10 text-nexus-cyan">{f.icon}</div>
              <h3 className="mt-4 font-display font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ANALYSES */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="card overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-semibold">Les analyses proposées</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-2">
                Un moteur de 4 règles métier, appliquées automatiquement aux parties réellement récupérées. Les seuils sont indicatifs : ils décrivent des résultats, pas le niveau absolu d'un joueur.
              </p>
            </div>
            <Link to="/analyses" className="text-sm font-medium text-nexus-cyan hover:underline">Détail de la méthode →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {RULES.map((r) => (
              <div key={r.n} className="rounded-xl border border-line bg-night-900/60 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-nexus-violet/15 text-nexus-violet-soft">{r.icon}</span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Règle {r.n}</div>
                    <div className="font-display font-semibold">{r.title}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink-2">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-night-900/50 p-5 sm:flex-row sm:items-center">
          <ShieldCheck className="h-6 w-6 shrink-0 text-nexus-cyan" />
          <p className="flex-1 text-sm text-ink-2">
            Données issues exclusivement des API officielles Riot Games, clé API protégée côté serveur, aucune donnée inventée.
          </p>
          <Link to="/ethique" className="text-sm font-medium text-nexus-cyan hover:underline">Notre charte éthique →</Link>
        </div>
      </section>
    </div>
  );
}
