import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, BarChart3, GitCompareArrows, History, PieChart, RefreshCw, Sparkles, Swords, TrendingUp } from "lucide-react";
import { isPlatformId } from "../../shared/types";
import { analyze } from "../../shared/analysis/rules";
import { performanceSeries } from "../../shared/analysis/stats";
import { flexRank, soloRank } from "../../shared/analysis/rank";
import { useProfile, pushRecent } from "../lib/hooks";
import { ApiError } from "../lib/api";
import { formatKda, formatPct } from "../lib/format";
import { SearchForm } from "../components/SearchForm";
import { Card, EmptyNote, ErrorState, Loading, StatCard } from "../components/ui";
import { AnalysisPanel, ChampionTable, MasteryList, MatchHistory, ProfileHeader, RankCard } from "../components/profile";
import { ChampionsChart, KdaChart, PerformanceChart, WinLossChart } from "../components/charts";
import { profilePath } from "../lib/api";

export default function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const [reload, setReload] = useState(0);
  const region = params.region && isPlatformId(params.region) ? params.region : null;
  const state = useProfile(region, params.gameName ?? null, params.tagLine ?? null, reload);

  useEffect(() => {
    if (state.status === "success") {
      const { account, region: r } = state.data;
      pushRecent({ region: r, gameName: account.gameName, tagLine: account.tagLine });
      document.title = `${account.gameName}#${account.tagLine} — NEXUS ANALYTICS`;
    }
  }, [state]);

  const profile = state.status === "success" ? state.data : null;
  const report = useMemo(() => (profile ? analyze(profile.matches) : null), [profile]);
  const series = useMemo(() => (profile ? performanceSeries(profile.matches) : []), [profile]);

  const search = (
    <div className="mb-6">
      <SearchForm
        defaultRegion={region ?? "euw1"}
        onSearch={(r, id) => navigate(profilePath(r, id.gameName, id.tagLine))}
      />
    </div>
  );

  if (!region) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {search}
        <ErrorState error={new ApiError("BAD_REQUEST", `Région inconnue : « ${params.region} ».`)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {search}
      {state.status === "loading" && <Loading label={`Récupération du profil ${params.gameName}#${params.tagLine}…`} />}
      {state.status === "error" && <ErrorState error={state.error} onRetry={() => setReload((n) => n + 1)} />}
      {profile && report && (
        <div className="space-y-5">
          <ProfileHeader profile={profile} />

          {profile.warnings.length > 0 && (
            <div className="flex gap-2.5 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <ul className="space-y-0.5">{profile.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <RankCard title="Classée Solo/Duo" entry={soloRank(profile.ranks)} />
            <RankCard title="Classée Flex" entry={flexRank(profile.ranks)} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Parties analysées" value={report.winrate.games} hint={`${profile.matches.length} récupérées${report.excludedRemakes ? `, ${report.excludedRemakes} remake(s) exclu(s)` : ""}`} accent="neutral" />
            <StatCard label="Victoires" value={report.winrate.wins} accent="win" />
            <StatCard label="Défaites" value={report.winrate.losses} accent="loss" />
            <StatCard label="Winrate" value={formatPct(report.winrate.winrate)} hint="sur les parties analysées" accent="cyan" />
            <StatCard label="KDA moyen" value={formatKda(report.kda.kda)} hint={`${report.kda.avgKills} / ${report.kda.avgDeaths} / ${report.kda.avgAssists}`} accent="violet" />
          </div>

          <AnalysisPanel report={report} version={profile.ddragonVersion} />

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Évolution des performances" icon={<TrendingUp className="h-4 w-4" />} subtitle="De la plus ancienne à la plus récente partie analysée">
              {series.length >= 2 ? <PerformanceChart series={series} /> : <EmptyNote>Pas assez de parties pour tracer une évolution.</EmptyNote>}
            </Card>
            <Card title="Victoires / défaites" icon={<PieChart className="h-4 w-4" />} subtitle="Parties analysées (hors remakes)">
              {report.winrate.games > 0 ? <WinLossChart wins={report.winrate.wins} losses={report.winrate.losses} /> : <EmptyNote>Aucune partie.</EmptyNote>}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Évolution du KDA" icon={<BarChart3 className="h-4 w-4" />} subtitle="KDA par partie (plafonné à 10 pour la lisibilité) et moyenne glissante. Lignes : seuils 2 et 4.">
              {series.length >= 2 ? <KdaChart series={series} /> : <EmptyNote>Pas assez de parties pour tracer une évolution.</EmptyNote>}
            </Card>
            <Card title="Champions les plus joués" icon={<Swords className="h-4 w-4" />} subtitle="Nombre de parties analysées">
              {report.champions.champions.length ? <ChampionsChart champions={report.champions.champions} /> : <EmptyNote>Aucune partie.</EmptyNote>}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Statistiques par champion" icon={<Swords className="h-4 w-4" />} subtitle="Toutes files confondues, hors remakes">
              <ChampionTable champions={report.champions.champions} mastery={profile.mastery} version={profile.ddragonVersion} />
            </Card>
            <Card title="Maîtrise des champions" icon={<Sparkles className="h-4 w-4" />} subtitle="Top maîtrise (CHAMPION-MASTERY-V4)">
              <MasteryList mastery={profile.mastery} version={profile.ddragonVersion} />
            </Card>
          </div>

          <Card
            title="Historique des parties"
            icon={<History className="h-4 w-4" />}
            subtitle={`${profile.matches.length} parties les plus récentes`}
            action={
              <div className="flex gap-2">
                <Link to={`/compare?a=${encodeURIComponent(`${profile.account.gameName}#${profile.account.tagLine}`)}&ra=${profile.region}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:text-ink">
                  <GitCompareArrows className="h-3.5 w-3.5" /> Comparer
                </Link>
                <button onClick={() => setReload((n) => n + 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:text-ink">
                  <RefreshCw className="h-3.5 w-3.5" /> Actualiser
                </button>
              </div>
            }
          >
            <MatchHistory matches={profile.matches} version={profile.ddragonVersion} />
          </Card>
        </div>
      )}
    </div>
  );
}
