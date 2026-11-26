import { beforeAll, describe, expect, it } from "vitest";

describe("Client Riot — gestion des erreurs HTTP", () => {
  let riotGet: typeof import("../server/riotClient").riotGet;
  let setFetchImpl: typeof import("../server/riotClient").setFetchImpl;
  beforeAll(async () => {
    process.env.RIOT_API_KEY = "TEST-KEY-NOT-REAL";
    ({ riotGet, setFetchImpl } = await import("../server/riotClient"));
  });

  const respond = (status: number, headers: Record<string, string> = {}) =>
    setFetchImpl(async () => new Response("{}", { status, headers }));

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
  ])("HTTP %i -> %s", async (status, code) => {
    respond(status);
    await expect(riotGet("test.local", `/err/${status}`, 1000)).rejects.toMatchObject({ code });
  });

  it("HTTP 429 avec Retry-After long -> RATE_LIMITED", async () => {
    respond(429, { "Retry-After": "60" });
    await expect(riotGet("rl.local", "/x", 1000)).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfter: 60 });
  });

  it("envoie la clé en en-tête et met la réponse en cache", async () => {
    let calls = 0;
    let header: string | null = null;
    setFetchImpl(async (_url, init) => {
      calls++;
      header = new Headers(init.headers).get("X-Riot-Token");
      return new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    });
    await riotGet("ok.local", "/a", 60_000);
    await riotGet("ok.local", "/a", 60_000);
    expect(calls).toBe(1);
    expect(header).toBe("TEST-KEY-NOT-REAL");
  });
});

describe("Limiteur de débit", () => {
  it("respecte la fenêtre glissante", async () => {
    const { SlidingWindowLimiter } = await import("../server/rateLimiter");
    let t = 0;
    const lim = new SlidingWindowLimiter([{ max: 2, windowMs: 1000 }], 10_000, () => t);
    await lim.acquire();
    await lim.acquire();
    expect(lim.nextDelay()).toBe(1000);
    t = 1000;
    expect(lim.nextDelay()).toBe(0);
  });
});

describe("Routage régional", () => {
  it("associe les serveurs aux bons clusters", async () => {
    const { accountHost, matchHost, platformHost } = await import("../server/routing");
    expect(platformHost("euw1")).toBe("euw1.api.riotgames.com");
    expect(matchHost("euw1")).toBe("europe.api.riotgames.com");
    expect(matchHost("na1")).toBe("americas.api.riotgames.com");
    expect(matchHost("kr")).toBe("asia.api.riotgames.com");
    expect(matchHost("oc1")).toBe("sea.api.riotgames.com");
    expect(accountHost("oc1")).toBe("asia.api.riotgames.com");
  });
});
