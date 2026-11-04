import { beforeEach, describe, expect, it, vi } from "vitest";

/** Route-Tests für /api/register/resend: neutrale Antwort, Versand nur bei unbestätigtem Konto. */

const state = {
  accounts: new Map<string, { id: string; confirmed: boolean }>(),
  resends: [] as { email: string; type: string; redirectTo?: string }[],
};

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => null,
  getServerAuthClient: () => ({
    auth: {
      resend: async (args: { type: string; email: string; options?: { emailRedirectTo?: string } }) => {
        state.resends.push({ email: args.email, type: args.type, redirectTo: args.options?.emailRedirectTo });
        return { error: null };
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
        getUserById: async (id: string) => {
          const account = [...state.accounts.values()].find((a) => a.id === id);
          return {
            data: {
              user: account
                ? { id, email_confirmed_at: account.confirmed ? "2026-11-01T00:00:00Z" : null }
                : null,
            },
            error: account ? null : { message: "not found" },
          };
        },
      },
    },
    from: () => ({
      select: () => ({
        eq: (_col: string, email: string) => ({
          maybeSingle: async () => ({
            data: state.accounts.has(email) ? { id: state.accounts.get(email)!.id } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { NEUTRAL_MESSAGE, POST } from "@/app/api/register/resend/route";

function request(body: unknown, ip = "203.0.113.5") {
  return new Request("https://app.example.com/api/register/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function neutral(response: Response) {
  expect(response.status).toBe(200);
  const body = (await response.json()) as { ok: boolean; message: string };
  expect(body).toEqual({ ok: true, message: NEUTRAL_MESSAGE });
}

describe("/api/register/resend", () => {
  beforeEach(() => {
    state.accounts.clear();
    state.resends = [];
  });

  it("lehnt ungültige Adressen mit 400 ab", async () => {
    expect((await POST(request({ email: "x" }, "198.51.100.40"))).status).toBe(400);
    expect((await POST(request({}, "198.51.100.40"))).status).toBe(400);
  });

  it("antwortet bei bestätigtem Konto neutral und sendet nicht", async () => {
    state.accounts.set("a@example.com", { id: "u-a", confirmed: true });
    await neutral(await POST(request({ email: "A@example.com" }, "198.51.100.41")));
    expect(state.resends).toHaveLength(0);
  });

  it("sendet bei unbestätigtem Konto erneut und antwortet neutral", async () => {
    state.accounts.set("b@example.com", { id: "u-b", confirmed: false });
    await neutral(await POST(request({ email: "b@example.com" }, "198.51.100.42")));
    expect(state.resends).toEqual([
      {
        email: "b@example.com",
        type: "signup",
        redirectTo: "https://app.example.com/auth/callback?next=/",
      },
    ]);
  });

  it("antwortet bei unbekannter Adresse neutral und sendet nicht", async () => {
    await neutral(await POST(request({ email: "niemand@example.com" }, "198.51.100.43")));
    expect(state.resends).toHaveLength(0);
  });

  it("begrenzt auf 3 Anfragen je E-Mail und 10 je IP pro Stunde", async () => {
    state.accounts.set("c@example.com", { id: "u-c", confirmed: false });
    for (let i = 0; i < 3; i++) {
      await neutral(await POST(request({ email: "c@example.com" }, `198.51.100.${50 + i}`)));
    }
    const blockedByEmail = await POST(request({ email: "c@example.com" }, "198.51.100.60"));
    expect(blockedByEmail.status).toBe(429);
    expect(blockedByEmail.headers.get("retry-after")).toBeTruthy();
    expect(state.resends).toHaveLength(3);

    const ip = "198.51.100.99";
    for (let i = 0; i < 10; i++) {
      expect((await POST(request({ email: `ip${i}@example.com` }, ip))).status).toBe(200);
    }
    expect((await POST(request({ email: "ip11@example.com" }, ip))).status).toBe(429);
  });
});
