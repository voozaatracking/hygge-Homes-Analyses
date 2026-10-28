import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getGeocodeProvider, normalizeAddressInput } from "@/lib/geo/geocode";
import { createRateLimiter } from "@/lib/rate-limit";

/** 30 Anfragen pro Nutzer und Stunde (je Serverinstanz, siehe lib/rate-limit.ts). */
export const GEOCODE_RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 };
const limiter = createRateLimiter(GEOCODE_RATE_LIMIT);

/**
 * Geokodierung eines Adresstexts, nur für angemeldete Nutzer mit Zugang,
 * begrenzt auf 30 Anfragen pro Nutzer und Stunde (429 mit Retry-After).
 * POST { address } → { ok, lat, lng, displayName } oder { ok: false, error }.
 * Der Anbieter ist hinter lib/geo/geocode.ts austauschbar.
 */
export async function POST(request: Request) {
  const access = await requireAccess();
  if ("response" in access) return access.response;

  const rate = limiter.check(access.access.userId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Zu viele Adressabfragen. Bitte in etwa ${Math.ceil(rate.retryAfterSeconds / 60)} Minuten erneut versuchen.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: { address?: unknown } = {};
  try {
    body = (await request.json()) as { address?: unknown };
  } catch {
    body = {};
  }
  const address = normalizeAddressInput(body.address);
  if (!address) {
    return NextResponse.json(
      { ok: false, error: "Bitte eine Adresse mit mindestens 3 Zeichen eingeben." },
      { status: 400 }
    );
  }

  // User-Agent mit Anwendung und Kontakt (Nutzungsbedingungen von Nominatim).
  const origin = new URL(request.url).origin;
  const provider = getGeocodeProvider(`hygge-homes-analyse/1.0 (${origin})`);
  const outcome = await provider.geocode(address);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...outcome.result });
}
