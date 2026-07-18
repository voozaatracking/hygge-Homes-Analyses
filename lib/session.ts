/**
 * Eigenbau-Sessions als bewusster Zwischenschritt vor Supabase Auth.
 *
 * Aufbau des Cookies: "v1.<base64url(JSON-Payload)>.<HMAC-Hex>".
 * Payload: { uid, username, role, exp }. Signiert wird mit SITE_PASSWORD
 * als Serverschlüssel; eine Änderung des SITE_PASSWORD meldet damit
 * automatisch alle Sitzungen ab. Nur Web-Crypto, läuft in Edge und Node.
 */

export const SESSION_COOKIE = "hh_session";

/** Gültigkeit einer Sitzung: 7 Tage. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Kennung des Master-Admin-Zugangs (Benutzername "admin" + SITE_PASSWORD). */
export const MASTER_UID = "master";
export const MASTER_USERNAME = "admin";

export type SessionRole = "admin" | "member";

export interface SessionPayload {
  uid: string;
  username: string;
  role: SessionRole;
  /** Ablaufzeitpunkt in Sekunden seit Epoche. */
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Erstellt den signierten Cookie-Wert einer Sitzung. */
export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(full)));
  const signature = await hmacHex(secret, `v1.${body}`);
  return `v1.${body}.${signature}`;
}

/** Prüft Signatur und Ablauf; liefert die Payload oder null. */
export async function verifySessionToken(
  token: string | null | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [version, body, signature] = parts;

  const expected = await hmacHex(secret, `${version}.${body}`);
  if (!constantTimeEqual(signature, expected)) return null;

  const bytes = fromBase64Url(body);
  if (!bytes) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(bytes)
    ) as SessionPayload;
    if (
      typeof payload.uid !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "member") ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Liest den Wert eines Cookies aus einem rohen Cookie-Header. */
export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

/** Bequemer Helfer für API-Routen: Session aus dem Request lesen. */
export async function sessionFromRequest(
  request: Request
): Promise<SessionPayload | null> {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) return null;
  return verifySessionToken(
    readSessionCookie(request.headers.get("cookie")),
    secret
  );
}
