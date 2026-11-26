// MODE DÉMONSTRATION — utilisé uniquement quand RIOT_API_KEY n'est pas configurée.
// Toutes les données produites ici sont FICTIVES, générées de façon déterministe à partir du
// Riot ID saisi, et marquées `demo: true` pour que l'interface les signale clairement.
import type { MatchSummary, PlatformId, PlayerProfile, RankEntry } from "../shared/types";
import { queueName } from "../shared/queues";
import { getDDragon } from "./ddragon";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHAMPS: { key: string; name: string; id: number; pos: string }[] = [
  { key: "Ahri", name: "Ahri", id: 103, pos: "MIDDLE" },
  { key: "Jinx", name: "Jinx", id: 222, pos: "BOTTOM" },
  { key: "LeeSin", name: "Lee Sin", id: 64, pos: "JUNGLE" },
  { key: "Thresh", name: "Thresh", id: 412, pos: "UTILITY" },
  { key: "Ezreal", name: "Ezreal", id: 81, pos: "BOTTOM" },
  { key: "Darius", name: "Darius", id: 122, pos: "TOP" },
  { key: "Lux", name: "Lux", id: 99, pos: "UTILITY" },
  { key: "Kaisa", name: "Kai'Sa", id: 145, pos: "BOTTOM" },
  { key: "Vi", name: "Vi", id: 254, pos: "JUNGLE" },
  { key: "Orianna", name: "Orianna", id: 61, pos: "MIDDLE" },
  { key: "Garen", name: "Garen", id: 86, pos: "TOP" },
  { key: "MissFortune", name: "Miss Fortune", id: 21, pos: "BOTTOM" },
];

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
const DIVS = ["IV", "III", "II", "I"];

export async function demoProfile(platform: PlatformId, gameName: string, tagLine: string, matchCount: number): Promise<PlayerProfile> {
  const rand = mulberry32(hashString(`${gameName.toLowerCase()}#${tagLine.toLowerCase()}@${platform}`));
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  // Pool de champions pondéré : quelques mains + champions occasionnels
  const shuffled = [...CHAMPS].sort(() => rand() - 0.5);
  const pool = [shuffled[0], shuffled[0], shuffled[0], shuffled[0], shuffled[1], shuffled[1], shuffled[1], shuffled[2], shuffled[2], shuffled[3], shuffled[4]];
  const skill = 0.4 + rand() * 0.25; // probabilité de victoire de base (fictive)
  const trend = (rand() - 0.5) * 0.4; // tendance récente fictive

  const now = Date.now();
  let t = now - 2 * 3600_000;
  const matches: MatchSummary[] = [];
  for (let i = 0; i < matchCount; i++) {
    const champ = pick(pool);
    const recentBoost = i < 5 ? trend : 0;
    const win = rand() < skill + recentBoost;
    const queueId = rand() < 0.7 ? 420 : pick([440, 400, 450]);
    const duration = rand() < 0.04 ? 200 : Math.round(1300 + rand() * 1100);
    const deaths = Math.round(rand() * (win ? 6 : 9));
    const kills = Math.round(rand() * (win ? 12 : 7));
    const assists = Math.round(rand() * (win ? 14 : 9));
    matches.push({
      matchId: `DEMO_${platform.toUpperCase()}_${1000 + i}`,
      queueId,
      queueName: queueName(queueId, queueId === 450 ? "ARAM" : "CLASSIC"),
      gameMode: queueId === 450 ? "ARAM" : "CLASSIC",
      gameCreation: t,
      gameDuration: duration,
      remake: duration < 300,
      championId: champ.id,
      championName: champ.name,
      championKey: champ.key,
      kills, deaths, assists, win,
      position: queueId === 450 ? "" : champ.pos,
      cs: Math.round((duration / 60) * (4 + rand() * 4)),
      visionScore: Math.round(10 + rand() * 40),
      goldEarned: Math.round(7000 + rand() * 9000),
      damageToChampions: Math.round(9000 + rand() * 25000),
    });
    t -= Math.round((0.6 + rand() * 14) * 3600_000);
  }

  const tierIdx = Math.min(TIERS.length - 1, Math.floor(skill * 9) - 2 + Math.floor(rand() * 2));
  const soloWins = 20 + Math.floor(rand() * 120);
  const soloLosses = 20 + Math.floor(rand() * 120);
  const ranks: RankEntry[] = [
    {
      queueType: "RANKED_SOLO_5x5", tier: TIERS[Math.max(0, tierIdx)], rank: pick(DIVS),
      leaguePoints: Math.floor(rand() * 100), wins: soloWins, losses: soloLosses, hotStreak: rand() < 0.2,
    },
  ];
  if (rand() < 0.6) {
    ranks.push({
      queueType: "RANKED_FLEX_SR", tier: TIERS[Math.max(0, tierIdx - 1)], rank: pick(DIVS),
      leaguePoints: Math.floor(rand() * 100), wins: 5 + Math.floor(rand() * 30), losses: 5 + Math.floor(rand() * 30), hotStreak: false,
    });
  }

  const mastery = shuffled.slice(0, 8).map((c, i) => ({
    championId: c.id,
    championName: c.name,
    championKey: c.key,
    championLevel: Math.max(1, 12 - i - Math.floor(rand() * 3)),
    championPoints: Math.round((400_000 / (i + 1)) * (0.5 + rand())),
    lastPlayTime: now - Math.round(rand() * 30 * 86400_000),
  }));

  const dd = await getDDragon();
  return {
    demo: true,
    fetchedAt: new Date().toISOString(),
    region: platform,
    account: { puuid: `DEMO-${hashString(gameName + tagLine).toString(16)}`, gameName, tagLine },
    summoner: { profileIconId: 1 + Math.floor(rand() * 28), summonerLevel: 30 + Math.floor(rand() * 400) },
    ranks,
    mastery,
    matches,
    ddragonVersion: dd?.version ?? null,
    warnings: [],
  };
}
