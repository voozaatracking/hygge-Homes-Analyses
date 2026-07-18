import { getServiceClient } from "@/lib/supabase-server";
import type { SessionRole } from "@/lib/session";

/**
 * Serverseitige Nutzerverwaltung (Tabelle app_users in Supabase).
 * Wie die Datenhaltung läuft alles über den Service-Role-Key auf dem
 * Server; im Browser existieren weder Schlüssel noch Direktzugriffe.
 */

export const USERS_TABLE = "app_users";

export interface AppUser {
  id: string;
  username: string;
  password_hash: string;
  role: SessionRole;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export type PublicUser = Omit<AppUser, "password_hash">;

export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

/** Benutzernamen normalisieren: klein, getrimmt. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/.test(username);
}

export async function findUserByUsername(
  username: string
): Promise<AppUser | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export async function listUsers(): Promise<PublicUser[] | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("id, username, role, active, created_at, last_login_at")
    .order("username", { ascending: true });
  if (error) return null;
  return (data ?? []) as PublicUser[];
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role: SessionRole;
}): Promise<{ user?: PublicUser; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { error: "Cloud-Speicherung ist nicht konfiguriert." };
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      username: normalizeUsername(input.username),
      password_hash: input.passwordHash,
      role: input.role,
      active: true,
    })
    .select("id, username, role, active, created_at, last_login_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { error: "Der Benutzername ist bereits vergeben." };
    }
    return { error: "Der Nutzer konnte nicht angelegt werden." };
  }
  // Verteidigung in der Tiefe: nie mehr zurückgeben als die öffentlichen Felder,
  // selbst wenn die Datenbank zusätzliche Spalten liefert.
  return { user: toPublicUser(data as AppUser) };
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<AppUser, "active" | "password_hash" | "role">>
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from(USERS_TABLE)
    .update(patch)
    .eq("id", id);
  return !error;
}

export async function deleteUserAndData(id: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from(USERS_TABLE).delete().eq("id", id);
  if (error) return false;
  // Zugehörigen Datenstand mit entfernen (bewusste Entscheidung, im UI angekündigt).
  await supabase.from("analysis_state").delete().eq("id", id);
  return true;
}

export async function touchLastLogin(id: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  await supabase
    .from(USERS_TABLE)
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", id);
}
