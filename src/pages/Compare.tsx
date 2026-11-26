import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, GitCompareArrows, Scale, Swords, TrendingUp } from "lucide-react";
import { isPlatformId, regionLabel, type PlatformId, type PlayerProfile } from "../../shared/types";
import { parseRiotId } from "../../shared/riotId";
import { analyze, type AnalysisReport } from "../../shared/analysis/rules";
import { performanceSeries } from "../../shared/analysis/stats";
import { formatRank, rankScore, soloRank } from "../../shared/analysis/rank";
import { useProfile, type AsyncState } from "../lib/hooks";
import { formatKda, formatPct, profileIconUrl } from "../lib/format";
import { profilePath } from "../lib/api";
import { RiotIdField } from "../components/SearchForm";
import { Badge, Card, ChampionIcon, EmptyNote, ErrorState, Loading } from "../components/ui";
import { C, CompareBarChart, CompareTrendChart } from "../components/charts";

function splitId(raw: string | null): { gameName: string; tagLine: string } | null {
  if (!raw) return null;
  const p = parseRiotId(raw);
  return p.ok ? p.value : null;
}

interface Side {
  profile: PlayerProfile;
  report: AnalysisReport;
  name: string;
}

function useSide(state: AsyncState<PlayerProfile>): Side | null {
  return useMemo(() => {
    if (state.status !== "success") return null;
    const p = state.data;
    return { profile: p, report: analyze(p.matches), name: `${p.account.gameName}#${p.account.tagLine}` };
  }, [state]);
}

const DYN = {
  positive: { label: "Progression positive", tone: "positive", icon: <ArrowUpRight className="h-3 w-3" /> },
  stable: { label: "Situation stable", tone: "neutral", icon: <ArrowRight className="h-3 w-3" /> },
  negative: { label: "Baisse des performances", tone: "negative", icon: <ArrowDownRight className="h-3 w-3" /> },
} as const;

function dynamicsBadge(r: AnalysisReport) {
  if (r.dynamics.status === "insufficient") return <Badge>Données insuffisantes</Badge>;
  const d = DYN[r.dynamics.conclusion];
  return <Badge tone={d.tone}>{d.icon}{d.label}</Badge>;
}

function recentWinrate(r: AnalysisReport): number | null {
  return r.dynamics.status === "ok" ? r.dynamics.recent.winrate : null;
}

function soloSeasonWinrate(p: PlayerProfile): number | null {
  const s = soloRank(p.ranks);
  if (!s || s.wins + s.losses === 0) return null;
  return Math.round((s.wins / (s.wins + s.losses)) * 1000) / 10;
}

/** Ligne de comparaison : met en avant la valeur la plus élevée, sans jugement de valeur. */
function Row({ label, a, b, va, vb, note }: { label: string; a: React.ReactNode; b: React.ReactNode; va: number | null; vb: number | null; note?: string }) {
  const lead = va !== null && vb !== null && va !== vb ? (va > vb ? "a" : "b") : null;
  const cell = (side: "a" | "b", content: React.ReactNode) => (
    <td className={`num px-3 py-2.5 text-center ${lead === side ? "font-bold text-ink" : "text-ink-2"}`}>
      <span className="inline-flex items-center gap-1.5">
        {lead === side && <span className="h-1.5 w-1.5 rounded-full" style={{ background: side === "a" ? C.a : C.b }} aria-label="valeur la plus élevée" />}
        {content}
      </span>
    </td>
  );
  return (
    <tr className="border-b border-line/50 last:border-0">
      {cell("a", a)}
      <td className="px-3 py-2.5 text-center text-xs text-ink-3">
        {label}
        {note && <div className="text-[10px] text-ink-3/80">{note}</div>}
      </td>
      {cell("b", b)}
    </tr>
  );
}

function PlayerCard({ side, color }: { side: Side; color: string }) {
  const p = side.profile;
  const icon = profileIconUrl(p.ddragonVersion, p.summoner.profileIconId);
  return (
    <Link to={profilePath(p.region, p.account.gameName, p.account.tagLine)} className="card flex items-center gap-3 p-4 transition hover:border-line-strong" style={{ borderTop: `2px solid ${color}` }}>
      {icon ? <img src={icon} alt="" className="h-12 w-12 rounded-xl border border-line" /> : <div className="h-12 w-12 rounded-xl bg-night-700" />}
      <div className="min-w-0">
        <div className="truncate font-display font-semibold">{p.account.gameName}<span className="text-ink-3">#{p.account.tagLine}</span></div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
          <Badge tone="info">{regionLabel(p.region)}</Badge> Niv. {p.summoner.summonerLevel}
          {p.demo && <Badge tone="warn">FICTIF</Badge>}
        </div>
      </div>
    </Link>
  );
}

function TopChampions({ side }: { side: Side }) {
  const list = side.report.champions.mostPlayed;
  if (!list.length) return <EmptyNote>Aucune partie.</EmptyNote>;
  return (
    <ul className="space-y-2">
      {list.map((c) => (
        <li key={c.championKey} className="flex items-center gap-2.5 text-sm">
          <ChampionIcon version={side.profile.ddragonVersion} championKey={c.championKey} name={c.championName} size={28} />
          <span className="flex-1 truncate">{c.championName}</span>
          <span className="num text-xs text-ink-2">{c.games} p. · {c.winrate} % · {formatKda(c.kda)}</span>
          {!c.reliable && <span className="text-[10px] text-ink-3">&lt; 5</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const ra: PlatformId = isPlatformId(params.get("ra") ?? "") ? (params.get("ra") as PlatformId) : "euw1";
  const rb: PlatformId = isPlatformId(params.get("rb") ?? "") ? (params.get("rb") as PlatformId) : ra;
  const idA = splitId(params.get("a"));
  const idB = splitId(params.get("b"));

  const [inA, setInA] = useState(params.get("a") ?? "");
  const [inB, setInB] = useState(params.get("b") ?? "");
  const [regA, setRegA] = useState<PlatformId>(ra);
  const [regB, setRegB] = useState<PlatformId>(rb);
  const [errA, setErrA] = useState<string | null>(null);
  const [errB, setErrB] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const ready = Boolean(idA && idB);
  const stA = useProfile(ready ? ra : null, idA?.gameName ?? null, idA?.tagLine ?? null, reload);
  const stB = useProfile(ready ? rb : null, idB?.gameName ?? null, idB?.tagLine ?? null, reload);
  const A = useSide(stA);
  const B = useSide(stB);

  function submit(e: FormEvent) {
    e.preventDefault();
    const pa = parseRiotId(inA);
    const pb = parseRiotId(inB);
    setErrA(pa.ok ? null : pa.error);
    setErrB(pb.ok ? null : pb.error);
    if (!pa.ok || !pb.ok) return;
    setParams({ a: `${pa.value.gameName}#${pa.value.tagLine}`, ra: regA, b: `${pb.value.gameName}#${pb.value.tagLine}`, rb: regB });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl"><GitCompareArrows className="h-6 w-6 text-nexus-cyan" /> Comparateur</h1>
        <p className="mt-1 text-sm text-ink-2">Comparez deux joueurs sur les mêmes indicateurs, calculés de la même manière.</p>
      </div>

      <form onSubmit={submit} className="card grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-start">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: C.a }} /> Joueur A</label>
          <RiotIdField size="md" value={inA} onChange={setInA} region={regA} onRegion={setRegA} error={errA} />
        </div>
        <div className="hidden pt-9 text-center font-display text-sm font-bold text-ink-3 md:block">VS</div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: C.b }} /> Joueur B</label>
          <RiotIdField size="md" value={inB} onChange={setInB} region={regB} onRegion={setRegB} error={errB} />
        </div>
        <button type="submit" className="h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 font-display font-semibold text-white transition hover:brightness-110 md:mt-6">
          Comparer
        </button>
      </form>

      <div className="mt-6">
        {!ready && <EmptyNote>Saisissez deux Riot ID (format Pseudo#TAG) pour lancer la comparaison.</EmptyNote>}
        {ready && (stA.status === "loading" || stB.status === "loading") && <Loading label="Récupération des deux profils…" />}
        {stA.status === "error" && <div><p className="text-center text-sm text-ink-3">Joueur A</p><ErrorState error={stA.error} onRetry={() => setReload((n) => n + 1)} /></div>}
        {stB.status === "error" && <div><p className="text-center text-sm text-ink-3">Joueur B</p><ErrorState error={stB.error} onRetry={() => setReload((n) => n + 1)} /></div>}
        {A && B && <CompareResult A={A} B={B} />}
      </div>
    </div>
  );
}

function CompareResult({ A, B }: { A: Side; B: Side }) {
  const ga = A.report.winrate.games;
  const gb = B.report.winrate.games;
  const ratio = Math.max(ga, gb) / Math.max(1, Math.min(ga, gb));
  const soloA = soloRank(A.profile.ranks);
  const soloB = soloRank(B.profile.ranks);
  const seriesA = useMemo(() => performanceSeries(A.profile.matches), [A]);
  const seriesB = useMemo(() => performanceSeries(B.profile.matches), [B]);
  const mixedDemo = A.profile.demo !== B.profile.demo;

  const kdaVal = (r: AnalysisReport) => r.kda.kda?.value ?? null;
  const recentKda = (r: AnalysisReport) => (r.dynamics.status === "ok" ? r.dynamics.recent.kda.value : null);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <PlayerCard side={A} color={C.a} />
        <PlayerCard side={B} color={C.b} />
      </div>

      <div className="flex gap-2.5 rounded-xl border border-line-strong bg-night-900/60 p-3 text-sm text-ink-2">
        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-nexus-cyan" />
        <p>
          Volume de parties analysées : <b className="num text-ink">{ga}</b> pour {A.name} contre <b className="num text-ink">{gb}</b> pour {B.name}.
          {ga !== gb
            ? ratio >= 1.5
              ? " L'écart de volume est important : les indicateurs du joueur ayant le moins de parties sont moins fiables."
              : " Les volumes diffèrent légèrement ; gardez-le en tête en lisant les écarts."
            : " Les volumes sont identiques."}
          {" "}Les parties récentes peuvent concerner des files de jeu différentes (classées, normales, ARAM…). Le point coloré indique simplement la valeur la plus élevée.
        </p>
      </div>
      {mixedDemo && (
        <div className="flex gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="h-4 w-4 text-warn" /> Un des deux profils contient des données fictives (mode démo).
        </div>
      )}

      <Card title="Comparaison des indicateurs" icon={<Scale className="h-4 w-4" />}>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-xs">
                <th className="px-3 py-2 font-semibold" style={{ color: C.a }}>{A.name}</th>
                <th className="px-3 py-2 font-medium text-ink-3">Indicateur</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.b }}>{B.name}</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Rang Solo/Duo" a={formatRank(soloA)} b={formatRank(soloB)} va={rankScore(soloA)} vb={rankScore(soloB)} />
              <Row label="Parties analysées" a={ga} b={gb} va={ga} vb={gb} />
              <Row label="Winrate" note="parties analysées" a={formatPct(A.report.winrate.winrate)} b={formatPct(B.report.winrate.winrate)} va={A.report.winrate.winrate} vb={B.report.winrate.winrate} />
              <Row label="Winrate Solo/Duo" note="bilan de saison" a={formatPct(soloSeasonWinrate(A.profile))} b={formatPct(soloSeasonWinrate(B.profile))} va={soloSeasonWinrate(A.profile)} vb={soloSeasonWinrate(B.profile)} />
              <Row label="KDA moyen" a={formatKda(A.report.kda.kda)} b={formatKda(B.report.kda.kda)} va={kdaVal(A.report)} vb={kdaVal(B.report)} />
              <Row label="Winrate 5 dernières" a={formatPct(recentWinrate(A.report))} b={formatPct(recentWinrate(B.report))} va={recentWinrate(A.report)} vb={recentWinrate(B.report)} />
              <tr>
                <td className="px-3 py-2.5 text-center">{dynamicsBadge(A.report)}</td>
                <td className="px-3 py-2.5 text-center text-xs text-ink-3">Dynamique récente</td>
                <td className="px-3 py-2.5 text-center">{dynamicsBadge(B.report)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Comparatif des winrates" icon={<TrendingUp className="h-4 w-4" />} subtitle="« n/d » : donnée indisponible (non classé ou moins de 10 parties)">
          <CompareBarChart
            nameA={A.name} nameB={B.name} domain={[0, 100]}
            data={[
              { metric: "Parties analysées", a: A.report.winrate.winrate, b: B.report.winrate.winrate, unit: "%" },
              { metric: "Solo/Duo (saison)", a: soloSeasonWinrate(A.profile), b: soloSeasonWinrate(B.profile), unit: "%" },
              { metric: "5 dernières", a: recentWinrate(A.report), b: recentWinrate(B.report), unit: "%" },
            ]}
          />
        </Card>
        <Card title="Comparatif du KDA" icon={<Swords className="h-4 w-4" />} subtitle="KDA agrégé (K + A) / D">
          <CompareBarChart
            nameA={A.name} nameB={B.name}
            data={[
              { metric: "Global", a: kdaVal(A.report), b: kdaVal(B.report) },
              { metric: "5 dernières", a: recentKda(A.report), b: recentKda(B.report) },
              { metric: "5 précédentes", a: A.report.dynamics.status === "ok" ? A.report.dynamics.previous.kda.value : null, b: B.report.dynamics.status === "ok" ? B.report.dynamics.previous.kda.value : null },
            ]}
          />
        </Card>
      </div>

      <Card title="Performances récentes" icon={<TrendingUp className="h-4 w-4" />} subtitle="Winrate glissant sur 5 parties, aligné sur les parties les plus récentes de chaque joueur">
        {seriesA.length >= 2 || seriesB.length >= 2 ? <CompareTrendChart a={seriesA} b={seriesB} nameA={A.name} nameB={B.name} /> : <EmptyNote>Pas assez de parties.</EmptyNote>}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title={`Champions les plus joués — ${A.name}`} icon={<Swords className="h-4 w-4" />}><TopChampions side={A} /></Card>
        <Card title={`Champions les plus joués — ${B.name}`} icon={<Swords className="h-4 w-4" />}><TopChampions side={B} /></Card>
      </div>
    </div>
  );
}
