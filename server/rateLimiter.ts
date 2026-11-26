// Limiteur à fenêtres glissantes multiples (ex : 20 req/s ET 100 req/2 min).
// Les limites Riot s'appliquent par hôte de routage : on crée donc un limiteur par hôte.

export interface WindowLimit {
  max: number;
  windowMs: number;
}

export class QueueTimeoutError extends Error {
  constructor(public retryAfterSec: number) {
    super("File d'attente du limiteur saturée");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class SlidingWindowLimiter {
  private stamps: number[] = [];
  private chain: Promise<void> = Promise.resolve();
  private blockedUntil = 0;

  constructor(
    private limits: WindowLimit[],
    private maxWaitMs = 25_000,
    private now: () => number = Date.now,
  ) {}

  /** Attend qu'un créneau soit disponible. Les appels sont servis dans l'ordre d'arrivée. */
  acquire(): Promise<void> {
    const enqueuedAt = this.now();
    const turn = this.chain.then(() => this.waitTurn(enqueuedAt));
    this.chain = turn.catch(() => undefined);
    return turn;
  }

  /** Bloque toutes les requêtes (utilisé quand Riot renvoie un 429 avec Retry-After). */
  pause(ms: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, this.now() + ms);
  }

  /** Délai (ms) avant le prochain créneau libre, 0 si disponible immédiatement. */
  nextDelay(): number {
    const now = this.now();
    const longest = Math.max(...this.limits.map((l) => l.windowMs));
    this.stamps = this.stamps.filter((t) => now - t < longest);
    let wait = Math.max(0, this.blockedUntil - now);
    for (const limit of this.limits) {
      const inWindow = this.stamps.filter((t) => now - t < limit.windowMs);
      if (inWindow.length >= limit.max) {
        // inWindow est trié : le plus ancien libère le prochain créneau
        const idx = inWindow.length - limit.max;
        wait = Math.max(wait, inWindow[idx] + limit.windowMs - now);
      }
    }
    return wait;
  }

  private async waitTurn(enqueuedAt: number): Promise<void> {
    for (;;) {
      const wait = this.nextDelay();
      if (wait <= 0) {
        this.stamps.push(this.now());
        return;
      }
      if (this.now() + wait - enqueuedAt > this.maxWaitMs) {
        throw new QueueTimeoutError(Math.ceil(wait / 1000));
      }
      await sleep(wait + 10);
    }
  }
}
