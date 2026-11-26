import { describe, expect, it } from "vitest";
import type { MatchSummary } from "../shared/types";
import { aggregateKda, computeKda, computeWinrate, performanceSeries } from "../shared/analysis/stats";
import {
  analyzeChampions, analyzeDynamics, analyzeKda, analyzeWinrate, classifyKda, classifyWinrate, currentStreak,
} from "../shared/analysis/rules";
import { rankScore } from "../shared/analysis/rank";

let seq = 0;
function m(win: boolean, k = 5, d = 5, a = 5, extra: Partial<MatchSummary> = {}): MatchSummary {
  seq++;
  return {
    matchId: `M${seq}`, queueId: 420, queueName: "Classée Solo/Duo", gameMode: "CLASSIC",
    // chaque appel crée une partie plus ancienne que la précédente (tableaux du plus récent au plus ancien)
    gameCreation: 1_700_000_000_000 - seq * 3_600_000,
    gameDuration: 1800, remake: false, championId: 1, championName: "Ahri", championKey: "Ahri",
    kills: k, deaths: d, assists: a, win, position: "MIDDLE", cs: 200, visionScore: 20, goldEarned: 10000,
    damageToChampions: 20000, ...extra,
  };
}

describe("Règle 1 — winrate", () => {
  it("calcule victoires / parties × 100", () => {
    expect(computeWinrate(3, 4)).toBe(75);
    expect(computeWinrate(0, 0)).toBeNull();
  });
  it("applique les seuils 55 / 45", () => {
    expect(classifyWinrate(55.1)).toBe("positive");
    expect(classifyWinrate(55)).toBe("balanced");
    expect(classifyWinrate(45)).toBe("balanced");
    expect(classifyWinrate(44.9)).toBe("negative");
  });
  it("exclut les remakes et signale un petit échantillon", () => {
    const r = analyzeWinrate([m(true), m(true), m(false), m(false, 0, 0, 0, { remake: true })]);
    expect(r.games).toBe(3);
    expect(r.winrate).toBe(66.7);
    expect(r.trend).toBe("positive");
    expect(r.smallSample).toBe(true);
  });
  it("ne renvoie pas de valeur inventée sans partie", () => {
    expect(analyzeWinrate([]).winrate).toBeNull();
  });
});

describe("Règle 3 — KDA", () => {
  it("calcule (K + A) / D", () => {
    expect(computeKda(4, 2, 6)).toEqual({ value: 5, perfect: false });
  });
  it("gère deaths = 0 sans erreur", () => {
    expect(computeKda(3, 0, 7)).toEqual({ value: 10, perfect: true });
    expect(computeKda(0, 0, 0)).toEqual({ value: 0, perfect: true });
  });
  it("agrège sur la somme des parties", () => {
    expect(aggregateKda([m(true, 10, 0, 0), m(false, 0, 5, 0)])!.value).toBe(2);
  });
  it("classe selon les seuils 4 / 2", () => {
    expect(classifyKda(4)).toBe("excellent");
    expect(classifyKda(3.99)).toBe("intermediate");
    expect(classifyKda(2)).toBe("intermediate");
    expect(classifyKda(1.99)).toBe("improve");
  });
  it("inclut la mise en garde", () => {
    expect(analyzeKda([m(true)]).caveat).toMatch(/ne détermine pas/);
  });
});

describe("Règle 2 — champions", () => {
  it("n'affiche aucune tendance sous 5 parties", () => {
    const r = analyzeChampions([m(true), m(true), m(true), m(true)]);
    expect(r.best).toHaveLength(0);
    expect(r.champions[0].reliable).toBe(false);
    expect(r.message).toMatch(/Aucun champion/);
  });
  it("groupe, calcule et classe les champions fiables", () => {
    const jinx = { championKey: "Jinx", championName: "Jinx", championId: 222 };
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => m(i < 4, 6, 2, 6, jinx)), // Jinx 80 %
      ...Array.from({ length: 6 }, (_, i) => m(i < 3)), // Ahri 50 %
      m(true, 20, 0, 20, { championKey: "Lux", championName: "Lux", championId: 99 }), // 1 seule partie
    ];
    const r = analyzeChampions(matches);
    expect(r.mostPlayed[0].championKey).toBe("Ahri");
    expect(r.best.map((c) => c.championKey)).toEqual(["Jinx", "Ahri"]);
    const j = r.champions.find((c) => c.championKey === "Jinx")!;
    expect(j.winrate).toBe(80);
    expect(j.kda.value).toBe(6);
  });
});

describe("Règle 4 — dynamique", () => {
  it("refuse de conclure avec moins de 10 parties", () => {
    const r = analyzeDynamics(Array.from({ length: 9 }, () => m(true)));
    expect(r.status).toBe("insufficient");
  });
  it("détecte une progression positive", () => {
    const recent = [m(true, 8, 2, 8), m(true, 8, 2, 8), m(true, 8, 2, 8), m(false, 8, 2, 8), m(true, 8, 2, 8)];
    const previous = [m(false, 2, 6, 2), m(false, 2, 6, 2), m(true, 2, 6, 2), m(false, 2, 6, 2), m(false, 2, 6, 2)];
    const r = analyzeDynamics([...recent, ...previous]);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.recent.winrate).toBe(80);
    expect(r.previous.winrate).toBe(20);
    expect(r.winrateDelta).toBe(60);
    expect(r.conclusion).toBe("positive");
    expect(r.currentStreak).toEqual({ type: "win", length: 3 });
  });
  it("détecte une baisse", () => {
    const recent = Array.from({ length: 5 }, () => m(false, 1, 8, 2));
    const previous = Array.from({ length: 5 }, () => m(true, 7, 3, 7));
    const r = analyzeDynamics([...recent, ...previous]);
    expect(r.status === "ok" && r.conclusion).toBe("negative");
  });
  it("conclut à la stabilité sans écart significatif", () => {
    const block = () => [m(true), m(false), m(true), m(false), m(true)];
    const r = analyzeDynamics([...block(), ...block()]);
    expect(r.status === "ok" && r.conclusion).toBe("stable");
  });
  it("calcule la série en cours", () => {
    expect(currentStreak([m(false), m(false), m(true)])).toEqual({ type: "loss", length: 2 });
    expect(currentStreak([])).toBeNull();
  });
});

describe("Séries et rangs", () => {
  it("produit une série chronologique", () => {
    const s = performanceSeries([m(true), m(false), m(true)]);
    expect(s).toHaveLength(3);
    expect(s[0].date).toBeLessThan(s[2].date);
    expect(s[2].cumulativeWinrate).toBe(66.7);
  });
  it("ordonne les rangs", () => {
    const base = { queueType: "RANKED_SOLO_5x5", wins: 0, losses: 0, hotStreak: false };
    const g = rankScore({ ...base, tier: "GOLD", rank: "I", leaguePoints: 10 })!;
    const p = rankScore({ ...base, tier: "PLATINUM", rank: "IV", leaguePoints: 0 })!;
    expect(p).toBeGreaterThan(g);
  });
});
