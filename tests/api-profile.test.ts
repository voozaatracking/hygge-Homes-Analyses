import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileRow } from "@/lib/access";

/** Route-Tests für /api/profile mit gemocktem Supabase: 401, 403, 200, 400. */

const state: {
  user: { id: string; email: string } | null;
  profile: (ProfileRow & { settings?: unknown }) | null;
  updates: Record<string, unknown>[];
} = { user: null, profile: null, updates: [] };

function profile(overrides: Partial<ProfileRow & { settings?: unknown }> = {}) {
  return {
    id: "auth-1",
    email: "a@example.com",
    display_name: "Anna",
    role: "member" as const,
    plan: "internal" as const,
    plan_valid_until: null,
    active: true,
    settings: { company: { name: "Hygge" } },
    ...overrides,
  };
}

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.user },
        error: state.user ? null : { message: "keine Sitzung" },
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  ANALYSIS_TABLE: "analysis_state",
  PROFILES_TABLE: "profiles",
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: null }) }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => {
              state.updates.push(patch);
              if (!state.profile) return { data: null, error: null };
              Object.assign(state.profile, patch);
              return {
                data: { display_name: state.profile.display_name, settings: state.profile.settings },
                error: null,
              };
            },
          }),
        }),
      }),
    }),
  }),
}));

import { GET, PUT } from "@/app/api/profile/route";

const put = (body: unknown) =>
  new Request("http://localhost/api/profile", { method: "PUT", body: JSON.stringify(body) });

describe("/api/profile", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    state.updates = [];
  });

  it("401 ohne Sitzung, 403 ohne Zugang", async () => {
    expect((await GET()).status).toBe(401);
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile({ plan: "none" });
    expect((await GET()).status).toBe(403);
    expect((await PUT(put({ displayName: "x" }))).status).toBe(403);
  });

  it("liefert Profil mit vollständig aufgefüllten Einstellungen", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      displayName: string;
      email: string;
      plan: string;
      settings: { company: { name: string; city: string }; defaults: { cleaning: { hourlyWage: number } } };
    };
    expect(body.displayName).toBe("Anna");
    expect(body.plan).toBe("internal");
    expect(body.settings.company.name).toBe("Hygge");
    expect(body.settings.company.city).toBe("");
    expect(body.settings.defaults.cleaning.hourlyWage).toBe(22);
  });

  it("speichert Anzeigename und Einstellungen", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const response = await PUT(
      put({ displayName: "  Anna B.  ", settings: { hq: { address: "Lüneburg", lat: 53.2, lng: 10.4 } } })
    );
    expect(response.status).toBe(200);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].display_name).toBe("Anna B.");
    const saved = state.updates[0].settings as { hq: { lat: number }; company: { name: string } };
    expect(saved.hq.lat).toBe(53.2);
    // Nicht übermittelte Felder stehen mit Defaults im gespeicherten JSON.
    expect(saved.company.name).toBe("");
  });

  it("400 bei ungültigen Einstellungen, leerem Body oder falschem Namen", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const invalid = await PUT(put({ settings: { defaults: { revenue: { platformCommissionPct: "viel" } } } }));
    expect(invalid.status).toBe(400);
    expect((await PUT(put({}))).status).toBe(400);
    expect((await PUT(put({ displayName: 42 }))).status).toBe(400);
    expect((await PUT(put({ displayName: "x".repeat(121) }))).status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });
});
