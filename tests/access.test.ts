import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeAccess,
  getAccess,
  toPublicAccess,
  type ProfileRow,
} from "@/lib/access";

const NOW = new Date("2026-10-28T12:00:00Z");
const FUTURE = "2027-01-01T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";

function profile(overrides: Partial<ProfileRow>): ProfileRow {
  return {
    id: "user-1",
    email: "test@example.com",
    display_name: null,
    role: "member",
    plan: "none",
    plan_valid_until: null,
    active: true,
    ...overrides,
  };
}

describe("Zugriffsregel (computeAccess)", () => {
  // Vollständige Matrix aus role, plan, plan_valid_until und active.
  const cases: {
    role: ProfileRow["role"];
    plan: ProfileRow["plan"];
    validUntil: string | null;
    active: boolean;
    hasAccess: boolean;
  }[] = [
    // Admin: immer Zugang, solange aktiv, unabhängig vom Plan.
    { role: "admin", plan: "none", validUntil: null, active: true, hasAccess: true },
    { role: "admin", plan: "internal", validUntil: null, active: true, hasAccess: true },
    { role: "admin", plan: "pro", validUntil: PAST, active: true, hasAccess: true },
    { role: "admin", plan: "pro", validUntil: FUTURE, active: true, hasAccess: true },
    { role: "admin", plan: "none", validUntil: null, active: false, hasAccess: false },
    { role: "admin", plan: "internal", validUntil: null, active: false, hasAccess: false },
    // Mitglied ohne Plan: kein Zugang.
    { role: "member", plan: "none", validUntil: null, active: true, hasAccess: false },
    { role: "member", plan: "none", validUntil: FUTURE, active: true, hasAccess: false },
    { role: "member", plan: "none", validUntil: null, active: false, hasAccess: false },
    // Mitglied intern: Zugang, Gültigkeitsdatum irrelevant.
    { role: "member", plan: "internal", validUntil: null, active: true, hasAccess: true },
    { role: "member", plan: "internal", validUntil: PAST, active: true, hasAccess: true },
    { role: "member", plan: "internal", validUntil: null, active: false, hasAccess: false },
    // Mitglied pro: Zugang nur ohne Datum oder mit Datum in der Zukunft.
    { role: "member", plan: "pro", validUntil: null, active: true, hasAccess: true },
    { role: "member", plan: "pro", validUntil: FUTURE, active: true, hasAccess: true },
    { role: "member", plan: "pro", validUntil: PAST, active: true, hasAccess: false },
    { role: "member", plan: "pro", validUntil: FUTURE, active: false, hasAccess: false },
    { role: "member", plan: "pro", validUntil: null, active: false, hasAccess: false },
  ];

  for (const c of cases) {
    it(`${c.role} / ${c.plan} / ${c.validUntil ?? "ohne Datum"} / ${c.active ? "aktiv" : "deaktiviert"} → ${c.hasAccess ? "Zugang" : "kein Zugang"}`, () => {
      const access = computeAccess(
        profile({
          role: c.role,
          plan: c.plan,
          plan_valid_until: c.validUntil,
          active: c.active,
        }),
        NOW
      );
      expect(access.hasAccess).toBe(c.hasAccess);
      expect(access.isAdmin).toBe(c.role === "admin");
    });
  }

  it("behandelt den exakten Ablaufzeitpunkt als abgelaufen", () => {
    const access = computeAccess(
      profile({ plan: "pro", plan_valid_until: NOW.toISOString() }),
      NOW
    );
    expect(access.hasAccess).toBe(false);
  });

  it("übernimmt die Profilfelder in das Access-Objekt", () => {
    const access = computeAccess(
      profile({ display_name: "Anna", plan: "pro", plan_valid_until: FUTURE }),
      NOW
    );
    expect(access).toMatchObject({
      userId: "user-1",
      email: "test@example.com",
      displayName: "Anna",
      role: "member",
      plan: "pro",
      planValidUntil: FUTURE,
      active: true,
    });
    const pub = toPublicAccess(access);
    expect(pub).not.toHaveProperty("active");
    expect(pub.hasAccess).toBe(true);
  });
});

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(async () => null),
}));

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  PROFILES_TABLE: "profiles",
  ANALYSIS_TABLE: "analysis_state",
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

describe("getAccess liest profiles über den Service-Client", () => {
  beforeEach(() => maybeSingle.mockReset());

  it("liefert das ausgewertete Access-Objekt", async () => {
    maybeSingle.mockResolvedValue({
      data: profile({ plan: "internal" }),
      error: null,
    });
    const access = await getAccess("user-1");
    expect(access?.hasAccess).toBe(true);
    expect(access?.isAdmin).toBe(false);
  });

  it("liefert null ohne Profil oder bei Fehler", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getAccess("unbekannt")).toBeNull();
    maybeSingle.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await getAccess("user-1")).toBeNull();
  });
});
