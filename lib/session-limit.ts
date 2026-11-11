import { SESSION_MAX_MS } from "@/lib/config/session";

/**
 * Höchstdauer der Sitzung: Anker für den Anmeldezeitpunkt und Ablaufprüfung.
 *
 * Quelle des Anmeldezeitpunkts (siehe PR-Beschreibung Paket C):
 * 1. Signiertes httpOnly-Cookie hh_session_start, gebunden an die session_id
 *    aus dem JWT. Es wird beim ersten Request einer Sitzung gesetzt und
 *    verschiebt sich durch Token-Refresh nicht (die session_id bleibt gleich).
 * 2. auth.users.last_sign_in_at als Untergrenze: Löscht der Client das Cookie,
 *    gilt weiterhin der serverseitig gespeicherte Anmeldezeitpunkt. Damit ist
 *    die Grenze vom Client nicht verlängerbar.
 * Der frühere der beiden Zeitpunkte zählt.
 */
export const SESSION_START_COOKIE = "hh_session_start";

export interface SessionStart {
  /** session_id aus dem JWT. */
  sid: string;
  /** Anmeldezeitpunkt in Millisekunden seit Epoche. */
  startedAt: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
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
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/** Signierter Cookie-Wert "v1.<payload>.<hmac>". */
export async function createSessionStartToken(
  start: SessionStart,
  secret: string
): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(start)));
  return `v1.${body}.${await hmacHex(secret, `v1.${body}`)}`;
}

export async function verifySessionStartToken(
  token: string | null | undefined,
  secret: string
): Promise<SessionStart | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const expected = await hmacHex(secret, `${parts[0]}.${parts[1]}`);
  if (!constantTimeEqual(parts[2], expected)) return null;
  const bytes = fromBase64Url(parts[1]);
  if (!bytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as SessionStart;
    if (typeof payload.sid !== "string" || typeof payload.startedAt !== "number") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Wirksamer Anmeldezeitpunkt aus Cookie (nur bei passender session_id) und
 * last_sign_in_at; der frühere zählt. null, wenn keine Quelle vorliegt.
 */
export function effectiveSessionStart(params: {
  cookie: SessionStart | null;
  sid: string | null;
  lastSignInAt: string | null | undefined;
}): number | null {
  const candidates: number[] = [];
  if (params.cookie && params.sid && params.cookie.sid === params.sid) {
    candidates.push(params.cookie.startedAt);
  }
  if (params.lastSignInAt) {
    const t = new Date(params.lastSignInAt).getTime();
    if (Number.isFinite(t)) candidates.push(t);
  }
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

/** true, wenn die Sitzung die Höchstdauer überschritten hat. */
export function isSessionExpired(
  startedAt: number | null,
  now: number = Date.now(),
  maxMs: number = SESSION_MAX_MS
): boolean {
  if (startedAt == null) return false;
  return now - startedAt >= maxMs;
}

/** Serverschlüssel für die Signatur: der Service-Role-Key, nie im Browser. */
export function sessionStartSecret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}
