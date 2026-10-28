import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnalysisFile } from "@/lib/io/json-file";
import { emptyProperty } from "@/lib/utils";
import type { ProfileRow } from "@/lib/access";

/**
 * Route-Tests für /api/data mit gemocktem Supabase.
 * lib/access.ts wird vollständig ersetzt: Sitzung und Zugriff kommen aus
 * dem Mock, die Datenbankaufrufe aus einem minimalen Query-Builder.
 */

const state: {
  user: { id: string; email: string } | null;
  profile: ProfileRow | null;
} = { user: null, profile: null };

function profile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "auth-1",
    email: "a@example.com",
    display_name: null,
    role: "member",
    plan: "internal",
    plan_valid_until: null,
    active: true,
    ...overrides,
  };
}

// Sitzung: der Server-Client liefert den Nutzer aus dem Teststatus.
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

const db = {
  rows: new Map<string, { payload: unknown; updated_at: string }>(),
  upserts: [] as { id: string }[],
};

// Service-Client: profiles liefert den Teststatus, analysis_state die Map.
vi.mock("@/lib/supabase/admin", () => ({
  ANALYSIS_TABLE: "analysis_state",
  PROFILES_TABLE: "profiles",
  getServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: state.profile, error: null }
              : { data: db.rows.get(id) ?? null, error: null },
        }),
      }),
      upsert: async (row: { id: string; payload: unknown; updated_at: string }) => {
        db.rows.set(row.id, { payload: row.payload, updated_at: row.updated_at });
        db.upserts.push({ id: row.id });
        return { error: null };
      },
    }),
  }),
}));

import { GET, PUT } from "@/app/api/data/route";

function putRequest(body: string) {
  return new Request("http://localhost/api/data", { method: "PUT", body });
}

describe("/api/data", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    db.rows.clear();
    db.upserts = [];
  });

  it("antwortet ohne Sitzung mit 401", async () => {
    expect((await GET()).status).toBe(401);
    expect((await PUT(putRequest("{}"))).status).toBe(401);
  });

  it("antwortet ohne aktiven Zugang mit 403", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile({ plan: "none" });
    expect((await GET()).status).toBe(403);
    expect((await PUT(putRequest("{}"))).status).toBe(403);

    // Auch ohne Profilzeile: kein Zugang.
    state.profile = null;
    expect((await GET()).status).toBe(403);
  });

  it("liefert mit Zugang die Zeile mit der Auth-ID", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const file = buildAnalysisFile([emptyProperty("Objekt")], [], "object");
    db.rows.set("auth-1", { payload: file, updated_at: "2026-10-28T10:00:00Z" });
    db.rows.set("auth-2", { payload: { fremd: true }, updated_at: "x" });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      configured: boolean;
      payload: { objects: unknown[] } | null;
      updatedAt: string | null;
    };
    expect(body.ok).toBe(true);
    expect(body.configured).toBe(true);
    expect(body.payload?.objects).toHaveLength(1);
    expect(body.updatedAt).toBe("2026-10-28T10:00:00Z");
  });

  it("speichert einen gültigen Datenstand unter der Auth-ID", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const file = buildAnalysisFile([emptyProperty("Objekt")], [], "object");

    const response = await PUT(putRequest(JSON.stringify(file)));
    expect(response.status).toBe(200);
    expect(db.upserts).toEqual([{ id: "auth-1" }]);
    expect(db.rows.has("auth-1")).toBe(true);
  });

  it("lehnt ungültige Datenstände mit 400 ab und speichert nichts", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile();
    const response = await PUT(putRequest("kein json"));
    expect(response.status).toBe(400);
    expect(db.upserts).toHaveLength(0);
  });
});
