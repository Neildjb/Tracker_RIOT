import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { FlaskConical, Menu, X } from "lucide-react";
import { useApiStatus } from "../lib/hooks";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="NEXUS ANALYTICS — accueil">
      <svg viewBox="0 0 64 64" className="h-8 w-8 transition-transform group-hover:rotate-6" aria-hidden>
        <defs>
          <linearGradient id="nx-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d="M32 6 56 19v26L32 58 8 45V19Z" fill="#0b0e22" stroke="url(#nx-g)" strokeWidth="3.5" />
        <path d="M22 42V22l20 20V22" fill="none" stroke="#e7e9ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="2.6" fill="#22d3ee" />
      </svg>
      {!compact && (
        <span className="font-display text-[15px] font-bold leading-none tracking-[0.18em]">
          NEXUS<span className="ml-1.5 font-medium text-ink-3">ANALYTICS</span>
        </span>
      )}
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Accueil", end: true },
  { to: "/compare", label: "Comparateur" },
  { to: "/analyses", label: "Méthode d'analyse" },
  { to: "/ethique", label: "Éthique & transparence" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const status = useApiStatus();
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-night-700 text-ink" : "text-ink-2 hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-void/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
                status.mode === "live" ? "border-win/40 text-emerald-300" : "border-warn/50 text-amber-200"
              }`}
              title={status.mode === "live" ? "Connecté à l'API Riot Games" : "Aucune clé API : données fictives"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.mode === "live" ? "bg-win" : "bg-warn"}`} />
              {status.mode === "live" ? "API Riot connectée" : "Mode démo"}
            </span>
          )}
          <button className="rounded-md p-2 text-ink-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link} onClick={() => setOpen(false)}>{n.label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

export function DemoBanner() {
  const status = useApiStatus();
  if (!status || status.mode === "live") return null;
  return (
    <div className="border-b border-warn/40 bg-warn/10">
      <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-2.5 text-[13px] text-amber-100 sm:px-6">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <p>
          <strong>MODE DÉMONSTRATION</strong> — aucune clé <code className="num text-xs">RIOT_API_KEY</code> n'est configurée sur le serveur.
          Les profils affichés sont <strong>fictifs</strong>, générés pour illustrer l'interface, et ne correspondent à aucun joueur réel.
        </p>
      </div>
    </div>
  );
}

export const RIOT_DISCLAIMER =
  "NEXUS ANALYTICS isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

function Footer() {
  return (
    <footer className="mt-16 border-t border-line/70 bg-night-950/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-3">
            Outil d'analyse et d'aide à la progression pour League of Legends, alimenté par les API officielles de Riot Games.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-2 font-display font-semibold text-ink-2">Navigation</h3>
          <ul className="space-y-1.5 text-ink-3">
            {NAV.map((n) => (
              <li key={n.to}><Link className="hover:text-ink" to={n.to}>{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="mb-2 font-display font-semibold text-ink-2">Mentions légales</h3>
          <p id="disclaimer" className="text-xs leading-relaxed text-ink-3">{RIOT_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <DemoBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
