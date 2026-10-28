/**
 * Supabase-Schlüsselformate. Supabase stellt von JWT-basierten Schlüsseln
 * (anon, service_role; beginnen mit "eyJ") auf neue API-Schlüssel um
 * (sb_publishable_…, sb_secret_…). Beide Formate werden akzeptiert; die
 * Variablennamen bleiben unverändert. Geprüft wird nur, dass kein geheimer
 * Schlüssel öffentlich und kein öffentlicher als geheimer verwendet wird.
 */

export type KeyKind = "publishable" | "secret" | "legacy-jwt" | "invalid";

export function classifyKey(key: string | undefined | null): KeyKind {
  if (!key) return "invalid";
  const value = key.trim();
  if (value.startsWith("sb_publishable_")) return "publishable";
  if (value.startsWith("sb_secret_")) return "secret";
  // JWT: drei Base64url-Segmente; alte anon- und service_role-Schlüssel.
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    return "legacy-jwt";
  }
  return "invalid";
}

/** Öffentlicher Schlüssel für Browser und Auth: anon (JWT) oder sb_publishable_. */
export function isPublicKey(key: string | undefined | null): boolean {
  const kind = classifyKey(key);
  return kind === "publishable" || kind === "legacy-jwt";
}

/** Serverschlüssel für Tabellenzugriff: service_role (JWT) oder sb_secret_. */
export function isServiceKey(key: string | undefined | null): boolean {
  const kind = classifyKey(key);
  return kind === "secret" || kind === "legacy-jwt";
}

/**
 * Liefert den Schlüssel oder null mit Konsolenhinweis, wenn er für den Zweck
 * ungeeignet ist (z. B. sb_secret_ im Browser oder sb_publishable_ als
 * Service-Schlüssel). Alte JWT-Schlüssel lassen sich nicht unterscheiden und
 * werden für beide Zwecke akzeptiert.
 */
export function readPublicKey(key: string | undefined | null): string | null {
  if (!key) return null;
  if (!isPublicKey(key)) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY ist kein öffentlicher Schlüssel (erwartet anon-JWT oder sb_publishable_…)."
    );
    return null;
  }
  return key.trim();
}

export function readServiceKey(key: string | undefined | null): string | null {
  if (!key) return null;
  if (!isServiceKey(key)) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY ist kein Serverschlüssel (erwartet service_role-JWT oder sb_secret_…)."
    );
    return null;
  }
  return key.trim();
}
