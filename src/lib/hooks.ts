import { useEffect, useState } from "react";
import type { ApiStatus, PlatformId, PlayerProfile } from "../../shared/types";
import { ApiError, fetchProfile, fetchStatus } from "./api";

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError };

export function useProfile(region: PlatformId | null, gameName: string | null, tagLine: string | null, reloadKey = 0) {
  const [state, setState] = useState<AsyncState<PlayerProfile>>({ status: "idle" });
  useEffect(() => {
    if (!region || !gameName || !tagLine) {
      setState({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetchProfile(region, gameName, tagLine, ctrl.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setState({
          status: "error",
          error: err instanceof ApiError ? err : new ApiError("UPSTREAM_ERROR", "Erreur inattendue."),
        });
      });
    return () => ctrl.abort();
  }, [region, gameName, tagLine, reloadKey]);
  return state;
}

let statusCache: ApiStatus | null = null;
export function useApiStatus(): ApiStatus | null {
  const [status, setStatus] = useState<ApiStatus | null>(statusCache);
  useEffect(() => {
    if (statusCache) return;
    fetchStatus()
      .then((s) => {
        statusCache = s;
        setStatus(s);
      })
      .catch(() => setStatus(null));
  }, []);
  return status;
}

// Recherches récentes : stockées uniquement dans le navigateur de l'utilisateur.
const RECENT_KEY = "nexus.recent";
export interface RecentSearch { region: string; gameName: string; tagLine: string }

export function readRecent(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function pushRecent(entry: RecentSearch): void {
  try {
    const list = readRecent().filter(
      (r) => !(r.region === entry.region && r.gameName.toLowerCase() === entry.gameName.toLowerCase() && r.tagLine.toLowerCase() === entry.tagLine.toLowerCase()),
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...list].slice(0, 6)));
  } catch {
    /* stockage indisponible : fonctionnalité de confort uniquement */
  }
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}
