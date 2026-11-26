// Couche d'accès au backend NEXUS. Le navigateur n'appelle JAMAIS l'API Riot directement :
// toutes les requêtes passent par /api (serveur Express qui détient la clé).
import type { ApiErrorBody, ApiErrorCode, ApiStatus, PlatformId, PlayerProfile } from "../../shared/types";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de contacter le serveur NEXUS. Vérifiez votre connexion ou que le backend est démarré.",
    );
  }
  if (res.ok) return (await res.json()) as T;
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    /* réponse non JSON */
  }
  throw new ApiError(
    body?.error.code ?? "UPSTREAM_ERROR",
    body?.error.message ?? `Erreur serveur (HTTP ${res.status}).`,
    body?.error.retryAfter,
  );
}

export function fetchStatus(signal?: AbortSignal): Promise<ApiStatus> {
  return request<ApiStatus>("/api/status", signal);
}

export function fetchProfile(region: PlatformId, gameName: string, tagLine: string, signal?: AbortSignal): Promise<PlayerProfile> {
  return request<PlayerProfile>(
    `/api/profile/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    signal,
  );
}

export function profilePath(region: string, gameName: string, tagLine: string): string {
  return `/profile/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
}
