import dotenv from "dotenv";

// Toute la configuration sensible provient des variables d'environnement.
// La clé n'est JAMAIS écrite dans le code source ni envoyée au navigateur.
dotenv.config({ quiet: true } as dotenv.DotenvConfigOptions);
// dotenv ne remplace pas une variable déjà définie, même vide : certains lanceurs
// transmettent RIOT_API_KEY="" et masqueraient la clé du fichier .env.
if (!process.env.RIOT_API_KEY?.trim()) {
  const fromFile = dotenv.config({ override: true, quiet: true } as dotenv.DotenvConfigOptions).parsed?.RIOT_API_KEY;
  if (fromFile) process.env.RIOT_API_KEY = fromFile;
}
const rawKey = (process.env.RIOT_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

function parseLimits(raw: string | undefined): { max: number; windowMs: number }[] {
  // Format "max:secondes,max:secondes". Valeurs par défaut = clé de développement Riot
  // (20 req / 1 s et 100 req / 2 min), avec une petite marge de sécurité.
  const fallback = [
    { max: 18, windowMs: 1_000 },
    { max: 95, windowMs: 120_000 },
  ];
  if (!raw) return fallback;
  const parsed = raw.split(",").map((part) => {
    const [max, sec] = part.split(":").map(Number);
    return { max, windowMs: sec * 1000 };
  });
  return parsed.every((l) => l.max > 0 && l.windowMs > 0) ? parsed : fallback;
}

export const config = {
  riotApiKey: rawKey,
  demoMode: rawKey.length === 0,
  port: Number(process.env.API_PORT ?? 3001),
  matchCount: Math.min(50, Math.max(1, Number(process.env.MATCH_COUNT ?? 20) || 20)),
  rateLimits: parseLimits(process.env.RIOT_RATE_LIMITS),
  // Attente maximale tolérée dans la file d'attente du limiteur avant de renvoyer une erreur 429.
  maxQueueWaitMs: 25_000,
  isProduction: process.env.NODE_ENV === "production",
  // Nombre de proxys de confiance devant le serveur (0 en local, 1 chez la plupart des hébergeurs).
  trustProxy: Math.max(0, Number(process.env.TRUST_PROXY ?? 0) || 0),
};
