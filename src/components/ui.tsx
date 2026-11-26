import { useState, type ReactNode } from "react";
import { AlertTriangle, Clock, KeyRound, Loader2, RefreshCw, SearchX, ServerCrash, WifiOff } from "lucide-react";
import type { ApiError } from "../lib/api";
import { championIconUrl } from "../lib/format";
import { ErrorBoundary } from "./ErrorBoundary";

export function Card({ children, className = "", title, icon, action, subtitle }: {
  children: ReactNode; className?: string; title?: string; icon?: ReactNode; action?: ReactNode; subtitle?: string;
}) {
  return (
    <section className={`card p-5 animate-fade-up ${className}`}>
      {title && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-wide text-ink">
              {icon && <span className="text-nexus-cyan">{icon}</span>}
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <ErrorBoundary>{children}</ErrorBoundary>
    </section>
  );
}

export function StatCard({ label, value, hint, accent = "cyan", icon }: {
  label: string; value: ReactNode; hint?: ReactNode; accent?: "cyan" | "violet" | "win" | "loss" | "neutral"; icon?: ReactNode;
}) {
  const bar = {
    cyan: "from-nexus-cyan/70", violet: "from-nexus-violet/70", win: "from-win/70", loss: "from-loss/70", neutral: "from-ink-3/50",
  }[accent];
  return (
    <div className="card relative overflow-hidden p-4 animate-fade-up">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar} to-transparent`} />
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">
        {label}
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <div className="num mt-2 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-2">{hint}</div>}
    </div>
  );
}

const BADGE = {
  positive: "border-win/40 bg-win/10 text-emerald-300",
  negative: "border-loss/40 bg-loss/10 text-red-300",
  neutral: "border-line-strong bg-night-700/60 text-ink-2",
  info: "border-nexus-cyan/40 bg-nexus-cyan/10 text-cyan-200",
  warn: "border-warn/40 bg-warn/10 text-amber-200",
  violet: "border-nexus-violet/40 bg-nexus-violet/10 text-violet-200",
};
export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: keyof typeof BADGE; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${BADGE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function ChampionIcon({ version, championKey, name, size = 36 }: {
  version: string | null; championKey: string | null; name: string; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const url = championIconUrl(version, championKey);
  const style = { width: size, height: size };
  if (!url || failed) {
    return (
      <div style={style} className="grid shrink-0 place-items-center rounded-lg border border-line bg-night-700 text-[11px] font-bold text-ink-2" title={name}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url} alt={name} title={name} style={style} loading="lazy" onError={() => setFailed(true)}
      className="shrink-0 rounded-lg border border-line object-cover"
    />
  );
}

export function Loading({ label = "Chargement des données…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-2">
      <Loader2 className="h-8 w-8 animate-spin text-nexus-cyan" />
      <p className="text-sm">{label}</p>
      <p className="max-w-sm text-center text-xs text-ink-3">
        La première recherche d'un joueur peut prendre quelques secondes : les requêtes vers l'API Riot sont espacées pour respecter les limites de débit.
      </p>
    </div>
  );
}

const ERROR_META: Record<string, { icon: ReactNode; title: string }> = {
  NOT_FOUND: { icon: <SearchX className="h-7 w-7" />, title: "Joueur introuvable" },
  BAD_REQUEST: { icon: <AlertTriangle className="h-7 w-7" />, title: "Recherche invalide" },
  UNAUTHORIZED: { icon: <KeyRound className="h-7 w-7" />, title: "Clé API invalide" },
  FORBIDDEN: { icon: <KeyRound className="h-7 w-7" />, title: "Clé API refusée ou expirée" },
  RATE_LIMITED: { icon: <Clock className="h-7 w-7" />, title: "Limite de requêtes atteinte" },
  NETWORK_ERROR: { icon: <WifiOff className="h-7 w-7" />, title: "Problème de connexion" },
  UPSTREAM_ERROR: { icon: <ServerCrash className="h-7 w-7" />, title: "Erreur de l'API Riot" },
};

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const meta = ERROR_META[error.code] ?? ERROR_META.UPSTREAM_ERROR;
  return (
    <div className="card mx-auto my-12 max-w-lg p-8 text-center animate-fade-up">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-loss/30 bg-loss/10 text-red-300">
        {meta.icon}
      </div>
      <h2 className="font-display text-xl font-semibold">{meta.title}</h2>
      <p className="mt-2 text-sm text-ink-2">{error.message}</p>
      {error.retryAfter && <p className="mt-1 text-xs text-ink-3">Réessayez dans environ {error.retryAfter} s.</p>}
      <p className="mt-1 text-[11px] text-ink-3">Code : {error.code}</p>
      {onRetry && error.code !== "NOT_FOUND" && error.code !== "BAD_REQUEST" && (
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line-strong bg-night-700 px-4 py-2 text-sm font-medium hover:border-nexus-cyan/60">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">{children}</p>;
}
