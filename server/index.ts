import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config";
import { AppError, HTTP_STATUS } from "./errors";
import { fetchProfile } from "./profileService";
import { demoProfile } from "./demo";
import { isPlatformId, type ApiErrorBody, type ApiStatus } from "../shared/types";
import { validateRiotId } from "../shared/riotId";

const app = express();
app.disable("x-powered-by");
// Derrière un hébergeur (Render, Railway…), l'IP réelle est dans X-Forwarded-For.
// TRUST_PROXY=1 indique de faire confiance au premier proxy ; sinon req.ip serait celle du proxy.
if (config.trustProxy) app.set("trust proxy", config.trustProxy);

// En-têtes de sécurité (équivalent minimal de helmet, sans dépendance).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://ddragon.leagueoflegends.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  });
  if (config.isProduction) {
    res.set("Content-Security-Policy", CSP);
    res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

// Limitation par adresse IP pour protéger le quota de la clé Riot (30 profils / minute).
const IP_WINDOW_MS = 60_000;
const IP_MAX = 30;
const ipHits = new Map<string, number[]>();
// Nettoyage périodique : la table ne grossit pas indéfiniment (anti-saturation mémoire).
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of ipHits) {
    if (hits.every((t) => now - t >= IP_WINDOW_MS)) ipHits.delete(ip);
  }
}, IP_WINDOW_MS).unref();

function ipLimit(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX) {
    return next(new AppError("RATE_LIMITED", "Trop de recherches en peu de temps. Patientez une minute.", 60));
  }
  if (ipHits.size > 10_000 && !ipHits.has(ip)) {
    return next(new AppError("RATE_LIMITED", "Serveur très sollicité. Réessayez dans un instant.", 30));
  }
  hits.push(now);
  ipHits.set(ip, hits);
  next();
}

app.get("/api/status", (_req, res) => {
  const body: ApiStatus = {
    configured: !config.demoMode,
    mode: config.demoMode ? "demo" : "live",
    matchCount: config.matchCount,
  };
  res.json(body);
});

app.get("/api/profile/:region/:gameName/:tagLine", ipLimit, async (req, res, next) => {
  try {
    const { region, gameName, tagLine } = req.params;
    if (!isPlatformId(region)) throw new AppError("BAD_REQUEST", `Région inconnue : ${region}.`);
    const parsed = validateRiotId(gameName.trim(), tagLine.trim());
    if (!parsed.ok) throw new AppError("BAD_REQUEST", parsed.error);
    const { value } = parsed;

    const profile = config.demoMode
      ? await demoProfile(region, value.gameName, value.tagLine, config.matchCount)
      : await fetchProfile(region, value.gameName, value.tagLine);
    res.set("Cache-Control", "no-store");
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

app.use("/api", (_req, _res, next) => next(new AppError("NOT_FOUND", "Route API inconnue.")));

// Fichiers du frontend compilé (mode production)
if (config.isProduction) {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Gestionnaire d'erreurs centralisé : ne renvoie jamais de détails internes (ni la clé).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const appErr = err instanceof AppError
    ? err
    : new AppError("UPSTREAM_ERROR", "Erreur interne inattendue.");
  if (!(err instanceof AppError)) console.error("[nexus] erreur inattendue:", err);
  const body: ApiErrorBody = { error: { code: appErr.code, message: appErr.message, retryAfter: appErr.retryAfter } };
  if (appErr.retryAfter) res.set("Retry-After", String(appErr.retryAfter));
  res.status(HTTP_STATUS[appErr.code]).json(body);
});

const server = app.listen(config.port, () => {
  console.log(`[nexus] API démarrée sur http://localhost:${config.port}`);
  console.log(
    config.demoMode
      ? "[nexus] RIOT_API_KEY absente -> MODE DÉMO (données fictives clairement signalées)"
      : `[nexus] Clé Riot chargée depuis l'environnement — ${config.matchCount} parties par profil`,
  );
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[nexus] ERREUR : le port ${config.port} est déjà utilisé (un ancien serveur tourne peut-être encore). ` +
        "Fermez-le ou changez API_PORT dans .env.",
    );
    process.exit(1);
  }
  throw err;
});
