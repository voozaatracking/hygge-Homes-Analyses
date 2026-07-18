/**
 * Passwort-Hashing für die interne Nutzerverwaltung.
 * PBKDF2-SHA-256 mit 100.000 Iterationen und zufälligem Salt,
 * nur über die Web-Crypto-API (Node-Route-Handler und Tests).
 * Format: "pbkdf2$<iterationen>$<saltHex>$<hashHex>".
 */

const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    key,
    KEY_LENGTH_BYTES * 8
  );
  return toHex(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2]);
  if (!salt || !Number.isFinite(iterations) || iterations < 1) return false;
  const expected = parts[3];
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < actual.length; i++) {
    result |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
