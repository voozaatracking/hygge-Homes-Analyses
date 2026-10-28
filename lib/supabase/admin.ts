import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readServiceKey } from "@/lib/supabase/keys";

/**
 * Serverseitiger Supabase-Zugriff mit dem Service-Role-Key.
 *
 * Bewusste Architektur-Entscheidung: Der Browser erhält keinen Zugriff auf
 * Tabellen. Alle Lese- und Schreibzugriffe auf analysis_state und profiles
 * laufen über Route Handler und Server-Komponenten, die zuvor die
 * Supabase-Auth-Sitzung prüfen (lib/access.ts). Beide Tabellen haben Row
 * Level Security ohne Policies, sind also nur über diesen Schlüssel erreichbar.
 *
 * Sind die Umgebungsvariablen nicht gesetzt, liefert getServiceClient() null
 * und die Cloud-Speicherung ist deaktiviert.
 */
export function getServiceClient(): SupabaseClient | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = readServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Tabelle mit dem Datenstand je Nutzer (id = Auth-ID als Text). */
export const ANALYSIS_TABLE = "analysis_state";
/** Tabelle mit Rolle, Plan und Status je Auth-Nutzer. */
export const PROFILES_TABLE = "profiles";
