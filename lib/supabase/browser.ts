"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readPublicKey } from "@/lib/supabase/keys";

/**
 * Supabase-Client für Client-Komponenten (Login, Passwort setzen, Reset).
 * Nutzt den öffentlichen Anon-Key; der ist per Design öffentlich und durch
 * Row Level Security abgesichert. Tabellen sind damit nicht erreichbar,
 * nur die Auth-Endpunkte. Die Sitzung landet in Cookies, die der Server liest.
 *
 * Liefert null, wenn die öffentlichen Variablen fehlen.
 */
let client: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}

/** Deutsche Fehlermeldungen für die häufigsten Auth-Fehler. */
export function describeAuthError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (text.includes("email not confirmed")) {
    return "Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link aus der Einladung öffnen.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
  }
  if (text.includes("password") && text.includes("least")) {
    return "Das Passwort ist zu kurz.";
  }
  if (text.includes("same password") || text.includes("different from the old")) {
    return "Das neue Passwort muss sich vom bisherigen unterscheiden.";
  }
  if (text.includes("session") || text.includes("expired") || text.includes("invalid")) {
    return "Der Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern.";
  }
  return "Die Anfrage ist fehlgeschlagen. Bitte erneut versuchen.";
}
