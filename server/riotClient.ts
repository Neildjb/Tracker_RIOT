import { config } from "./config";
import { riotCache } from "./cache";
import { AppError } from "./errors";
import { QueueTimeoutError, SlidingWindowLimiter } from "./rateLimiter";

const limiters = new Map<string, SlidingWindowLimiter>();
const inflight = new Map<string, Promise<unknown>>();

function limiterFor(host: string): SlidingWindowLimiter {
  let limiter = limiters.get(host);
  if (!limiter) {
    limiter = new SlidingWindowLimiter(config.rateLimits, config.maxQueueWaitMs);
    limiters.set(host, limiter);
  }
  return limiter;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
let fetchImpl: FetchLike = (url, init) => fetch(url, init);
/** Permet d'injecter un faux fetch dans les tests. */
export function setFetchImpl(fn: FetchLike): void {
  fetchImpl = fn;
}

/**
 * Appel GET vers l'API Riot, avec :
 *  - cache TTL (clé = hôte + chemin) et déduplication des requêtes simultanées,
 *  - limitation de débit par hôte,
 *  - traduction des erreurs HTTP 401 / 403 / 404 / 429 / 5xx en erreurs applicatives.
 */
export async function riotGet<T>(host: string, path: string, ttlMs: number): Promise<T> {
  const key = `${host}${path}`;
  const cached = riotCache.get<T>(key);
  if (cached !== undefined) return cached;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = doFetch<T>(host, path)
    .then((data) => {
      riotCache.set(key, data, ttlMs);
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function doFetch<T>(host: string, path: string, attempt = 0): Promise<T> {
  if (!config.riotApiKey) {
    throw new AppError("UNAUTHORIZED", "Aucune clé API Riot n'est configurée sur le serveur.");
  }
  const limiter = limiterFor(host);
  try {
    await limiter.acquire();
  } catch (err) {
    if (err instanceof QueueTimeoutError) {
      throw new AppError(
        "RATE_LIMITED",
        "Trop de requêtes vers l'API Riot pour le moment. Réessayez dans quelques instants.",
        err.retryAfterSec,
      );
    }
    throw err;
  }

  let res: Response;
  try {
    res = await fetchImpl(`https://${host}${path}`, {
      headers: { "X-Riot-Token": config.riotApiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    if (attempt < 1) {
      await sleep(500);
      return doFetch<T>(host, path, attempt + 1);
    }
    throw new AppError("NETWORK_ERROR", "Impossible de joindre les serveurs de Riot Games.");
  }

  if (res.ok) return (await res.json()) as T;

  switch (res.status) {
    case 400:
      throw new AppError("BAD_REQUEST", "Requête refusée par l'API Riot (paramètres invalides).");
    case 401:
      throw new AppError("UNAUTHORIZED", "Clé API Riot absente ou invalide (HTTP 401).");
    case 403:
      throw new AppError(
        "FORBIDDEN",
        "Clé API Riot refusée ou expirée (HTTP 403). Les clés de développement expirent toutes les 24 h : régénérez-la sur developer.riotgames.com.",
      );
    case 404:
      throw new AppError("NOT_FOUND", "Ressource introuvable.");
    case 429: {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "5") || 5;
      limiter.pause(retryAfter * 1000);
      if (attempt < 1 && retryAfter <= 10) {
        await sleep(retryAfter * 1000);
        return doFetch<T>(host, path, attempt + 1);
      }
      throw new AppError(
        "RATE_LIMITED",
        "Limite de requêtes Riot atteinte (HTTP 429). Réessayez dans quelques instants.",
        retryAfter,
      );
    }
    default:
      if (res.status >= 500 && attempt < 1) {
        await sleep(1000);
        return doFetch<T>(host, path, attempt + 1);
      }
      throw new AppError("UPSTREAM_ERROR", `L'API Riot a répondu avec une erreur (HTTP ${res.status}).`);
  }
}
