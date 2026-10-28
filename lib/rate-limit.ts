/**
 * Einfaches Rate-Limit je Schlüssel (hier: Nutzer-ID) mit gleitendem Fenster,
 * im Arbeitsspeicher. Grenzen bei Serverless: Der Zähler gilt je
 * Serverinstanz und geht bei Kaltstart verloren; mehrere Instanzen zählen
 * getrennt. Für /api/geocode (Schutz vor versehentlichen Schleifen und
 * Nominatim-Überlastung) reicht das; für harte Grenzen eine Tabelle nutzen.
 */
export interface RateLimiter {
  /** true, wenn die Anfrage erlaubt ist; zählt sie dann mit. */
  check(key: string): { allowed: boolean; remaining: number; retryAfterSeconds: number };
}

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = options.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();

  return {
    check(key: string) {
      const current = now();
      const windowStart = current - options.windowMs;
      const list = (hits.get(key) ?? []).filter((t) => t > windowStart);
      if (list.length >= options.limit) {
        hits.set(key, list);
        const oldest = list[0];
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - current) / 1000)),
        };
      }
      list.push(current);
      hits.set(key, list);
      // Speicher begrenzen: leere oder alte Schlüssel gelegentlich entfernen.
      if (hits.size > 10_000) {
        for (const [k, v] of hits) {
          if (v.every((t) => t <= windowStart)) hits.delete(k);
        }
      }
      return {
        allowed: true,
        remaining: options.limit - list.length,
        retryAfterSeconds: 0,
      };
    },
  };
}
