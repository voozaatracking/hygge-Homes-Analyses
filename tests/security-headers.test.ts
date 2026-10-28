import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  detectEnv,
} from "@/lib/security-headers";

describe("Security-Header", () => {
  it("erlaubt Supabase und Nominatim in connect-src und verbietet Einbettung", () => {
    const csp = buildContentSecurityPolicy({
      supabaseUrl: "https://abc.supabase.co",
      env: "production",
    });
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co https://nominatim.openstreetmap.org");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("vercel.live");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("fällt ohne Supabase-URL auf *.supabase.co zurück", () => {
    const csp = buildContentSecurityPolicy({ supabaseUrl: null, env: "production" });
    expect(csp).toContain("https://*.supabase.co");
  });

  it("lässt in Preview die Vercel-Toolbar zu und in Entwicklung React Refresh", () => {
    const preview = buildContentSecurityPolicy({ supabaseUrl: null, env: "preview" });
    expect(preview).toContain("script-src 'self' 'unsafe-inline' https://vercel.live");
    expect(preview).toContain("frame-src https://vercel.live");
    const dev = buildContentSecurityPolicy({ supabaseUrl: null, env: "development" });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("setzt HSTS nur in Produktion und die übrigen Header immer", () => {
    const prod = buildSecurityHeaders({ supabaseUrl: null, env: "production" });
    const keys = prod.map((h) => h.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ]);
    const preview = buildSecurityHeaders({ supabaseUrl: null, env: "preview" });
    expect(preview.map((h) => h.key)).not.toContain("Strict-Transport-Security");
  });

  it("leitet die Umgebung aus Vercel- und Node-Variablen ab", () => {
    expect(detectEnv("production", "production")).toBe("production");
    expect(detectEnv("preview", "production")).toBe("preview");
    expect(detectEnv(undefined, "production")).toBe("production");
    expect(detectEnv(undefined, "development")).toBe("development");
  });
});
