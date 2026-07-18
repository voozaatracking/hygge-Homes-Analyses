import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("Sitzungs-Token", () => {
  it("signiert und verifiziert eine Sitzung", async () => {
    const token = await createSessionToken(
      { uid: "u-1", username: "anna", role: "member" },
      "geheimer-schluessel"
    );
    const payload = await verifySessionToken(token, "geheimer-schluessel");
    expect(payload).not.toBeNull();
    expect(payload!.uid).toBe("u-1");
    expect(payload!.username).toBe("anna");
    expect(payload!.role).toBe("member");
  });

  it("lehnt manipulierte Tokens und falsche Schlüssel ab", async () => {
    const token = await createSessionToken(
      { uid: "u-1", username: "anna", role: "member" },
      "geheimer-schluessel"
    );
    expect(await verifySessionToken(token, "anderer-schluessel")).toBeNull();
    expect(
      await verifySessionToken(token.slice(0, -2) + "ab", "geheimer-schluessel")
    ).toBeNull();
    expect(await verifySessionToken("v1.kaputt", "geheimer-schluessel")).toBeNull();
    expect(await verifySessionToken(null, "geheimer-schluessel")).toBeNull();
  });

  it("lehnt abgelaufene Sitzungen ab", async () => {
    const token = await createSessionToken(
      { uid: "u-1", username: "anna", role: "member" },
      "geheimer-schluessel",
      -10
    );
    expect(await verifySessionToken(token, "geheimer-schluessel")).toBeNull();
  });
});

describe("Passwort-Hashing", () => {
  it("verifiziert das richtige Passwort und lehnt falsche ab", async () => {
    const stored = await hashPassword("sicheres-passwort");
    expect(stored.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("sicheres-passwort", stored)).toBe(true);
    expect(await verifyPassword("falsches-passwort", stored)).toBe(false);
    expect(await verifyPassword("sicheres-passwort", "kaputt")).toBe(false);
  });

  it("erzeugt pro Aufruf ein neues Salt", async () => {
    const a = await hashPassword("gleich");
    const b = await hashPassword("gleich");
    expect(a).not.toBe(b);
    expect(await verifyPassword("gleich", a)).toBe(true);
    expect(await verifyPassword("gleich", b)).toBe(true);
  });
});
