// Calculs statistiques de base. Fonctions pures, sans effet de bord, testées unitairement.
import type { MatchSummary } from "../types";

/** Parties retenues pour les analyses : les remakes (< 5 min / abandon anticipé) sont exclus. */
export function analyzableMatches(matches: MatchSummary[]): MatchSummary[] {
  return matches.filter((m) => !m.remake);
}

export interface KdaValue {
  /** Valeur numérique du ratio. Si deaths = 0, vaut kills + assists (convention usuelle). */
  value: number;
  /** true si aucune mort : le ratio est « parfait » et n'est pas une vraie division. */
  perfect: boolean;
}

/** KDA = (Kills + Assists) / Deaths, sans division par zéro. */
export function computeKda(kills: number, deaths: number, assists: number): KdaValue {
  if (deaths <= 0) return { value: kills + assists, perfect: true };
  return { value: (kills + assists) / deaths, perfect: false };
}

export interface Totals {
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
}

export function totals(matches: MatchSummary[]): Totals {
  const t: Totals = { games: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0 };
  for (const m of matches) {
    t.games++;
    if (m.win) t.wins++;
    else t.losses++;
    t.kills += m.kills;
    t.deaths += m.deaths;
    t.assists += m.assists;
  }
  return t;
}

/** KDA agrégé : (ΣK + ΣA) / ΣD. Plus robuste qu'une moyenne de ratios individuels. */
export function aggregateKda(matches: MatchSummary[]): KdaValue | null {
  if (matches.length === 0) return null;
  const t = totals(matches);
  return computeKda(t.kills, t.deaths, t.assists);
}

/** Winrate = victoires / parties × 100. null si aucune partie (pas de valeur inventée). */
export function computeWinrate(wins: number, games: number): number | null {
  if (games <= 0) return null;
  return (wins / games) * 100;
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export interface SeriesPoint {
  index: number;          // 1 = plus ancienne partie analysée
  matchId: string;
  date: number;
  champion: string;
  win: boolean;
  kda: number;            // valeur numérique (k+a si 0 mort)
  perfect: boolean;
  cumulativeWinrate: number;
  rollingWinrate: number; // sur les `window` dernières parties
  rollingKda: number;     // KDA agrégé sur les `window` dernières parties
}

/** Série chronologique (ancienne -> récente) alimentant les graphiques d'évolution. */
export function performanceSeries(matches: MatchSummary[], window = 5): SeriesPoint[] {
  const chrono = [...analyzableMatches(matches)].sort((a, b) => a.gameCreation - b.gameCreation);
  let wins = 0;
  return chrono.map((m, i) => {
    if (m.win) wins++;
    const slice = chrono.slice(Math.max(0, i - window + 1), i + 1);
    const sliceWins = slice.filter((x) => x.win).length;
    const k = computeKda(m.kills, m.deaths, m.assists);
    return {
      index: i + 1,
      matchId: m.matchId,
      date: m.gameCreation,
      champion: m.championName,
      win: m.win,
      kda: round(k.value, 2),
      perfect: k.perfect,
      cumulativeWinrate: round((wins / (i + 1)) * 100),
      rollingWinrate: round((sliceWins / slice.length) * 100),
      rollingKda: round(aggregateKda(slice)!.value, 2),
    };
  });
}
