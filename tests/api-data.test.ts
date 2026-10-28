import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnalysisFile } from "@/lib/io/json-file";
import { emptyProperty } from "@/lib/utils";
import type { ProfileRow } from "@/lib/access";

/**
 * Route-Tests für /api/data mit gemocktem Supabase.
 * Sitzung und Profil kommen aus dem Teststatus, analysis_state aus einer
 * Map mit Versionszähler (Optimistic Lock).
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

interface Row {
  payload: unknown;
  updated_at: string;
  version: number;
}

const db = {
  rows: new Map<string, Row>(),
  writes: [] as string[],
};

/** Minimaler Query-Builder für die genutzten Aufrufe. */
function analysisTable() {
  return {
    select: () => ({
      eq: (_col: string, id: string) => ({
        maybeSingle: async () => ({ data: db.rows.get(id) ?? null, error: null }),
      }),
    }),
    insert: async (row: { id: string } & Row) => {
      if (db.rows.has(row.id)) {
        return { error: { code: "23505", message: "duplicate key" } };
      }
      db.rows.set(row.id, {
        payload: row.payload,
        updated_at: row.updated_at,
        version: row.version,
      });
      db.writes.push(`insert ${row.id} v${row.version}`);
      return { error: null };
    },
    update: (patch: Partial<Row>) => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: (col: string, value: unknown) => {
          filters[col] = value;
          return chain;
        },
        select: () => ({
          maybeSingle: async () => {
            const id = filters.id as string;
            const row = db.rows.get(id);
            if (!row || row.version !== filters.version) {
              return { data: null, error: null };
            }
            Object.assign(row, patch);
            db.writes.push(`update ${id} v${row.version}`);
            return { data: { version: row.version }, error: null };
          },
        }),
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  ANALYSIS_TABLE: "analysis_state",
  PROFILES_TABLE: "profiles",
  getServiceClient: () => ({
    from: (table: string) =>
      table === "profiles"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.profile, error: null }),
              }),
            }),
          }
        : analysisTable(),
  }),
}));

import { GET, PUT } from "@/app/api/data/route";

function putRequest(body: unknown) {
  return new Request("http://localhost/api/data", {
    method: "PUT",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const file = () => buildAnalysisFile([emptyProperty("Objekt")], [], "object");

describe("/api/data", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    db.rows.clear();
    db.writes = [];
  });

  it("antwortet ohne Sitzung mit 401", async () => {
    expect((await GET()).status).toBe(401);
    expect((await PUT(putRequest({}))).status).toBe(401);
  });

  it("antwortet ohne aktiven Zugang mit 403", async () => {
    state.user = { id: "auth-1", email: "a@example.com" };
    state.profile = profile({ plan: "none" });
    expect((await GET()).status).toBe(403);
    expect((await PUT(putRequest({}))).status).toBe(403);

    // Auch ohne Profilzeile: kein Zugang.
    state.profile = null;
    expect((await GET()).status).toBe(403);
  });

  describe("mit Zugang", () => {
    beforeEach(() => {
      state.user = { id: "auth-1", email: "a@example.com" };
      state.profile = profile();
    });

    it("liefert die Zeile der Auth-ID inklusive Version", async () => {
      db.rows.set("auth-1", {
        payload: file(),
        updated_at: "2026-10-28T10:00:00Z",
        version: 3,
      });
      db.rows.set("auth-2", { payload: { fremd: true }, updated_at: "x", version: 9 });

      const response = await GET();
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        ok: boolean;
        payload: { objects: unknown[] } | null;
        updatedAt: string | null;
        version: number | null;
      };
      expect(body.payload?.objects).toHaveLength(1);
      expect(body.updatedAt).toBe("2026-10-28T10:00:00Z");
      expect(body.version).toBe(3);
    });

    it("liefert ohne Zeile version null", async () => {
      const body = (await (await GET()).json()) as { version: number | null };
      expect(body.version).toBeNull();
    });

    it("legt bei expectedVersion null eine neue Zeile mit Version 1 an", async () => {
      const response = await PUT(putRequest({ expectedVersion: null, file: file() }));
      expect(response.status).toBe(200);
      const body = (await response.json()) as { version: number };
      expect(body.version).toBe(1);
      expect(db.writes).toEqual(["insert auth-1 v1"]);
    });

    it("aktualisiert bei passender Version und erhöht sie", async () => {
      db.rows.set("auth-1", { payload: {}, updated_at: "x", version: 3 });
      const response = await PUT(putRequest({ expectedVersion: 3, file: file() }));
      expect(response.status).toBe(200);
      const body = (await response.json()) as { version: number };
      expect(body.version).toBe(4);
      expect(db.rows.get("auth-1")?.version).toBe(4);
      expect(db.writes).toEqual(["update auth-1 v4"]);
    });

    it("antwortet bei abweichender Version mit 409 und dem Serverstand", async () => {
      const serverFile = file();
      db.rows.set("auth-1", {
        payload: serverFile,
        updated_at: "2026-10-28T11:00:00Z",
        version: 5,
      });
      const response = await PUT(putRequest({ expectedVersion: 3, file: file() }));
      expect(response.status).toBe(409);
      const body = (await response.json()) as {
        ok: boolean;
        conflict: boolean;
        version: number;
        payload: unknown;
        updatedAt: string;
      };
      expect(body.ok).toBe(false);
      expect(body.conflict).toBe(true);
      expect(body.version).toBe(5);
      expect(body.updatedAt).toBe("2026-10-28T11:00:00Z");
      expect(body.payload).toEqual(serverFile);
      // Nichts geschrieben, Serverzeile unverändert.
      expect(db.writes).toHaveLength(0);
      expect(db.rows.get("auth-1")?.version).toBe(5);
    });

    it("antwortet mit 409, wenn eine Erstanlage auf eine vorhandene Zeile trifft", async () => {
      db.rows.set("auth-1", { payload: {}, updated_at: "x", version: 2 });
      const response = await PUT(putRequest({ expectedVersion: null, file: file() }));
      expect(response.status).toBe(409);
      const body = (await response.json()) as { version: number };
      expect(body.version).toBe(2);
    });

    it("lehnt ungültige Versionen und Datenstände mit 400 ab", async () => {
      expect(
        (await PUT(putRequest({ expectedVersion: "drei", file: file() }))).status
      ).toBe(400);
      expect(
        (await PUT(putRequest({ expectedVersion: 0, file: file() }))).status
      ).toBe(400);
      expect(
        (await PUT(putRequest({ expectedVersion: 1, file: { kaputt: true } }))).status
      ).toBe(400);
      expect((await PUT(putRequest("kein json"))).status).toBe(400);
      expect(db.writes).toHaveLength(0);
    });
  });
});
