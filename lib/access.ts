import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient, PROFILES_TABLE } from "@/lib/supabase/admin";

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

/**
 * Liefert den angemeldeten Auth-Nutzer oder null. Prüft die Sitzung gegen
 * den Auth-Server (getUser), nicht nur die Cookie-Signatur.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
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
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
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
