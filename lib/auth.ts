/**
 * Gemeinsamer Passwortschutz der Seite.
 *
 * Ein Passwort für alle Nutzer, gesetzt über die Umgebungsvariable
 * SITE_PASSWORD (lokal in .env.local, in Produktion in Vercel).
 *
 * Ablauf: Die Login-API vergleicht die Eingabe mit SITE_PASSWORD und setzt
 * bei Erfolg ein httpOnly-Cookie. Der Cookie-Wert ist ein HMAC-Token, das
 * aus dem Passwort abgeleitet wird. Der Proxy (proxy.ts) prüft dieses Token
 * bei jedem Seitenaufruf. Wird das Passwort in Vercel geändert, werden
 * dadurch automatisch alle bestehenden Anmeldungen ungültig.
 *
 * Es wird bewusst nur die Web-Crypto-API verwendet, damit derselbe Code im
 * Edge-Proxy und im Node-Route-Handler läuft.
 */

export const AUTH_COOKIE = "hh_auth";

/** Gültigkeit der Anmeldung: 30 Tage. */
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_MESSAGE = "hygge-homes-analyse-auth-v1";

/** HMAC-SHA-256(Passwort, feste Nachricht) als Hex-String. */
export async function authToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(TOKEN_MESSAGE)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Vergleich zweier Strings ohne frühen Abbruch, damit aus der Antwortzeit
 * keine Rückschlüsse auf übereinstimmende Zeichen möglich sind.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
