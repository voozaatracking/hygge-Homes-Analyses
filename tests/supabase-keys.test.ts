import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyKey,
  isPublicKey,
  isServiceKey,
  readPublicKey,
  readServiceKey,
} from "@/lib/supabase/keys";

const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abc_DEF-123";

describe("Supabase-Schlüsselformate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("erkennt alte JWT-Schlüssel und neue sb_-Schlüssel", () => {
    expect(classifyKey(JWT)).toBe("legacy-jwt");
    expect(classifyKey("sb_publishable_abc123")).toBe("publishable");
    expect(classifyKey("sb_secret_abc123")).toBe("secret");
    expect(classifyKey("irgendwas")).toBe("invalid");
    expect(classifyKey("")).toBe("invalid");
    expect(classifyKey(undefined)).toBe("invalid");
  });

  it("akzeptiert für Browser und Auth anon-JWT und sb_publishable_, nicht sb_secret_", () => {
    expect(isPublicKey(JWT)).toBe(true);
    expect(isPublicKey("sb_publishable_x")).toBe(true);
    expect(isPublicKey("sb_secret_x")).toBe(false);
  });

  it("akzeptiert als Serverschlüssel service_role-JWT und sb_secret_, nicht sb_publishable_", () => {
    expect(isServiceKey(JWT)).toBe(true);
    expect(isServiceKey("sb_secret_x")).toBe(true);
    expect(isServiceKey("sb_publishable_x")).toBe(false);
  });

  it("liefert bei falschem Zweck null mit Konsolenhinweis, sonst den getrimmten Schlüssel", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(readPublicKey(" sb_publishable_x ")).toBe("sb_publishable_x");
    expect(readServiceKey(" sb_secret_x ")).toBe("sb_secret_x");
    expect(readPublicKey("sb_secret_x")).toBeNull();
    expect(readServiceKey("sb_publishable_x")).toBeNull();
    expect(readPublicKey(undefined)).toBeNull();
    expect(error).toHaveBeenCalledTimes(2);
  });
});
