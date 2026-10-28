import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileRow } from "@/lib/access";

/**
 * Route-Tests für /api/admin/users mit gemocktem Supabase:
 * 403 für Mitglieder, Selbstschutz des Admins, Einladen setzt Rolle und Plan.
 */

const state: {
  user: { id: string; email: string } | null;
  profile: ProfileRow | null;
} = { user: null, profile: null };

function adminProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "admin-1",
    email: "admin@example.com",
    display_name: null,
    role: "admin",
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

const calls = {
  profileUpdates: [] as { patch: Record<string, unknown>; id: string }[],
  deletedUsers: [] as string[],
  deletedStates: [] as string[],
  invites: [] as { email: string; redirectTo?: string }[],
};

vi.mock("@/lib/supabase/admin", () => ({
  ANALYSIS_TABLE: "analysis_state",
  PROFILES_TABLE: "profiles",
  getServiceClient: () => ({
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          calls.profileUpdates.push({ patch, id });
          const result = { error: null };
          return Object.assign(Promise.resolve(result), {
            select: () => ({
              maybeSingle: async () => ({ data: { id }, error: null }),
            }),
          });
        },
      }),
      delete: () => ({
        eq: async (_col: string, id: string) => {
          if (table === "analysis_state") calls.deletedStates.push(id);
          return { error: null };
        },
      }),
      select: () => ({
        order: async () => ({ data: [], error: null }),
        eq: () => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: state.profile, error: null }
              : { data: null, error: null },
        }),
      }),
    }),
    auth: {
      admin: {
        inviteUserByEmail: async (
          email: string,
          options?: { redirectTo?: string }
        ) => {
          calls.invites.push({ email, redirectTo: options?.redirectTo });
          return { data: { user: { id: "new-1" } }, error: null };
        },
        deleteUser: async (id: string) => {
          calls.deletedUsers.push(id);
          return { data: {}, error: null };
        },
        listUsers: async () => ({ data: { users: [] }, error: null }),
      },
    },
  }),
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/admin/users/route";

function request(method: string, body: unknown) {
  return new Request("https://app.example.com/api/admin/users", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    calls.profileUpdates = [];
    calls.deletedUsers = [];
    calls.deletedStates = [];
    calls.invites = [];
  });

  it("antwortet ohne Sitzung mit 401 und für Mitglieder mit 403", async () => {
    expect((await GET()).status).toBe(401);

    state.user = { id: "member-1", email: "m@example.com" };
    state.profile = adminProfile({ id: "member-1", role: "member" });
    expect((await GET()).status).toBe(403);
    expect((await POST(request("POST", { email: "x@example.com" }))).status).toBe(403);
    expect(
      (await PATCH(request("PATCH", { id: "a", action: "activate" }))).status
    ).toBe(403);
    expect((await DELETE(request("DELETE", { id: "a" }))).status).toBe(403);
  });

  describe("als Admin", () => {
    beforeEach(() => {
      state.user = { id: "admin-1", email: "admin@example.com" };
      state.profile = adminProfile();
    });

    it("kann sich selbst nicht herabstufen, deaktivieren oder löschen", async () => {
      const demote = await PATCH(
        request("PATCH", { id: "admin-1", action: "setRole", role: "member" })
      );
      expect(demote.status).toBe(400);

      const deactivate = await PATCH(
        request("PATCH", { id: "admin-1", action: "deactivate" })
      );
      expect(deactivate.status).toBe(400);

      const remove = await DELETE(request("DELETE", { id: "admin-1" }));
      expect(remove.status).toBe(400);

      expect(calls.profileUpdates).toHaveLength(0);
      expect(calls.deletedUsers).toHaveLength(0);
    });

    it("darf die eigene Admin-Rolle bestätigen und sich selbst aktivieren", async () => {
      expect(
        (await PATCH(request("PATCH", { id: "admin-1", action: "setRole", role: "admin" })))
          .status
      ).toBe(200);
      expect(
        (await PATCH(request("PATCH", { id: "admin-1", action: "activate" }))).status
      ).toBe(200);
    });

    it("ändert Rolle, Plan und Status anderer Nutzer", async () => {
      expect(
        (await PATCH(request("PATCH", { id: "u-2", action: "setRole", role: "admin" })))
          .status
      ).toBe(200);
      expect(
        (
          await PATCH(
            request("PATCH", {
              id: "u-2",
              action: "setPlan",
              plan: "pro",
              planValidUntil: "2027-01-31T23:59:59.000Z",
            })
          )
        ).status
      ).toBe(200);
      expect(
        (await PATCH(request("PATCH", { id: "u-2", action: "deactivate" }))).status
      ).toBe(200);
      expect(calls.profileUpdates.map((c) => c.patch)).toEqual([
        { role: "admin" },
        { plan: "pro", plan_valid_until: "2027-01-31T23:59:59.000Z" },
        { active: false },
      ]);
    });

    it("lehnt ungültige Pläne, Rollen, Daten und Aktionen ab", async () => {
      expect(
        (await PATCH(request("PATCH", { id: "u-2", action: "setPlan", plan: "gold" })))
          .status
      ).toBe(400);
      expect(
        (await PATCH(request("PATCH", { id: "u-2", action: "setRole", role: "boss" })))
          .status
      ).toBe(400);
      expect(
        (
          await PATCH(
            request("PATCH", {
              id: "u-2",
              action: "setPlan",
              plan: "pro",
              planValidUntil: "kein datum",
            })
          )
        ).status
      ).toBe(400);
      expect(
        (await PATCH(request("PATCH", { id: "u-2", action: "explode" }))).status
      ).toBe(400);
      expect(calls.profileUpdates).toHaveLength(0);
    });

    it("lädt per E-Mail ein und setzt Rolle und Plan am Profil", async () => {
      const response = await POST(
        request("POST", {
          email: " Neu@Example.com ",
          role: "member",
          plan: "pro",
          planValidUntil: null,
        })
      );
      expect(response.status).toBe(200);
      expect(calls.invites).toEqual([
        {
          email: "neu@example.com",
          redirectTo:
            "https://app.example.com/auth/callback?next=/auth/set-password",
        },
      ]);
      expect(calls.profileUpdates).toEqual([
        {
          id: "new-1",
          patch: { role: "member", plan: "pro", plan_valid_until: null, active: true },
        },
      ]);
    });

    it("lehnt ungültige E-Mail-Adressen ab", async () => {
      const response = await POST(request("POST", { email: "keine-adresse" }));
      expect(response.status).toBe(400);
      expect(calls.invites).toHaveLength(0);
    });

    it("löscht andere Nutzer samt Datenstand", async () => {
      const response = await DELETE(request("DELETE", { id: "u-2" }));
      expect(response.status).toBe(200);
      expect(calls.deletedUsers).toEqual(["u-2"]);
      expect(calls.deletedStates).toEqual(["u-2"]);
    });
  });
});
