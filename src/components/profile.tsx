import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Crosshair, Flame, Info, Medal, Swords, Trophy, TrendingUp,
} from "lucide-react";
import type { MasteryEntry, MatchSummary, PlayerProfile, RankEntry } from "../../shared/types";
import { regionLabel } from "../../shared/types";
import type { AnalysisReport, ChampionStats, DynamicsAnalysis, KdaAnalysis, WinrateAnalysis } from "../../shared/analysis/rules";
import { THRESHOLDS } from "../../shared/analysis/rules";
import { computeKda } from "../../shared/analysis/stats";
import { TIER_FR, formatRank } from "../../shared/analysis/rank";
import {
  POSITION_FR, formatDuration, formatKda, formatNumber, formatPct, formatRelative, profileIconUrl,
} from "../lib/format";
import { Badge, Card, ChampionIcon, EmptyNote } from "./ui";

// ------------------------------------------------------------------ En-tête & rangs
export function ProfileHeader({ profile }: { profile: PlayerProfile }) {
  const [imgFailed, setImgFailed] = useState(false);
  const icon = profileIconUrl(profile.ddragonVersion, profile.summoner.profileIconId);
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6 animate-fade-up">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-nexus-violet/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <div className="rounded-2xl bg-gradient-to-br from-nexus-cyan to-nexus-violet p-[2px]">
            {icon && !imgFailed ? (
              <img src={icon} alt="Icône de profil" onError={() => setImgFailed(true)} className="h-20 w-20 rounded-[14px] object-cover sm:h-24 sm:w-24" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-[14px] bg-night-800 font-display text-2xl font-bold sm:h-24 sm:w-24">
                {profile.account.gameName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className="num absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-line-strong bg-night-900 px-2 py-0.5 text-[11px] font-bold text-ink">
            {profile.summoner.summonerLevel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
              {profile.account.gameName}
              <span className="ml-1 text-ink-3">#{profile.account.tagLine}</span>
            </h1>
            {profile.demo && <Badge tone="warn">DONNÉES FICTIVES</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
            <Badge tone="info">{regionLabel(profile.region)}</Badge>
            <span>Niveau <b className="num text-ink">{profile.summoner.summonerLevel}</b></span>
            <span className="text-ink-3">·</span>
            <span>Mis à jour {formatRelative(new Date(profile.fetchedAt).getTime())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIER_COLOR: Record<string, string> = {
  IRON: "#8d8b8a", BRONZE: "#b0703f", SILVER: "#a6b4c2", GOLD: "#e0b44c", PLATINUM: "#3fb6a8", EMERALD: "#2fb36d",
  DIAMOND: "#6d8ff0", MASTER: "#b25ae8", GRANDMASTER: "#e05454", CHALLENGER: "#f2c94c",
};

export function RankCard({ title, entry }: { title: string; entry: RankEntry | undefined }) {
  if (!entry) {
    return (
      <div className="card p-4 animate-fade-up">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{title}</div>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-line-strong text-ink-3"><Medal className="h-5 w-5" /></div>
          <div className="text-sm text-ink-2">Non classé cette saison</div>
        </div>
      </div>
    );
  }
  const games = entry.wins + entry.losses;
  const wr = games ? (entry.wins / games) * 100 : null;
  const color = TIER_COLOR[entry.tier] ?? "#a9aed6";
  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">
        {title}
        {entry.hotStreak && <Badge tone="warn"><Flame className="h-3 w-3" /> En série</Badge>}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border" style={{ borderColor: `${color}66`, background: `${color}1a`, color }}>
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-lg font-semibold" style={{ color }}>{TIER_FR[entry.tier] ?? entry.tier} {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(entry.tier) ? "" : entry.rank}</div>
          <div className="num text-xs text-ink-2">{entry.leaguePoints} LP · {entry.wins}V {entry.losses}D · {formatPct(wr)}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">Bilan de saison fourni par LEAGUE-V4 ({games} parties classées).</p>
    </div>
  );
}

// ------------------------------------------------------------------ Moteur d'analyse (4 règles)
const TREND_TONE = { positive: "positive", balanced: "neutral", negative: "negative" } as const;
const TREND_LABEL = { positive: "Tendance positive", balanced: "Équilibré", negative: "Tendance négative" } as const;
const KDA_TONE = { excellent: "positive", intermediate: "neutral", improve: "negative" } as const;
const KDA_LABEL = { excellent: "Très bon ratio", intermediate: "Ratio intermédiaire", improve: "Ratio à améliorer" } as const;

function RuleCard({ n, title, icon, badge, children }: { n: number; title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-night-900/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-nexus-violet/15 text-nexus-violet-soft">{icon}</span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Règle {n}</div>
            <div className="font-display text-sm font-semibold">{title}</div>
          </div>
        </div>
        {badge}
      </div>
      <div className="flex-1 space-y-2 text-sm text-ink-2">{children}</div>
    </div>
  );
}

function WinrateRule({ a }: { a: WinrateAnalysis }) {
  return (
    <RuleCard n={1} title="Analyse du winrate" icon={<Activity className="h-4 w-4" />}
      badge={a.trend && <Badge tone={TREND_TONE[a.trend]}>{TREND_LABEL[a.trend]}</Badge>}>
      <div className="num text-3xl font-bold text-ink">{formatPct(a.winrate)}</div>
      <div className="num text-xs text-ink-3">{a.wins} V / {a.losses} D sur {a.games} parties</div>
      <p>{a.message}</p>
      <p className="text-[11px] text-ink-3">Seuils : &gt; {THRESHOLDS.winrate.positive} % positif · {THRESHOLDS.winrate.negative}–{THRESHOLDS.winrate.positive} % équilibré · &lt; {THRESHOLDS.winrate.negative} % négatif.</p>
    </RuleCard>
  );
}

function ChampionRule({ best, message, version }: { best: ChampionStats[]; message: string; version: string | null }) {
  return (
    <RuleCard n={2} title="Analyse des champions" icon={<Swords className="h-4 w-4" />}
      badge={<Badge tone={best.length ? "violet" : "neutral"}>{best.length} fiable{best.length > 1 ? "s" : ""}</Badge>}>
      {best.length > 0 ? (
        <ul className="space-y-1.5">
          {best.slice(0, 3).map((c) => (
            <li key={c.championKey} className="flex items-center gap-2">
              <ChampionIcon version={version} championKey={c.championKey} name={c.championName} size={26} />
              <span className="flex-1 truncate text-ink">{c.championName}</span>
              <span className="num text-xs">{c.winrate} % · {formatKda(c.kda)} · {c.games} p.</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p>{message}</p>
      <p className="text-[11px] text-ink-3">Tendance affichée uniquement à partir de {THRESHOLDS.champions.minGames} parties sur un champion.</p>
    </RuleCard>
  );
}

function KdaRule({ a }: { a: KdaAnalysis }) {
  return (
    <RuleCard n={3} title="Analyse du KDA" icon={<Crosshair className="h-4 w-4" />}
      badge={a.tier && <Badge tone={KDA_TONE[a.tier]}>{KDA_LABEL[a.tier]}</Badge>}>
      <div className="num text-3xl font-bold text-ink">{a.kda ? (a.kda.perfect ? "Parfait" : a.kda.value.toFixed(2)) : "—"}</div>
      <div className="num text-xs text-ink-3">{a.avgKills} / <span className="text-red-300">{a.avgDeaths}</span> / {a.avgAssists} en moyenne</div>
      <p>{a.message}</p>
      <p className="flex gap-1.5 text-[11px] text-ink-3"><Info className="mt-px h-3 w-3 shrink-0" />{a.caveat}</p>
    </RuleCard>
  );
}

const DYN_META = {
  positive: { label: "Progression positive", tone: "positive", icon: <ArrowUpRight className="h-3 w-3" /> },
  stable: { label: "Situation stable", tone: "neutral", icon: <ArrowRight className="h-3 w-3" /> },
  negative: { label: "Baisse des performances", tone: "negative", icon: <ArrowDownRight className="h-3 w-3" /> },
} as const;

function DynamicsRule({ a }: { a: DynamicsAnalysis }) {
  if (a.status === "insufficient") {
    return (
      <RuleCard n={4} title="Analyse de la dynamique" icon={<TrendingUp className="h-4 w-4" />} badge={<Badge>Données insuffisantes</Badge>}>
        <p>{a.message}</p>
      </RuleCard>
    );
  }
  const meta = DYN_META[a.conclusion];
  const delta = (v: number, suffix = "") => (
    <span className={v > 0 ? "text-emerald-300" : v < 0 ? "text-red-300" : "text-ink-2"}>{v > 0 ? "+" : ""}{v}{suffix}</span>
  );
  return (
    <RuleCard n={4} title="Analyse de la dynamique" icon={<TrendingUp className="h-4 w-4" />}
      badge={<Badge tone={meta.tone}>{meta.icon}{meta.label}</Badge>}>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-night-800 p-2"><div className="text-ink-3">5 précédentes</div><div className="num font-semibold text-ink">{a.previous.winrate} %</div><div className="num text-ink-2">KDA {formatKda(a.previous.kda)}</div></div>
        <div className="rounded-lg bg-night-800 p-2"><div className="text-ink-3">5 dernières</div><div className="num font-semibold text-ink">{a.recent.winrate} %</div><div className="num text-ink-2">KDA {formatKda(a.recent.kda)}</div></div>
        <div className="rounded-lg bg-night-800 p-2"><div className="text-ink-3">Écart</div><div className="num font-semibold">{delta(a.winrateDelta, " pts")}</div><div className="num">{delta(a.kdaDelta)}</div></div>
      </div>
      <ul className="list-inside list-disc space-y-0.5 text-xs">
        {a.signals.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <p className="text-xs text-ink-3">
        Plus longues séries : {a.longestWinStreak} victoires · {a.longestLossStreak} défaites. {a.message}
      </p>
    </RuleCard>
  );
}

export function AnalysisPanel({ report, version }: { report: AnalysisReport; version: string | null }) {
  return (
    <Card
      title="Moteur d'analyse"
      icon={<Activity className="h-4 w-4" />}
      subtitle={`Calculé automatiquement sur ${report.winrate.games} parties exploitables${report.excludedRemakes ? ` (${report.excludedRemakes} remake${report.excludedRemakes > 1 ? "s" : ""} exclu${report.excludedRemakes > 1 ? "s" : ""})` : ""}. Résultats indicatifs.`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <WinrateRule a={report.winrate} />
        <ChampionRule best={report.champions.best} message={report.champions.message} version={version} />
        <KdaRule a={report.kda} />
        <DynamicsRule a={report.dynamics} />
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Tableau champions + maîtrise
export function ChampionTable({ champions, mastery, version }: { champions: ChampionStats[]; mastery: MasteryEntry[]; version: string | null }) {
  const masteryById = useMemo(() => new Map(mastery.map((m) => [m.championId, m])), [mastery]);
  if (champions.length === 0) return <EmptyNote>Aucune partie exploitable.</EmptyNote>;
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
            <th className="py-2 font-medium">Champion</th>
            <th className="py-2 text-right font-medium">Parties</th>
            <th className="py-2 text-right font-medium">Winrate</th>
            <th className="py-2 text-right font-medium">K / D / A</th>
            <th className="py-2 text-right font-medium">KDA</th>
            <th className="py-2 text-right font-medium">Maîtrise</th>
          </tr>
        </thead>
        <tbody>
          {champions.map((c) => {
            const m = masteryById.get(c.championId);
            return (
              <tr key={c.championKey} className="border-b border-line/50 last:border-0 hover:bg-night-700/30">
                <td className="py-2">
                  <div className="flex items-center gap-2.5">
                    <ChampionIcon version={version} championKey={c.championKey} name={c.championName} size={30} />
                    <span className="font-medium">{c.championName}</span>
                    {!c.reliable && <span className="text-[10px] text-ink-3" title="Moins de 5 parties : pas de tendance exploitable">échantillon &lt; 5</span>}
                  </div>
                </td>
                <td className="num py-2 text-right">{c.games}</td>
                <td className="num py-2 text-right">
                  <span className={c.reliable ? (c.winrate > 55 ? "text-emerald-300" : c.winrate < 45 ? "text-red-300" : "") : "text-ink-2"}>{c.winrate} %</span>
                </td>
                <td className="num py-2 text-right text-ink-2">{c.avgKills} / {c.avgDeaths} / {c.avgAssists}</td>
                <td className="num py-2 text-right font-semibold">{formatKda(c.kda)}</td>
                <td className="num py-2 text-right text-ink-2">{m ? `Niv. ${m.championLevel}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MasteryList({ mastery, version }: { mastery: MasteryEntry[]; version: string | null }) {
  if (mastery.length === 0) return <EmptyNote>Maîtrise des champions non disponible.</EmptyNote>;
  const max = mastery[0].championPoints || 1;
  return (
    <ul className="space-y-2.5">
      {mastery.slice(0, 6).map((m) => {
        const name = m.championName ?? `Champion #${m.championId}`;
        return (
          <li key={m.championId} className="flex items-center gap-3">
            <ChampionIcon version={version} championKey={m.championKey} name={name} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{name}</span>
                <span className="num shrink-0 text-xs text-ink-2">Niv. {m.championLevel}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-night-700">
                <div className="h-full rounded-full bg-gradient-to-r from-nexus-cyan to-nexus-violet" style={{ width: `${(m.championPoints / max) * 100}%` }} />
              </div>
              <div className="num mt-0.5 text-[11px] text-ink-3">{formatNumber(m.championPoints)} pts</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ Historique
export function MatchHistory({ matches, version }: { matches: MatchSummary[]; version: string | null }) {
  const [queue, setQueue] = useState<string>("all");
  const queues = useMemo(() => [...new Set(matches.map((m) => m.queueName))], [matches]);
  const shown = queue === "all" ? matches : matches.filter((m) => m.queueName === queue);
  if (matches.length === 0) return <EmptyNote>Aucune partie récente trouvée pour ce joueur.</EmptyNote>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["all", ...queues].map((q) => (
          <button
            key={q}
            onClick={() => setQueue(q)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${queue === q ? "border-nexus-cyan/60 bg-nexus-cyan/10 text-cyan-100" : "border-line text-ink-2 hover:text-ink"}`}
          >
            {q === "all" ? `Toutes (${matches.length})` : q}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {shown.map((m) => {
          const kda = computeKda(m.kills, m.deaths, m.assists);
          const tone = m.remake ? "border-l-ink-3" : m.win ? "border-l-win" : "border-l-loss";
          return (
            <li key={m.matchId} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-line border-l-4 ${tone} bg-night-900/60 px-3 py-2.5 sm:grid-cols-[auto_1.2fr_1fr_1fr_auto]`}>
              <ChampionIcon version={version} championKey={m.championKey} name={m.championName} size={40} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${m.remake ? "text-ink-3" : m.win ? "text-emerald-300" : "text-red-300"}`}>
                    {m.remake ? "REMAKE" : m.win ? "VICTOIRE" : "DÉFAITE"}
                  </span>
                  <span className="truncate text-xs text-ink-3">{m.queueName}</span>
                </div>
                <div className="truncate text-sm font-medium">{m.championName}{m.position && <span className="ml-1.5 text-xs text-ink-3">{POSITION_FR[m.position] ?? m.position}</span>}</div>
              </div>
              <div className="text-right sm:text-center">
                <div className="num text-sm font-semibold">{m.kills} / <span className="text-red-300">{m.deaths}</span> / {m.assists}</div>
                <div className="num text-[11px] text-ink-3">KDA {kda.perfect ? "Parfait" : kda.value.toFixed(2)}</div>
              </div>
              <div className="num hidden text-center text-xs text-ink-2 sm:block">
                {m.cs} CS · {formatNumber(m.damageToChampions)} dégâts
              </div>
              <div className="col-span-3 flex justify-between text-[11px] text-ink-3 sm:col-span-1 sm:block sm:text-right">
                <div className="num">{formatDuration(m.gameDuration)}</div>
                <div title={new Date(m.gameCreation).toLocaleString("fr-FR")}>{formatRelative(m.gameCreation)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { formatRank };
