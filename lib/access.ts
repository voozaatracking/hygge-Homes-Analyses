import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient, PROFILES_TABLE } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import {
  effectiveSessionStart,
  isSessionExpired,
  SESSION_START_COOKIE,
  sessionStartSecret,
  verifySessionStartToken,
} from "@/lib/session-limit";

/**
 * Einzige Zugriffsschicht der Anwendung.
 *
 * Rolle, Plan und Status werden bei jedem Request serverseitig aus der
 * Tabelle profiles gelesen, nie aus dem Cookie. Alle Route Handler und
 * Server-Komponenten nutzen ausschließlich diese Funktionen. Payment hängt
 * sich später nur hier ein (schreibt plan und plan_valid_until).
 */

export type Role = "admin" | "member";
export type Plan = "none" | "internal" | "pro";

/** Rohzeile aus profiles, soweit für den Zugriff relevant. */
export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  plan: Plan;
  plan_valid_until: string | null;
  active: boolean;
}

export interface Access {
  userId: string;
  email: string;
  displayName: string | null;
  role: Role;
  plan: Plan;
  planValidUntil: string | null;
  active: boolean;
  /** true, wenn der Nutzer die Anwendung benutzen darf. */
  hasAccess: boolean;
  isAdmin: boolean;
}

/**
 * Zugriffsregel (bewusst getroffene Entscheidung, siehe ROADMAP Phase 2):
 * active = true und (role = admin
 *   oder plan = internal
 *   oder (plan = pro und (plan_valid_until null oder in der Zukunft))).
 */
export function computeAccess(profile: ProfileRow, now: Date = new Date()): Access {
  const isAdmin = profile.role === "admin";
  const proValid =
    profile.plan === "pro" &&
    (profile.plan_valid_until == null ||
      new Date(profile.plan_valid_until).getTime() > now.getTime());
  const hasAccess =
    profile.active && (isAdmin || profile.plan === "internal" || proValid);
  return {
    userId: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    plan: profile.plan,
    planValidUntil: profile.plan_valid_until,
    active: profile.active,
    hasAccess,
    isAdmin,
  };
}

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface SessionState {
  user: SessionUser | null;
  /** true, wenn die Sitzung die Höchstdauer überschritten hat und beendet wurde. */
  expired: boolean;
}

/** session_id aus dem JWT, lokal geprüft; null, wenn nicht verfügbar. */
async function readSessionId(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>
): Promise<string | null> {
  try {
    if (typeof supabase.auth.getClaims !== "function") return null;
    const { data } = await supabase.auth.getClaims();
    const sid = data?.claims?.session_id;
    return typeof sid === "string" ? sid : null;
  } catch {
    return null;
  }
}

/**
 * Sitzung prüfen: gegen den Auth-Server (getUser) und gegen die Höchstdauer
 * (Cookie mit Anmeldezeitpunkt und auth.users.last_sign_in_at, der frühere
 * Zeitpunkt zählt). Abgelaufene Sitzungen werden serverseitig beendet.
 */
export async function getSessionState(): Promise<SessionState> {
  const supabase = await getServerSupabase();
  if (!supabase) return { user: null, expired: false };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, expired: false };

  const secret = sessionStartSecret();
  let cookieStart = null;
  if (secret) {
    try {
      const store = await cookies();
      cookieStart = await verifySessionStartToken(
        store.get(SESSION_START_COOKIE)?.value,
        secret
      );
    } catch {
      cookieStart = null;
    }
  }
  const startedAt = effectiveSessionStart({
    cookie: cookieStart,
    sid: cookieStart ? await readSessionId(supabase) : null,
    lastSignInAt: data.user.last_sign_in_at,
  });
  if (isSessionExpired(startedAt)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // In Server-Komponenten können keine Cookies gesetzt werden; proxy.ts
      // beendet die Sitzung beim nächsten Seitenaufruf.
    }
    return { user: null, expired: true };
  }
  return { user: { id: data.user.id, email: data.user.email ?? null }, expired: false };
}

/** Liefert den angemeldeten Auth-Nutzer oder null (abgelaufen zählt als null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  return (await getSessionState()).user;
}

/** Liest das Profil über den Service-Client und wertet die Zugriffsregel aus. */
export async function getAccess(userId: string): Promise<Access | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, display_name, role, plan, plan_valid_until, active")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return computeAccess(data as ProfileRow);
}

/** Felder des Access-Objekts, die der Browser sehen darf (/api/me). */
export function toPublicAccess(access: Access) {
  return {
    userId: access.userId,
    email: access.email,
    displayName: access.displayName,
    role: access.role,
    plan: access.plan,
    planValidUntil: access.planValidUntil,
    hasAccess: access.hasAccess,
    isAdmin: access.isAdmin,
  };
}

/**
 * Helfer für Route Handler: 401 ohne Sitzung, 403 ohne Zugang,
 * sonst das Access-Objekt.
 */
export async function requireAccess(): Promise<
  { access: Access } | { response: NextResponse }
> {
  const { user, expired } = await getSessionState();
  if (!user) {
    return {
      response: NextResponse.json(
        expired
          ? {
              ok: false,
              error: "Die Sitzung ist nach 12 Stunden abgelaufen. Bitte erneut anmelden.",
              expired: true,
            }
          : { ok: false, error: "Nicht angemeldet." },
        { status: 401 }
      ),
    };
  }
  const access = await getAccess(user.id);
  if (!access || !access.hasAccess) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Kein aktiver Zugang. Bitte an den Administrator wenden.",
        },
        { status: 403 }
      ),
    };
  }
  return { access };
}

/** Wie requireAccess, zusätzlich 403 ohne Admin-Rolle. */
export async function requireAdmin(): Promise<
  { access: Access } | { response: NextResponse }
> {
  const result = await requireAccess();
  if ("response" in result) return result;
  if (!result.access.isAdmin) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Nur für Administratoren." },
        { status: 403 }
      ),
    };
  }
  return result;
}
