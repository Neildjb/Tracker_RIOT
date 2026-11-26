// Data Dragon : CDN public de Riot (sans clé) pour les noms/icônes de champions.
import { riotCache } from "./cache";

interface ChampionInfo {
  key: string;  // identifiant d'image (ex : "MonkeyKing")
  name: string; // nom affiché (ex : "Wukong")
}

interface DDragonData {
  version: string;
  byNumericId: Map<number, ChampionInfo>;
  byKey: Map<string, ChampionInfo>;
}

let loading: Promise<DDragonData | null> | null = null;
const CACHE_KEY = "ddragon";

export async function getDDragon(): Promise<DDragonData | null> {
  const cached = riotCache.get<DDragonData>(CACHE_KEY);
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    try {
      const versions = (await (
        await fetch("https://ddragon.leagueoflegends.com/api/versions.json", { signal: AbortSignal.timeout(8000) })
      ).json()) as string[];
      const version = versions[0];
      const champJson = (await (
        await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`, {
          signal: AbortSignal.timeout(8000),
        })
      ).json()) as { data: Record<string, { id: string; key: string; name: string }> };
      const byNumericId = new Map<number, ChampionInfo>();
      const byKey = new Map<string, ChampionInfo>();
      for (const c of Object.values(champJson.data)) {
        const info = { key: c.id, name: c.name };
        byNumericId.set(Number(c.key), info);
        byKey.set(c.id.toLowerCase(), info);
      }
      const data = { version, byNumericId, byKey };
      riotCache.set(CACHE_KEY, data, 6 * 3600_000);
      return data;
    } catch {
      return null; // non bloquant : l'interface affiche des initiales à la place des icônes
    } finally {
      loading = null;
    }
  })();
  return loading;
}
