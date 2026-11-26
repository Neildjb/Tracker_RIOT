// Graphiques Recharts. Palette validée (contraste ≥ 3:1 et séparation daltonisme) sur la surface #0f1229.
// L'identité n'est jamais portée par la couleur seule : légendes + libellés + infobulles.
import type { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { SeriesPoint } from "../../shared/analysis/stats";
import type { ChampionStats } from "../../shared/analysis/rules";
import { formatDate } from "../lib/format";

export const C = {
  a: "#0ea5b7",
  b: "#8b5cf6",
  win: "#10a37f",
  loss: "#e5484d",
  grid: "#252a52",
  axis: "#343a6b",
  surface: "#0f1229",
  muted: "#767ba6",
};

const axisProps = { stroke: C.axis, tickLine: false, axisLine: { stroke: C.axis } } as const;

function TooltipBox({ title, rows }: { title?: ReactNode; rows: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-lg border border-line-strong bg-night-900/95 px-3 py-2 text-xs shadow-xl">
      {title && <div className="mb-1.5 font-semibold text-ink">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="num font-semibold text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// 1. Évolution des performances (winrate glissant sur 5 parties + winrate cumulé)
export function PerformanceChart({ series }: { series: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="index" {...axisProps} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" {...axisProps} />
        <ReferenceLine y={50} stroke={C.muted} strokeDasharray="4 4" />
        <Tooltip
          cursor={{ stroke: C.muted, strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as SeriesPoint;
            return (
              <TooltipBox
                title={`Partie ${p.index} · ${p.champion} · ${p.win ? "Victoire" : "Défaite"}`}
                rows={[
                  { label: "Winrate glissant (5)", value: `${p.rollingWinrate} %`, color: C.a },
                  { label: "Winrate cumulé", value: `${p.cumulativeWinrate} %`, color: C.b },
                  { label: "Date", value: formatDate(p.date) },
                ]}
              />
            );
          }}
        />
        <Legend verticalAlign="top" height={28} iconType="plainline" />
        <Line type="monotone" dataKey="rollingWinrate" name="Winrate glissant (5 parties)" stroke={C.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
        <Line type="monotone" dataKey="cumulativeWinrate" name="Winrate cumulé" stroke={C.b} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 2. Répartition victoires / défaites (donut)
export function WinLossChart({ wins, losses }: { wins: number; losses: number }) {
  const data = [
    { name: "Victoires", value: wins, color: C.win },
    { name: "Défaites", value: losses, color: C.loss },
  ];
  const total = wins + losses;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={2} stroke={C.surface} strokeWidth={2} startAngle={90} endAngle={-270}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return <TooltipBox rows={[{ label: d.name, value: `${d.value} (${total ? Math.round((d.value / total) * 100) : 0} %)`, color: d.color }]} />;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="num text-2xl font-bold">{total ? Math.round((wins / total) * 100) : 0}%</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-3">{total} parties</div>
        </div>
      </div>
      <div className="mt-1 flex justify-center gap-5 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.win }} /> Victoires <b className="num text-ink">{wins}</b></span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.loss }} /> Défaites <b className="num text-ink">{losses}</b></span>
      </div>
    </div>
  );
}

// 3. Champions les plus joués (barres horizontales, une seule série)
export function ChampionsChart({ champions }: { champions: ChampionStats[] }) {
  const data = champions.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 4 }} barCategoryGap={6}>
        <CartesianGrid stroke={C.grid} strokeDasharray="3 4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="championName" width={92} {...axisProps} tick={{ fill: "#a9aed6", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "rgb(139 92 246 / 0.08)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const c = payload[0].payload as ChampionStats;
            return (
              <TooltipBox
                title={c.championName}
                rows={[
                  { label: "Parties", value: c.games, color: C.a },
                  { label: "Winrate", value: `${c.winrate} %` },
                  { label: "KDA", value: c.kda.perfect ? "Parfait" : c.kda.value },
                  { label: "Fiabilité", value: c.reliable ? "≥ 5 parties" : "échantillon < 5" },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="games" name="Parties" fill={C.a} radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: "right", fill: "#a9aed6", fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 5. Évolution du KDA : KDA par partie (barres victoire/défaite) + KDA glissant sur 5 parties
const KDA_CAP = 10;
export function KdaChart({ series }: { series: SeriesPoint[] }) {
  const data = series.map((p) => ({ ...p, kdaDisplay: Math.min(p.kda, KDA_CAP) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }} barCategoryGap={3}>
        <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="index" {...axisProps} />
        <YAxis domain={[0, KDA_CAP]} ticks={[0, 2, 4, 6, 8, 10]} {...axisProps} />
        <ReferenceLine y={4} stroke={C.win} strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: "4", fill: C.muted, fontSize: 10, position: "right" }} />
        <ReferenceLine y={2} stroke={C.loss} strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: "2", fill: C.muted, fontSize: 10, position: "right" }} />
        <Tooltip
          cursor={{ fill: "rgb(139 92 246 / 0.08)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as SeriesPoint;
            return (
              <TooltipBox
                title={`Partie ${p.index} · ${p.champion}`}
                rows={[
                  { label: p.win ? "Victoire" : "Défaite", value: p.perfect ? `Parfait (${p.kda})` : p.kda, color: p.win ? C.win : C.loss },
                  { label: "KDA glissant (5)", value: p.rollingKda, color: C.b },
                  { label: "Date", value: formatDate(p.date) },
                ]}
              />
            );
          }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          payload={[
            { value: "KDA — victoire", type: "square", color: C.win },
            { value: "KDA — défaite", type: "square", color: C.loss },
            { value: "KDA glissant (5 parties)", type: "line", color: C.b },
          ]}
        />
        <Bar dataKey="kdaDisplay" name="KDA" radius={[4, 4, 0, 0]} maxBarSize={18}>
          {data.map((p) => <Cell key={p.matchId} fill={p.win ? C.win : C.loss} fillOpacity={0.85} />)}
        </Bar>
        <Line type="monotone" dataKey="rollingKda" name="KDA glissant" stroke={C.b} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 4. Comparatif (barres groupées, deux joueurs)
export interface CompareDatum { metric: string; a: number | null; b: number | null; unit?: string }
export function CompareBarChart({ data, nameA, nameB, domain }: { data: CompareDatum[]; nameA: string; nameB: string; domain?: [number, number] }) {
  const unit = data[0]?.unit ?? "";
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }} barCategoryGap="28%" barGap={2}>
        <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="metric" {...axisProps} tick={{ fill: "#a9aed6", fontSize: 11 }} />
        <YAxis domain={domain ?? [0, "auto"]} unit={unit} {...axisProps} />
        {unit === "%" && <ReferenceLine y={50} stroke={C.muted} strokeDasharray="4 4" />}
        <Tooltip
          cursor={{ fill: "rgb(139 92 246 / 0.08)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CompareDatum;
            const fmt = (v: number | null) => (v === null ? "n/d" : `${v}${d.unit ? ` ${d.unit}` : ""}`);
            return <TooltipBox title={d.metric} rows={[{ label: nameA, value: fmt(d.a), color: C.a }, { label: nameB, value: fmt(d.b), color: C.b }]} />;
          }}
        />
        <Legend verticalAlign="top" height={28} iconType="square" />
        <Bar dataKey="a" name={nameA} fill={C.a} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="b" name={nameB} fill={C.b} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompareTrendChart({ a, b, nameA, nameB }: { a: SeriesPoint[]; b: SeriesPoint[]; nameA: string; nameB: string }) {
  const len = Math.max(a.length, b.length);
  // Aligne les deux séries sur leurs parties les plus récentes (index relatif).
  const data = Array.from({ length: len }, (_, i) => ({
    index: i + 1,
    a: a[a.length - len + i]?.rollingWinrate ?? null,
    b: b[b.length - len + i]?.rollingWinrate ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="index" {...axisProps} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" {...axisProps} />
        <ReferenceLine y={50} stroke={C.muted} strokeDasharray="4 4" />
        <Tooltip
          cursor={{ stroke: C.muted, strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof data)[number];
            return (
              <TooltipBox
                title={`Position ${d.index} (la plus récente = ${len})`}
                rows={[
                  { label: nameA, value: d.a === null ? "n/d" : `${d.a} %`, color: C.a },
                  { label: nameB, value: d.b === null ? "n/d" : `${d.b} %`, color: C.b },
                ]}
              />
            );
          }}
        />
        <Legend verticalAlign="top" height={28} iconType="plainline" />
        <Line type="monotone" dataKey="a" name={nameA} stroke={C.a} strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="b" name={nameB} stroke={C.b} strokeWidth={2} dot={false} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
