import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readPublicKey } from "@/lib/supabase/keys";

/**
 * Supabase-Client für Server-Komponenten und Route Handler, Sitzung aus den
 * Cookies des Requests (@supabase/ssr). Nur mit dem öffentlichen Anon-Key:
 * Dieser Client dient ausschließlich der Authentifizierung, Tabellen sind
 * für ihn durch RLS ohne Policies unsichtbar. Datenzugriff läuft über
 * lib/supabase/admin.ts.
 *
 * Liefert null, wenn Supabase nicht konfiguriert ist.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  // Zuerst die Cookies anfordern: Das macht jede aufrufende Seite zur
  // Request-Zeit dynamisch, auch wenn Supabase (noch) nicht konfiguriert ist.
  // Sonst würde der Build die Weiterleitung auf /login statisch einfrieren.
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // In Server-Komponenten können keine Cookies gesetzt werden.
          // Unkritisch: Die Sitzung wird in proxy.ts aufgefrischt.
        }
      },
    },
  });
}
