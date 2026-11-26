import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { REGIONS, type PlatformId } from "../../shared/types";
import { parseRiotId, type RiotId } from "../../shared/riotId";

export function RegionSelect({ value, onChange, id }: { value: PlatformId; onChange: (r: PlatformId) => void; id?: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as PlatformId)}
      aria-label="Région"
      className="h-full cursor-pointer rounded-lg border border-line bg-night-800 px-3 text-sm font-semibold text-ink outline-none focus:border-nexus-cyan/70"
    >
      {REGIONS.map((r) => (
        <option key={r.id} value={r.id}>{r.label} — {r.name}</option>
      ))}
    </select>
  );
}

/** Champ Riot ID + région, réutilisé sur l'accueil et le comparateur. */
export function RiotIdField({ value, onChange, region, onRegion, placeholder = "Pseudo#TAG", error, size = "lg", inputId }: {
  value: string; onChange: (v: string) => void; region: PlatformId; onRegion: (r: PlatformId) => void;
  placeholder?: string; error?: string | null; size?: "lg" | "md"; inputId?: string;
}) {
  const h = size === "lg" ? "h-14" : "h-12";
  return (
    <div>
      <div className={`flex ${h} gap-2 rounded-xl border bg-night-900/90 p-1.5 transition-colors ${error ? "border-loss/60" : "border-line-strong focus-within:border-nexus-cyan/70"}`}>
        <RegionSelect value={region} onChange={onRegion} />
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Riot ID (Pseudo#TAG)"
          aria-invalid={Boolean(error)}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      {error && <p role="alert" className="mt-2 text-left text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function SearchForm({ onSearch, defaultRegion = "euw1" }: {
  onSearch: (region: PlatformId, id: RiotId) => void; defaultRegion?: PlatformId;
}) {
  const [value, setValue] = useState("");
  const [region, setRegion] = useState<PlatformId>(defaultRegion);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRiotId(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onSearch(region, parsed.value);
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <RiotIdField value={value} onChange={(v) => { setValue(v); if (error) setError(null); }} region={region} onRegion={setRegion} error={error} inputId="riot-id" />
      </div>
      <button
        type="submit"
        className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-7 font-display text-base font-semibold text-white shadow-[0_0_30px_-8px_rgb(139_92_246/0.8)] transition hover:brightness-110 active:scale-[0.98]"
      >
        <Search className="h-5 w-5" /> Rechercher
      </button>
    </form>
  );
}
