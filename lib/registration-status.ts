import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILES_TABLE } from "@/lib/supabase/admin";

/**
 * Status eines Kontos zu einer E-Mail-Adresse, nur serverseitig über den
 * Service-Client: Profilzeile per E-Mail suchen, Bestätigung aus auth.users.
 * Liefert null, wenn kein Konto existiert.
 */
export interface AccountStatus {
  id: string;
  confirmed: boolean;
}

export async function findAccountByEmail(
  service: SupabaseClient,
  email: string
): Promise<AccountStatus | null> {
  const profile = await service
    .from(PROFILES_TABLE)
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profile.error || !profile.data) return null;
  const id = profile.data.id as string;
  const user = await service.auth.admin.getUserById(id);
  // Ohne Auth-Datensatz vorsichtshalber als bestätigt behandeln (kein Resend).
  const confirmed = user.error || !user.data.user
    ? true
    : Boolean(user.data.user.email_confirmed_at);
  return { id, confirmed };
}
