import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Serverseitiger Supabase-Zugriff mit dem Service-Role-Key.
 *
 * Bewusste Architektur-Entscheidung: Der Browser erhält keinerlei
 * Supabase-Schlüssel. Alle Lese- und Schreibzugriffe laufen über die
 * API-Route /api/data, die das Auth-Cookie des Passwortschutzes prüft.
 * Die Tabelle hat Row Level Security ohne öffentliche Policies, ist also
 * nur über den Service-Role-Key des Servers erreichbar.
 *
 * Sind die Umgebungsvariablen nicht gesetzt, ist die Cloud-Speicherung
 * schlicht deaktiviert und die Anwendung arbeitet wie bisher im Browser.
 */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Name der Tabelle und Schlüssel der gemeinsamen Zeile. */
export const ANALYSIS_TABLE = "analysis_state";
export const SHARED_ROW_ID = "shared";
