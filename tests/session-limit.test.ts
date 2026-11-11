import { describe, expect, it } from "vitest";
import {
  createSessionStartToken,
  effectiveSessionStart,
  isSessionExpired,
  verifySessionStartToken,
} from "@/lib/session-limit";
import { SESSION_MAX_HOURS, SESSION_MAX_MS } from "@/lib/config/session";

const T0 = Date.parse("2026-11-11T08:00:00Z");
const H = 60 * 60 * 1000;

describe("Höchstdauer der Sitzung", () => {
  it("ist auf 12 Stunden festgelegt", () => {
    expect(SESSION_MAX_HOURS).toBe(12);
    expect(SESSION_MAX_MS).toBe(12 * H);
  });

  it("läuft vor 12 Stunden nicht und ab 12 Stunden ab", () => {
    expect(isSessionExpired(T0, T0 + 11 * H + 59 * 60 * 1000)).toBe(false);
    expect(isSessionExpired(T0, T0 + 12 * H)).toBe(true);
    expect(isSessionExpired(T0, T0 + 30 * H)).toBe(true);
    expect(isSessionExpired(null, T0 + 100 * H)).toBe(false);
  });

  it("verschiebt die Grenze durch Token-Refresh nicht (gleiche session_id, neue Tokens)", () => {
    const cookie = { sid: "sess-1", startedAt: T0 };
    // Nach mehreren Refreshes ändert sich nur das Token, nicht die session_id.
    const start = effectiveSessionStart({ cookie, sid: "sess-1", lastSignInAt: null });
    expect(start).toBe(T0);
    expect(isSessionExpired(start, T0 + 13 * H)).toBe(true);
  });

  it("ignoriert ein Cookie einer anderen Sitzung und nutzt dann last_sign_in_at", () => {
    const cookie = { sid: "sess-alt", startedAt: T0 - 20 * H };
    const start = effectiveSessionStart({
      cookie,
      sid: "sess-neu",
      lastSignInAt: new Date(T0).toISOString(),
    });
    expect(start).toBe(T0);
  });

  it("nimmt den früheren Zeitpunkt, damit ein gelöschtes Cookie nichts verlängert", () => {
    // Cookie gelöscht: nur last_sign_in_at bleibt.
    expect(
      effectiveSessionStart({ cookie: null, sid: "s", lastSignInAt: new Date(T0).toISOString() })
    ).toBe(T0);
    // Cookie später neu gesetzt: last_sign_in_at ist älter und zählt.
    expect(
      effectiveSessionStart({
        cookie: { sid: "s", startedAt: T0 + 5 * H },
        sid: "s",
        lastSignInAt: new Date(T0).toISOString(),
      })
    ).toBe(T0);
    // Keine Quelle: kein Ablauf.
    expect(effectiveSessionStart({ cookie: null, sid: null, lastSignInAt: null })).toBeNull();
  });

  it("signiert das Cookie und lehnt Manipulation und falsche Schlüssel ab", async () => {
    const token = await createSessionStartToken({ sid: "s", startedAt: T0 }, "geheim");
    expect(await verifySessionStartToken(token, "geheim")).toEqual({ sid: "s", startedAt: T0 });
    expect(await verifySessionStartToken(token, "anders")).toBeNull();
    const [v, body, sig] = token.split(".");
    expect(await verifySessionStartToken(`${v}.${body}x.${sig}`, "geheim")).toBeNull();
    expect(await verifySessionStartToken("kaputt", "geheim")).toBeNull();
    expect(await verifySessionStartToken(undefined, "geheim")).toBeNull();
  });
});
