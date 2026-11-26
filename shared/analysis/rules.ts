// MOTEUR D'ANALYSE — les 4 règles métier de NEXUS ANALYTICS.
// Chaque règle renvoie un résultat structuré + un texte d'interprétation prudent.
// Aucune règle n'invente de conclusion : en cas de données insuffisantes, elle le dit.
import type { MatchSummary } from "../types";
import {
  aggregateKda, analyzableMatches, computeKda, computeWinrate, round, totals,
  type KdaValue,
} from "./stats";

// ------------------------------------------------------------------------------------------------
// Seuils (centralisés pour être documentés et ajustables)
// ------------------------------------------------------------------------------------------------
export const THRESHOLDS = {
  winrate: { positive: 55, negative: 45 },
  kda: { excellent: 4, intermediate: 2 },
  champions: { minGames: 5 },
  dynamics: {
    blockSize: 5,              // 5 dernières vs 5 précédentes
    winrateDeltaPts: 20,       // ≥ 20 points = au moins une victoire d'écart sur 5 parties
    kdaDeltaRatio: 0.2,        // variation relative du KDA ≥ 20 %
    streakMin: 3,              // série significative
  },
  smallSample: 10,             // en dessous : avertissement « échantillon réduit »
} as const;

// ------------------------------------------------------------------------------------------------
// RÈGLE 1 — Analyse du winrate
// ------------------------------------------------------------------------------------------------
export type WinrateTrend = "positive" | "balanced" | "negative";

export interface WinrateAnalysis {
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
  trend: WinrateTrend | null;
  smallSample: boolean;
  message: string;
}

export function classifyWinrate(winrate: number): WinrateTrend {
  if (winrate > THRESHOLDS.winrate.positive) return "positive";
  if (winrate < THRESHOLDS.winrate.negative) return "negative";
  return "balanced";
}

export function analyzeWinrate(matches: MatchSummary[]): WinrateAnalysis {
  const valid = analyzableMatches(matches);
  const t = totals(valid);
  const winrate = computeWinrate(t.wins, t.games);
  if (winrate === null) {
    return {
      games: 0, wins: 0, losses: 0, winrate: null, trend: null, smallSample: true,
      message: "Aucune partie exploitable : impossible de calculer un winrate.",
    };
  }
  const trend = classifyWinrate(winrate);
  const smallSample = t.games < THRESHOLDS.smallSample;
  const base = {
    positive: "Tendance positive sur les parties analysées.",
    balanced: "Résultats relativement équilibrés sur les parties analysées.",
    negative: "Tendance négative sur les parties analysées.",
  }[trend];
  return {
    games: t.games, wins: t.wins, losses: t.losses,
    winrate: round(winrate), trend, smallSample,
    message: `${base} Ce seuil est indicatif et ne mesure pas le niveau réel du joueur${
      smallSample ? ` (échantillon réduit : ${t.games} partie${t.games > 1 ? "s" : ""})` : ""
    }.`,
  };
}

// ------------------------------------------------------------------------------------------------
// RÈGLE 3 — Analyse du KDA (définie avant la règle 2, qui l'utilise)
// ------------------------------------------------------------------------------------------------
export type KdaTier = "excellent" | "intermediate" | "improve";

export interface KdaAnalysis {
  kda: KdaValue | null;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  tier: KdaTier | null;
  message: string;
  caveat: string;
}

export function classifyKda(value: number): KdaTier {
  if (value >= THRESHOLDS.kda.excellent) return "excellent";
  if (value >= THRESHOLDS.kda.intermediate) return "intermediate";
  return "improve";
}

export const KDA_CAVEAT =
  "Le KDA seul ne détermine pas la qualité d'une partie : rôle, objectifs, vision, dégâts et décisions comptent aussi.";

export function analyzeKda(matches: MatchSummary[]): KdaAnalysis {
  const valid = analyzableMatches(matches);
  const kda = aggregateKda(valid);
  if (!kda) {
    return {
      kda: null, avgKills: 0, avgDeaths: 0, avgAssists: 0, tier: null,
      message: "Aucune partie exploitable : KDA non calculable.", caveat: KDA_CAVEAT,
    };
  }
  const t = totals(valid);
  const tier = classifyKda(kda.value);
  const label = { excellent: "Très bon ratio", intermediate: "Ratio intermédiaire", improve: "Ratio à améliorer" }[tier];
  return {
    kda: { value: round(kda.value, 2), perfect: kda.perfect },
    avgKills: round(t.kills / t.games),
    avgDeaths: round(t.deaths / t.games),
    avgAssists: round(t.assists / t.games),
    tier,
    message: kda.perfect
      ? `${label} — aucune mort sur les ${t.games} parties analysées (KDA « parfait »).`
      : `${label} (indicatif).`,
    caveat: KDA_CAVEAT,
  };
}

// ------------------------------------------------------------------------------------------------
// RÈGLE 2 — Analyse des champions
// ------------------------------------------------------------------------------------------------
export interface ChampionStats {
  championKey: string;
  championName: string;
  championId: number;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kda: KdaValue;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  /** true si le volume (≥ 5 parties) permet d'afficher une tendance exploitable */
  reliable: boolean;
}

export interface ChampionAnalysis {
  champions: ChampionStats[];      // triés par nombre de parties
  mostPlayed: ChampionStats[];     // top 5 par volume
  best: ChampionStats[];           // champions fiables, triés par winrate puis KDA
  message: string;
}

export function championStats(matches: MatchSummary[]): ChampionStats[] {
  const groups = new Map<string, MatchSummary[]>();
  for (const m of analyzableMatches(matches)) {
    const list = groups.get(m.championKey) ?? [];
    list.push(m);
    groups.set(m.championKey, list);
  }
  return [...groups.values()]
    .map((list) => {
      const t = totals(list);
      const kda = computeKda(t.kills, t.deaths, t.assists);
      return {
        championKey: list[0].championKey,
        championName: list[0].championName,
        championId: list[0].championId,
        games: t.games,
        wins: t.wins,
        losses: t.losses,
        winrate: round(computeWinrate(t.wins, t.games)!),
        kda: { value: round(kda.value, 2), perfect: kda.perfect },
        avgKills: round(t.kills / t.games),
        avgDeaths: round(t.deaths / t.games),
        avgAssists: round(t.assists / t.games),
        reliable: t.games >= THRESHOLDS.champions.minGames,
      };
    })
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate);
}

export function analyzeChampions(matches: MatchSummary[]): ChampionAnalysis {
  const champions = championStats(matches);
  const best = champions
    .filter((c) => c.reliable)
    .sort((a, b) => b.winrate - a.winrate || b.kda.value - a.kda.value);
  let message: string;
  if (champions.length === 0) {
    message = "Aucune partie exploitable : pas d'analyse par champion.";
  } else if (best.length === 0) {
    message = `Aucun champion n'atteint ${THRESHOLDS.champions.minGames} parties sur l'échantillon : aucune tendance par champion n'est affichée, pour éviter des conclusions basées sur trop peu de parties.`;
  } else {
    const top = best[0];
    message = `Meilleurs résultats sur ${top.championName} : ${top.winrate} % de victoires et KDA ${
      top.kda.perfect ? "parfait" : top.kda.value
    } sur ${top.games} parties. Tendance indicative, à confirmer sur davantage de parties.`;
  }
  return { champions, mostPlayed: champions.slice(0, 5), best, message };
}

// ------------------------------------------------------------------------------------------------
// RÈGLE 4 — Analyse de la dynamique (5 dernières vs 5 précédentes)
// ------------------------------------------------------------------------------------------------
export type DynamicsConclusion = "positive" | "stable" | "negative";

export interface BlockStats {
  games: number;
  wins: number;
  winrate: number;
  kda: KdaValue;
}

export interface Streak {
  type: "win" | "loss";
  length: number;
}

export type DynamicsAnalysis =
  | { status: "insufficient"; available: number; required: number; currentStreak: Streak | null; message: string }
  | {
      status: "ok";
      recent: BlockStats;
      previous: BlockStats;
      winrateDelta: number;   // en points de pourcentage
      kdaDelta: number;       // différence absolue
      kdaDeltaRatio: number;  // variation relative
      currentStreak: Streak | null;
      longestWinStreak: number;
      longestLossStreak: number;
      score: number;
      signals: string[];
      conclusion: DynamicsConclusion;
      message: string;
    };

function blockStats(list: MatchSummary[]): BlockStats {
  const t = totals(list);
  const kda = computeKda(t.kills, t.deaths, t.assists);
  return {
    games: t.games,
    wins: t.wins,
    winrate: round(computeWinrate(t.wins, t.games)!),
    kda: { value: round(kda.value, 2), perfect: kda.perfect },
  };
}

/** Série en cours, en partant de la partie la plus récente. `recentFirst` doit être trié du plus récent au plus ancien. */
export function currentStreak(recentFirst: MatchSummary[]): Streak | null {
  if (recentFirst.length === 0) return null;
  const first = recentFirst[0].win;
  let length = 0;
  for (const m of recentFirst) {
    if (m.win !== first) break;
    length++;
  }
  return { type: first ? "win" : "loss", length };
}

export function longestStreaks(recentFirst: MatchSummary[]): { win: number; loss: number } {
  let win = 0, loss = 0, cw = 0, cl = 0;
  for (const m of recentFirst) {
    if (m.win) { cw++; cl = 0; } else { cl++; cw = 0; }
    win = Math.max(win, cw);
    loss = Math.max(loss, cl);
  }
  return { win, loss };
}

export function analyzeDynamics(matches: MatchSummary[]): DynamicsAnalysis {
  const T = THRESHOLDS.dynamics;
  const required = T.blockSize * 2;
  const recentFirst = [...analyzableMatches(matches)].sort((a, b) => b.gameCreation - a.gameCreation);
  const streak = currentStreak(recentFirst);

  if (recentFirst.length < required) {
    return {
      status: "insufficient",
      available: recentFirst.length,
      required,
      currentStreak: streak,
      message: `Données insuffisantes : ${recentFirst.length} partie(s) exploitable(s) sur ${required} nécessaires pour comparer les 5 dernières parties aux 5 précédentes. Aucune conclusion n'est tirée.`,
    };
  }

  const recent = blockStats(recentFirst.slice(0, T.blockSize));
  const previous = blockStats(recentFirst.slice(T.blockSize, required));
  const winrateDelta = round(recent.winrate - previous.winrate);
  const kdaDelta = round(recent.kda.value - previous.kda.value, 2);
  const kdaDeltaRatio = previous.kda.value > 0
    ? (recent.kda.value - previous.kda.value) / previous.kda.value
    : recent.kda.value > 0 ? 1 : 0;
  const longest = longestStreaks(recentFirst);

  let score = 0;
  const signals: string[] = [];
  if (winrateDelta >= T.winrateDeltaPts) {
    score += 1;
    signals.push(`Winrate en hausse de ${winrateDelta} points (${previous.winrate} % → ${recent.winrate} %).`);
  } else if (winrateDelta <= -T.winrateDeltaPts) {
    score -= 1;
    signals.push(`Winrate en baisse de ${Math.abs(winrateDelta)} points (${previous.winrate} % → ${recent.winrate} %).`);
  } else {
    signals.push(`Winrate stable (${previous.winrate} % → ${recent.winrate} %).`);
  }
  if (kdaDeltaRatio >= T.kdaDeltaRatio) {
    score += 1;
    signals.push(`KDA en amélioration (${previous.kda.value} → ${recent.kda.value}).`);
  } else if (kdaDeltaRatio <= -T.kdaDeltaRatio) {
    score -= 1;
    signals.push(`KDA en recul (${previous.kda.value} → ${recent.kda.value}).`);
  } else {
    signals.push(`KDA stable (${previous.kda.value} → ${recent.kda.value}).`);
  }
  if (streak && streak.length >= T.streakMin) {
    score += streak.type === "win" ? 0.5 : -0.5;
    signals.push(`Série en cours : ${streak.length} ${streak.type === "win" ? "victoires" : "défaites"} consécutives.`);
  }

  const conclusion: DynamicsConclusion = score >= 1 ? "positive" : score <= -1 ? "negative" : "stable";
  const message = {
    positive: "Progression positive sur les 5 dernières parties par rapport aux 5 précédentes.",
    stable: "Situation stable entre les 5 dernières parties et les 5 précédentes.",
    negative: "Baisse des performances sur les 5 dernières parties par rapport aux 5 précédentes.",
  }[conclusion] + " Comparaison sur deux petits échantillons : à interpréter avec prudence.";

  return {
    status: "ok", recent, previous, winrateDelta, kdaDelta, kdaDeltaRatio: round(kdaDeltaRatio, 3),
    currentStreak: streak, longestWinStreak: longest.win, longestLossStreak: longest.loss,
    score, signals, conclusion, message,
  };
}

// ------------------------------------------------------------------------------------------------
// Rapport complet
// ------------------------------------------------------------------------------------------------
export interface AnalysisReport {
  totalMatches: number;
  excludedRemakes: number;
  winrate: WinrateAnalysis;
  kda: KdaAnalysis;
  champions: ChampionAnalysis;
  dynamics: DynamicsAnalysis;
}

export function analyze(matches: MatchSummary[]): AnalysisReport {
  return {
    totalMatches: matches.length,
    excludedRemakes: matches.filter((m) => m.remake).length,
    winrate: analyzeWinrate(matches),
    kda: analyzeKda(matches),
    champions: analyzeChampions(matches),
    dynamics: analyzeDynamics(matches),
  };
}
