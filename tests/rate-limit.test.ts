import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("Rate-Limit (gleitendes Fenster)", () => {
  it("erlaubt bis zur Grenze und blockiert danach mit Retry-After", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => clock });
    expect(limiter.check("u1")).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    clock = 10_000;
    expect(limiter.check("u1").allowed).toBe(true);
    clock = 20_000;
    expect(limiter.check("u1")).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
    clock = 30_000;
    const blocked = limiter.check("u1");
    expect(blocked.allowed).toBe(false);
    // Ältester Treffer bei 0 fällt bei 60 s aus dem Fenster: 30 s warten.
    expect(blocked.retryAfterSeconds).toBe(30);
  });

  it("gibt Anfragen frei, sobald alte aus dem Fenster fallen, und trennt Schlüssel", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => clock });
    limiter.check("a");
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
    clock = 1_001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});
