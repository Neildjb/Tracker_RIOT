import type { KdaValue } from "../../shared/analysis/stats";

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";

export function championIconUrl(version: string | null, key: string | null): string | null {
  if (!version || !key) return null;
  return `${DDRAGON}/${version}/img/champion/${key}.png`;
}

export function profileIconUrl(version: string | null, id: number): string | null {
  if (!version) return null;
  return `${DDRAGON}/${version}/img/profileicon/${id}.png`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
export function formatRelative(ts: number): string {
  const diff = (ts - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(ts).toLocaleDateString("fr-FR");
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function formatKda(kda: KdaValue | null | undefined): string {
  if (!kda) return "—";
  return kda.perfect ? "Parfait" : kda.value.toFixed(2);
}

export function formatPct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${v.toFixed(1).replace(".0", "")} %`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export const POSITION_FR: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support",
};
