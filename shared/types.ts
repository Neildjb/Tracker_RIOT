// Types partagés entre le backend (normalisation des réponses Riot) et le frontend.

export type PlatformId =
  | "euw1" | "eun1" | "tr1" | "ru" | "me1"
  | "na1" | "br1" | "la1" | "la2"
  | "kr" | "jp1"
  | "oc1" | "sg2" | "tw2" | "vn2";

export interface RegionInfo {
  id: PlatformId;
  label: string;      // libellé court affiché (EUW, NA…)
  name: string;       // nom complet
}

export const REGIONS: RegionInfo[] = [
  { id: "euw1", label: "EUW", name: "Europe Ouest" },
  { id: "eun1", label: "EUNE", name: "Europe Nord & Est" },
  { id: "na1", label: "NA", name: "Amérique du Nord" },
  { id: "kr", label: "KR", name: "Corée" },
  { id: "br1", label: "BR", name: "Brésil" },
  { id: "la1", label: "LAN", name: "Amérique latine Nord" },
  { id: "la2", label: "LAS", name: "Amérique latine Sud" },
  { id: "jp1", label: "JP", name: "Japon" },
  { id: "tr1", label: "TR", name: "Turquie" },
  { id: "ru", label: "RU", name: "Russie" },
  { id: "me1", label: "ME", name: "Moyen-Orient" },
  { id: "oc1", label: "OCE", name: "Océanie" },
  { id: "sg2", label: "SEA", name: "Asie du Sud-Est" },
  { id: "tw2", label: "TW", name: "Taïwan" },
  { id: "vn2", label: "VN", name: "Vietnam" },
];

export function regionLabel(id: string): string {
  return REGIONS.find((r) => r.id === id)?.label ?? id.toUpperCase();
}

export function isPlatformId(value: string): value is PlatformId {
  return REGIONS.some((r) => r.id === value);
}

export interface RankEntry {
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR" | string;
  tier: string;          // IRON … CHALLENGER
  rank: string;          // I … IV
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface MasteryEntry {
  championId: number;
  championName: string | null; // null si la correspondance Data Dragon est indisponible
  championKey: string | null;  // identifiant d'image Data Dragon
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}

export interface MatchSummary {
  matchId: string;
  queueId: number;
  queueName: string;
  gameMode: string;
  gameCreation: number;   // timestamp ms
  gameDuration: number;   // secondes
  remake: boolean;        // partie écourtée (remake) — exclue des analyses
  championId: number;
  championName: string;   // nom affiché
  championKey: string;    // identifiant d'image Data Dragon
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  position: string;
  cs: number;
  visionScore: number;
  goldEarned: number;
  damageToChampions: number;
}

export interface PlayerProfile {
  demo: boolean;
  fetchedAt: string;
  region: PlatformId;
  account: { puuid: string; gameName: string; tagLine: string };
  summoner: { profileIconId: number; summonerLevel: number };
  ranks: RankEntry[];
  mastery: MasteryEntry[];
  matches: MatchSummary[];
  ddragonVersion: string | null;
  warnings: string[];
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "NETWORK_ERROR";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; retryAfter?: number };
}

export interface ApiStatus {
  configured: boolean;
  mode: "live" | "demo";
  matchCount: number;
}
