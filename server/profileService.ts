import type { MasteryEntry, MatchSummary, PlatformId, PlayerProfile, RankEntry } from "../shared/types";
import { queueName } from "../shared/queues";
import { config } from "./config";
import { AppError } from "./errors";
import { getDDragon } from "./ddragon";
import { riotGet } from "./riotClient";
import { accountHost, matchHost, platformHost } from "./routing";
import { riotCache } from "./cache";

const MIN = 60_000;

// --- Formes (partielles) des réponses Riot utilisées -------------------------------------------
interface AccountDto { puuid: string; gameName: string; tagLine: string }
interface SummonerDto { puuid: string; profileIconId: number; summonerLevel: number }
interface LeagueEntryDto {
  queueType: string; tier: string; rank: string; leaguePoints: number;
  wins: number; losses: number; hotStreak: boolean;
}
interface MasteryDto { championId: number; championLevel: number; championPoints: number; lastPlayTime: number }
export interface ParticipantDto {
  puuid: string; championId: number; championName: string;
  kills: number; deaths: number; assists: number; win: boolean;
  teamPosition?: string; individualPosition?: string;
  totalMinionsKilled?: number; neutralMinionsKilled?: number;
  visionScore?: number; goldEarned?: number; totalDamageDealtToChampions?: number;
  gameEndedInEarlySurrender?: boolean;
}
export interface MatchDto {
  metadata: { matchId: string };
  info: {
    gameCreation: number; gameDuration: number; gameEndTimestamp?: number;
    gameMode: string; queueId: number; participants: ParticipantDto[];
  };
}

const enc = encodeURIComponent;
const BLOCKING: string[] = ["UNAUTHORIZED", "FORBIDDEN", "RATE_LIMITED"];

export async function fetchProfile(platform: PlatformId, gameName: string, tagLine: string): Promise<PlayerProfile> {
  const profileKey = `profile:${platform}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  const cachedProfile = riotCache.get<PlayerProfile>(profileKey);
  if (cachedProfile) return cachedProfile;

  const warnings: string[] = [];

  // 1. ACCOUNT-V1 : Riot ID -> PUUID
  let account: AccountDto;
  try {
    account = await riotGet<AccountDto>(
      accountHost(platform),
      `/riot/account/v1/accounts/by-riot-id/${enc(gameName)}/${enc(tagLine)}`,
      30 * MIN,
    );
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") {
      throw new AppError("NOT_FOUND", `Aucun joueur trouvé pour le Riot ID « ${gameName}#${tagLine} ».`);
    }
    throw err;
  }

  const pHost = platformHost(platform);
  const mHost = matchHost(platform);
  const puuid = enc(account.puuid);

  // 2. Appels indépendants en parallèle
  const [summonerRes, leagueRes, masteryRes, idsRes, ddragon] = await Promise.allSettled([
    riotGet<SummonerDto>(pHost, `/lol/summoner/v4/summoners/by-puuid/${puuid}`, 10 * MIN),
    riotGet<LeagueEntryDto[]>(pHost, `/lol/league/v4/entries/by-puuid/${puuid}`, 5 * MIN),
    riotGet<MasteryDto[]>(pHost, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=10`, 15 * MIN),
    riotGet<string[]>(mHost, `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${config.matchCount}`, 2 * MIN),
    getDDragon(),
  ]);

  // Les erreurs de clé ou de quota sont bloquantes, quel que soit l'appel concerné.
  for (const r of [summonerRes, leagueRes, masteryRes, idsRes]) {
    if (r.status === "rejected" && r.reason instanceof AppError && BLOCKING.includes(r.reason.code)) {
      throw r.reason;
    }
  }

  if (summonerRes.status === "rejected") {
    if (summonerRes.reason instanceof AppError && summonerRes.reason.code === "NOT_FOUND") {
      throw new AppError(
        "NOT_FOUND",
        `Le Riot ID « ${account.gameName}#${account.tagLine} » existe, mais aucun compte League of Legends n'est associé sur ce serveur. Essayez une autre région.`,
      );
    }
    throw summonerRes.reason;
  }
  const summoner = summonerRes.value;
  const dd = ddragon.status === "fulfilled" ? ddragon.value : null;
  if (!dd) warnings.push("Data Dragon indisponible : les icônes et noms de champions peuvent être incomplets.");

  const ranks: RankEntry[] = leagueRes.status === "fulfilled"
    ? leagueRes.value
        .filter((e) => e.queueType === "RANKED_SOLO_5x5" || e.queueType === "RANKED_FLEX_SR")
        .map((e) => ({
          queueType: e.queueType, tier: e.tier, rank: e.rank, leaguePoints: e.leaguePoints,
          wins: e.wins, losses: e.losses, hotStreak: e.hotStreak,
        }))
    : [];
  if (leagueRes.status === "rejected") warnings.push("Classement indisponible (LEAGUE-V4).");

  const mastery: MasteryEntry[] = masteryRes.status === "fulfilled"
    ? masteryRes.value.map((m) => {
        const info = dd?.byNumericId.get(m.championId);
        return {
          championId: m.championId,
          championName: info?.name ?? null,
          championKey: info?.key ?? null,
          championLevel: m.championLevel,
          championPoints: m.championPoints,
          lastPlayTime: m.lastPlayTime,
        };
      })
    : [];
  if (masteryRes.status === "rejected") warnings.push("Maîtrise des champions indisponible (CHAMPION-MASTERY-V4).");

  // 3. MATCH-V5 : détail de chaque partie (données immuables -> cache long)
  let matches: MatchSummary[] = [];
  if (idsRes.status === "fulfilled") {
    const details = await Promise.allSettled(
      idsRes.value.map((id) => riotGet<MatchDto>(mHost, `/lol/match/v5/matches/${enc(id)}`, 12 * 60 * MIN)),
    );
    const failed = details.filter((d): d is PromiseRejectedResult => d.status === "rejected");
    if (failed.length > 0) {
      if (failed.length === details.length && failed[0].reason instanceof AppError && BLOCKING.includes(failed[0].reason.code)) {
        throw failed[0].reason;
      }
      const rateLimited = failed.some((d) => d.reason instanceof AppError && d.reason.code === "RATE_LIMITED");
      warnings.push(
        `${failed.length} partie(s) sur ${details.length} n'ont pas pu être chargées${rateLimited ? " (limite de requêtes atteinte)" : ""}. Les analyses portent uniquement sur les parties chargées.`,
      );
    }
    matches = details
      .filter((d): d is PromiseFulfilledResult<MatchDto> => d.status === "fulfilled")
      .map((d) => normalizeMatch(d.value, account.puuid, dd?.byKey))
      .filter((m): m is MatchSummary => m !== null)
      .sort((a, b) => b.gameCreation - a.gameCreation);
  } else {
    warnings.push("Historique des parties indisponible (MATCH-V5).");
  }

  const profile: PlayerProfile = {
    demo: false,
    fetchedAt: new Date().toISOString(),
    region: platform,
    account: { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine },
    summoner: { profileIconId: summoner.profileIconId, summonerLevel: summoner.summonerLevel },
    ranks,
    mastery,
    matches,
    ddragonVersion: dd?.version ?? null,
    warnings,
  };
  // Profil agrégé conservé 2 minutes : évite de rappeler l'API à chaque rafraîchissement.
  // On ne met pas en cache un profil incomplet.
  if (warnings.length === 0) riotCache.set(profileKey, profile, 2 * MIN);
  return profile;
}

export function normalizeMatch(
  match: MatchDto,
  puuid: string,
  champsByKey?: Map<string, { key: string; name: string }>,
): MatchSummary | null {
  const p = match.info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;
  // Avant le patch 11.20, gameDuration était exprimé en millisecondes (absence de gameEndTimestamp).
  const duration = match.info.gameEndTimestamp ? match.info.gameDuration : Math.round(match.info.gameDuration / 1000);
  const champ = champsByKey?.get(p.championName.toLowerCase());
  return {
    matchId: match.metadata.matchId,
    queueId: match.info.queueId,
    queueName: queueName(match.info.queueId, match.info.gameMode),
    gameMode: match.info.gameMode,
    gameCreation: match.info.gameCreation,
    gameDuration: duration,
    remake: Boolean(p.gameEndedInEarlySurrender) || duration < 300,
    championId: p.championId,
    championName: champ?.name ?? p.championName,
    championKey: champ?.key ?? p.championName,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    win: p.win,
    // Riot renvoie "Invalid" quand le mode n'a pas de rôle (ARAM, Arena…)
    position: [p.teamPosition, p.individualPosition].find((x) => x && x !== "Invalid") ?? "",
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    visionScore: p.visionScore ?? 0,
    goldEarned: p.goldEarned ?? 0,
    damageToChampions: p.totalDamageDealtToChampions ?? 0,
  };
}
