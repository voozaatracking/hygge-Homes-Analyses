import { beforeEach, describe, expect, it, vi } from "vitest";
import { REGISTRATION } from "@/lib/config/registration";

/** Route-Tests für /api/register mit gemockten Supabase-Clients. */

const state = {
  existingEmails: new Set<string>(),
  /** E-Mails, deren Konto noch unbestätigt ist. */
  unconfirmedEmails: new Set<string>(),
  signUps: [] as { email: string; password: string; options: unknown }[],
  signUpError: null as { message: string } | null,
  profileUpdates: [] as { id: string; patch: Record<string, unknown> }[],
  profileUpserts: [] as Record<string, unknown>[],
  updateFinds: true,
};

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => null,
  getServerAuthClient: () => ({
    auth: {
      signUp: async (args: { email: string; password: string; options: unknown }) => {
        state.signUps.push(args);
        if (state.signUpError) return { data: { user: null }, error: state.signUpError };
        return { data: { user: { id: "new-user" } }, error: null };
      },
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  ANALYSIS_TABLE: "analysis_state",
  PROFILES_TABLE: "profiles",
  getServiceClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user: {
              id,
              email_confirmed_at: state.unconfirmedEmails.has(id.replace(/^id:/, ""))
                ? null
                : "2026-11-01T00:00:00Z",
            },
          },
          error: null,
        }),
      },
    },
    from: () => ({
      select: () => ({
        eq: (_col: string, email: string) => ({
          maybeSingle: async () => ({
            data: state.existingEmails.has(email) ? { id: `id:${email}` } : null,
            error: null,
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => ({
          select: () => ({
            maybeSingle: async () => {
              state.profileUpdates.push({ id, patch });
              return { data: state.updateFinds ? { id } : null, error: null };
            },
          }),
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        state.profileUpserts.push(row);
        return { error: null };
      },
    }),
  }),
}));

import { POST } from "@/app/api/register/route";

function request(body: unknown, ip = "203.0.113.10") {
  return new Request("https://app.example.com/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const valid = {
  email: "Neu@Example.com",
  password: "sicheres-passwort",
  displayName: " Anna ",
  website: "",
};

describe("/api/register", () => {
  beforeEach(() => {
    state.existingEmails.clear();
    state.unconfirmedEmails.clear();
    state.signUps = [];
    state.signUpError = null;
    state.profileUpdates = [];
    state.profileUpserts = [];
    state.updateFinds = true;
  });

  it("lehnt ungültige Eingaben mit 400 ab", async () => {
    expect((await POST(request({ ...valid, email: "keine-adresse" }, "198.51.100.1"))).status).toBe(400);
    expect((await POST(request({ ...valid, password: "kurz" }, "198.51.100.1"))).status).toBe(400);
    expect((await POST(request({}, "198.51.100.1"))).status).toBe(400);
    expect(state.signUps).toHaveLength(0);
  });

  it("antwortet bei ausgefülltem Honeypot mit 201 ohne Aktion", async () => {
    const response = await POST(request({ ...valid, website: "http://spam.example" }, "198.51.100.2"));
    expect(response.status).toBe(201);
    expect(state.signUps).toHaveLength(0);
    expect(state.profileUpdates).toHaveLength(0);
  });

  it("meldet eine bereits registrierte E-Mail-Adresse mit 409", async () => {
    state.existingEmails.add("neu@example.com");
    const response = await POST(request(valid, "198.51.100.3"));
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string; unconfirmed: boolean };
    expect(body.error).toBe("Für diese E-Mail-Adresse existiert bereits ein Konto.");
    expect(body.unconfirmed).toBe(false);
    expect(state.signUps).toHaveLength(0);
  });

  it("kennzeichnet ein noch unbestätigtes Konto mit unconfirmed: true", async () => {
    state.existingEmails.add("neu@example.com");
    state.unconfirmedEmails.add("neu@example.com");
    const response = await POST(request(valid, "198.51.100.33"));
    expect(response.status).toBe(409);
    const body = (await response.json()) as { unconfirmed: boolean };
    expect(body.unconfirmed).toBe(true);
    expect(state.signUps).toHaveLength(0);
  });

  it("legt das Konto an, setzt Startplan, Gültigkeit und Anzeigename und setzt keine Sitzung", async () => {
    const before = Date.now();
    const response = await POST(request(valid, "198.51.100.4"));
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(Object.keys(body).sort()).toEqual(["message", "ok"]);
    expect(response.headers.get("set-cookie")).toBeNull();

    expect(state.signUps).toHaveLength(1);
    const signUp = state.signUps[0];
    expect(signUp.email).toBe("neu@example.com");
    expect(signUp.options).toEqual({
      data: { display_name: "Anna" },
      emailRedirectTo: "https://app.example.com/auth/callback?next=/",
    });

    expect(state.profileUpdates).toHaveLength(1);
    const { id, patch } = state.profileUpdates[0];
    expect(id).toBe("new-user");
    expect(patch.plan).toBe(REGISTRATION.defaultPlan);
    expect(patch.display_name).toBe("Anna");
    expect(patch.active).toBe(true);
    if (REGISTRATION.defaultValidDays == null) {
      expect(patch.plan_valid_until).toBeNull();
    } else {
      const until = new Date(patch.plan_valid_until as string).getTime();
      const expected = before + REGISTRATION.defaultValidDays * 86_400_000;
      expect(Math.abs(until - expected)).toBeLessThan(10_000);
    }
    expect(state.profileUpserts).toHaveLength(0);
  });

  it("legt die Profilzeile an, falls der Trigger sie noch nicht erzeugt hat", async () => {
    state.updateFinds = false;
    const response = await POST(request(valid, "198.51.100.5"));
    expect(response.status).toBe(201);
    expect(state.profileUpserts).toHaveLength(1);
    expect(state.profileUpserts[0]).toMatchObject({
      id: "new-user",
      email: "neu@example.com",
      plan: REGISTRATION.defaultPlan,
    });
  });

  it("übersetzt Supabase-Fehler", async () => {
    state.signUpError = { message: "User already registered" };
    expect((await POST(request(valid, "198.51.100.6"))).status).toBe(409);
    state.signUpError = { message: "Signups not allowed for this instance" };
    expect((await POST(request(valid, "198.51.100.6"))).status).toBe(503);
    state.signUpError = { message: "Email rate limit exceeded" };
    expect((await POST(request(valid, "198.51.100.6"))).status).toBe(429);
    expect(state.profileUpdates).toHaveLength(0);
  });

  it("begrenzt auf 10 Versuche je IP und Stunde", async () => {
    const ip = "198.51.100.77";
    for (let i = 0; i < 10; i++) {
      const response = await POST(request({ ...valid, email: `n${i}@example.com` }, ip));
      expect(response.status).toBe(201);
    }
    const blocked = await POST(request({ ...valid, email: "n11@example.com" }, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    // Andere IP bleibt unberührt.
    expect((await POST(request(valid, "198.51.100.78"))).status).toBe(201);
  });
});
