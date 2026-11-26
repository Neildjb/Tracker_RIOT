import type { PlatformId } from "../shared/types";

// Correspondance serveur de jeu (platform) -> cluster régional (Account-V1 / Match-V5).
export type RegionalRoute = "europe" | "americas" | "asia" | "sea";

const PLATFORM_TO_REGIONAL: Record<PlatformId, RegionalRoute> = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe", me1: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas",
  kr: "asia", jp1: "asia",
  oc1: "sea", sg2: "sea", tw2: "sea", vn2: "sea",
};

/** Hôte pour SUMMONER-V4, LEAGUE-V4, CHAMPION-MASTERY-V4 (ex : euw1.api.riotgames.com). */
export function platformHost(platform: PlatformId): string {
  return `${platform}.api.riotgames.com`;
}

/** Hôte pour MATCH-V5 (ex : europe.api.riotgames.com). */
export function matchHost(platform: PlatformId): string {
  return `${PLATFORM_TO_REGIONAL[platform]}.api.riotgames.com`;
}

/**
 * Hôte pour ACCOUNT-V1. Les comptes Riot sont globaux et Account-V1 n'est servi que par
 * americas / asia / europe : les serveurs SEA passent par asia.
 */
export function accountHost(platform: PlatformId): string {
  const regional = PLATFORM_TO_REGIONAL[platform];
  return `${regional === "sea" ? "asia" : regional}.api.riotgames.com`;
}
