import type { RankEntry } from "../types";

export const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];
const DIV_ORDER = ["IV", "III", "II", "I"];
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export const TIER_FR: Record<string, string> = {
  IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine", EMERALD: "Émeraude",
  DIAMOND: "Diamant", MASTER: "Maître", GRANDMASTER: "Grand Maître", CHALLENGER: "Challenger",
};

export function soloRank(ranks: RankEntry[]): RankEntry | undefined {
  return ranks.find((r) => r.queueType === "RANKED_SOLO_5x5");
}
export function flexRank(ranks: RankEntry[]): RankEntry | undefined {
  return ranks.find((r) => r.queueType === "RANKED_FLEX_SR");
}

/** Score ordinal permettant de comparer deux rangs (plus élevé = mieux classé). */
export function rankScore(entry: RankEntry | undefined): number | null {
  if (!entry) return null;
  const tier = TIER_ORDER.indexOf(entry.tier);
  if (tier < 0) return null;
  const div = APEX.has(entry.tier) ? 3 : DIV_ORDER.indexOf(entry.rank);
  return tier * 400 + Math.max(0, div) * 100 + entry.leaguePoints;
}

export function formatRank(entry: RankEntry | undefined): string {
  if (!entry) return "Non classé";
  const tier = TIER_FR[entry.tier] ?? entry.tier;
  return APEX.has(entry.tier) ? `${tier} · ${entry.leaguePoints} LP` : `${tier} ${entry.rank} · ${entry.leaguePoints} LP`;
}
