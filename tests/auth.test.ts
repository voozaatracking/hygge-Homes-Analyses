import { describe, expect, it } from "vitest";
import {
  AUTH_COOKIE,
  authToken,
  hasValidAuthCookie,
  readCookieValue,
  timingSafeEqual,
} from "@/lib/auth";

describe("Auth-Token", () => {
  it("liefert für dasselbe Passwort deterministisch dasselbe Token", async () => {
    const a = await authToken("geheim");
    const b = await authToken("geheim");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("liefert für verschiedene Passwörter verschiedene Tokens", async () => {
    expect(await authToken("geheim")).not.toBe(await authToken("anders"));
  });

  it("vergleicht Strings längenunabhängig sicher", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("Cookie-Prüfung für API-Routen", () => {
  it("liest Cookie-Werte aus einem rohen Header", () => {
    expect(readCookieValue("a=1; hh_auth=xyz; b=2", AUTH_COOKIE)).toBe("xyz");
    expect(readCookieValue("a=1", AUTH_COOKIE)).toBeNull();
    expect(readCookieValue(null, AUTH_COOKIE)).toBeNull();
  });

  it("akzeptiert nur das korrekte Token, wenn ein Passwort gesetzt ist", async () => {
    const previous = process.env.SITE_PASSWORD;
    process.env.SITE_PASSWORD = "testpasswort123";
    try {
      const token = await authToken("testpasswort123");
      expect(await hasValidAuthCookie(`${AUTH_COOKIE}=${token}`)).toBe(true);
      expect(await hasValidAuthCookie(`${AUTH_COOKIE}=falsch`)).toBe(false);
      expect(await hasValidAuthCookie(null)).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.SITE_PASSWORD;
      else process.env.SITE_PASSWORD = previous;
    }
  });
});
