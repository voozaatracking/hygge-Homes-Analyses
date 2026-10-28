import { NextResponse } from "next/server";
import { requireAdmin, type Plan, type Role } from "@/lib/access";
import {
  ANALYSIS_TABLE,
  getServiceClient,
  PROFILES_TABLE,
} from "@/lib/supabase/admin";

/**
 * Admin-API der Nutzerverwaltung. Nur für Sitzungen mit Rolle "admin"
 * (serverseitig aus profiles gelesen, lib/access.ts).
 *
 * GET    → Liste aller Profile inkl. letzter Anmeldung aus auth.users
 * POST   → Einladen { email, role, plan, planValidUntil? }
 * PATCH  → { id, action: "setRole" | "setPlan" | "activate" | "deactivate",
 *            role?, plan?, planValidUntil? }
 * DELETE → { id } entfernt Auth-Nutzer (Profil per Cascade) und Datenstand
 *
 * Selbstschutz: Ein Admin kann sich selbst weder herabstufen noch
 * deaktivieren noch löschen.
 */

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  plan: Plan;
  planValidUntil: string | null;
  active: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
}

const ROLES: Role[] = ["admin", "member"];
const PLANS: Plan[] = ["none", "internal", "pro"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}
function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as string[]).includes(value);
}

/** Gültigkeitsdatum: null (unbegrenzt) oder ISO-Datum, sonst undefined. */
function parseValidUntil(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function notConfigured() {
  return NextResponse.json(
    { ok: false, error: "Cloud-Speicherung ist nicht konfiguriert." },
    { status: 503 }
  );
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if ("response" in denied) return denied.response;

  const supabase = getServiceClient();
  if (!supabase) return notConfigured();

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select(
      "id, email, display_name, role, plan, plan_valid_until, active, created_at"
    )
    .order("email", { ascending: true });
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nutzerliste nicht verfügbar. Supabase-Konfiguration und Tabelle profiles prüfen (Migrationen anwenden).",
      },
      { status: 502 }
    );
  }

  // Letzte Anmeldung liegt nur in auth.users; über den Admin-Client lesen.
  const lastSignIn = new Map<string, string | null>();
  const authUsers = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (!authUsers.error) {
    for (const user of authUsers.data.users) {
      lastSignIn.set(user.id, user.last_sign_in_at ?? null);
    }
  }

  const users: AdminUserRow[] = (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    role: row.role as Role,
    plan: row.plan as Plan,
    planValidUntil: (row.plan_valid_until as string | null) ?? null,
    active: Boolean(row.active),
    createdAt: (row.created_at as string | null) ?? null,
    lastSignInAt: lastSignIn.get(row.id as string) ?? null,
  }));

  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if ("response" in denied) return denied.response;

  const supabase = getServiceClient();
  if (!supabase) return notConfigured();

  const body = await readJson(request);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: Role = isRole(body.role) ? body.role : "member";
  const plan: Plan = isPlan(body.plan) ? body.plan : "none";
  const planValidUntil = parseValidUntil(body.planValidUntil);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." },
      { status: 400 }
    );
  }
  if (planValidUntil === undefined) {
    return NextResponse.json(
      { ok: false, error: "Das Gültigkeitsdatum ist ungültig." },
      { status: 400 }
    );
  }

  // Einladung: Der Link führt auf /auth/callback und von dort zum Passwort setzen.
  const origin = new URL(request.url).origin;
  const invited = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
  });
  if (invited.error || !invited.data.user) {
    const message = invited.error?.message ?? "";
    const known =
      /already|exists|registered/i.test(message)
        ? "Für diese E-Mail-Adresse existiert bereits ein Konto."
        : "Die Einladung konnte nicht versendet werden. SMTP-Einstellungen in Supabase prüfen.";
    return NextResponse.json({ ok: false, error: known }, { status: 400 });
  }

  // Die Profilzeile legt der Datenbank-Trigger an; hier Rolle und Plan setzen.
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update({ role, plan, plan_valid_until: planValidUntil, active: true })
    .eq("id", invited.data.user.id);
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Einladung versendet, aber Rolle und Plan konnten nicht gesetzt werden. Bitte in der Liste nachtragen.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, id: invited.data.user.id, email });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if ("response" in denied) return denied.response;
  const self = denied.access;

  const supabase = getServiceClient();
  if (!supabase) return notConfigured();

  const body = await readJson(request);
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Nutzer-Kennung." },
      { status: 400 }
    );
  }

  let patch: Record<string, unknown>;
  switch (action) {
    case "setRole": {
      if (!isRole(body.role)) {
        return NextResponse.json(
          { ok: false, error: "Unbekannte Rolle." },
          { status: 400 }
        );
      }
      if (id === self.userId && body.role !== "admin") {
        return NextResponse.json(
          { ok: false, error: "Die eigene Admin-Rolle kann nicht entfernt werden." },
          { status: 400 }
        );
      }
      patch = { role: body.role };
      break;
    }
    case "setPlan": {
      if (!isPlan(body.plan)) {
        return NextResponse.json(
          { ok: false, error: "Unbekannter Plan." },
          { status: 400 }
        );
      }
      const planValidUntil = parseValidUntil(body.planValidUntil);
      if (planValidUntil === undefined) {
        return NextResponse.json(
          { ok: false, error: "Das Gültigkeitsdatum ist ungültig." },
          { status: 400 }
        );
      }
      patch = { plan: body.plan, plan_valid_until: planValidUntil };
      break;
    }
    case "activate":
      patch = { active: true };
      break;
    case "deactivate":
      if (id === self.userId) {
        return NextResponse.json(
          { ok: false, error: "Der eigene Zugang kann nicht deaktiviert werden." },
          { status: 400 }
        );
      }
      patch = { active: false };
      break;
    default:
      return NextResponse.json(
        { ok: false, error: "Unbekannte Aktion." },
        { status: 400 }
      );
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Änderung fehlgeschlagen." },
      { status: 502 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Nutzer nicht gefunden." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if ("response" in denied) return denied.response;
  const self = denied.access;

  const supabase = getServiceClient();
  if (!supabase) return notConfigured();

  const body = await readJson(request);
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Nutzer-Kennung." },
      { status: 400 }
    );
  }
  if (id === self.userId) {
    return NextResponse.json(
      { ok: false, error: "Der eigene Zugang kann nicht gelöscht werden." },
      { status: 400 }
    );
  }

  // Auth-Nutzer löschen; das Profil fällt per Cascade.
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Löschen fehlgeschlagen." },
      { status: 502 }
    );
  }
  // Zugehörigen Datenstand mit entfernen (bewusste Entscheidung, im UI angekündigt).
  await supabase.from(ANALYSIS_TABLE).delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
