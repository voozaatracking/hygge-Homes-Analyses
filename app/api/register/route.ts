import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthClient } from "@/lib/supabase/server";
import { getServiceClient, PROFILES_TABLE } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { REGISTRATION } from "@/lib/config/registration";
import { MIN_PASSWORD_LENGTH, planValidUntil } from "@/lib/registration";
import { findAccountByEmail } from "@/lib/registration-status";

/**
 * Offene Selbstregistrierung mit E-Mail-Bestätigung.
 *
 * POST { email, password, displayName?, website? }
 * - Zod-Validierung, Passwortregel wie /auth/set-password.
 * - Honeypot: "website" muss leer sein; sonst 201 ohne Aktion.
 * - Rate-Limit 10 Versuche je IP und Stunde (In-Memory je Serverinstanz).
 * - Doppelte E-Mail über profiles.email → 409, bei unbestätigtem Konto mit
 *   unconfirmed: true (Resend über /api/register/resend).
 * - signUp über den Server-Client mit Anon-Key ohne Cookies (keine Sitzung);
 *   Supabase verschickt die Bestätigungsmail. Danach Startplan und
 *   Anzeigename per Service-Role in profiles setzen (der Trigger aus
 *   Migration 0002 legt nur id und email an).
 * - 201 ohne sensible Felder. Zugang erst nach Bestätigung und Anmeldung.
 */
export const REGISTER_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };
const limiter = createRateLimiter(REGISTER_RATE_LIMIT);

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  displayName: z.string().trim().max(120).optional().default(""),
  website: z.string().optional().default(""),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unbekannt";
}

const accepted = () =>
  NextResponse.json(
    { ok: true, message: "Bitte E-Mail-Adresse über den Link in der E-Mail bestätigen." },
    { status: 201 }
  );

export async function POST(request: Request) {
  const rate = limiter.check(clientIp(request));
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Registrierungsversuche. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const error =
      field === "email"
        ? "Bitte eine gültige E-Mail-Adresse eingeben."
        : field === "password"
          ? `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`
          : "Die Eingaben sind unvollständig oder ungültig.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
  const { email, password, displayName, website } = parsed.data;

  // Honeypot: Bots füllen das versteckte Feld; nicht informieren.
  if (website.trim() !== "") return accepted();

  const auth = getServerAuthClient();
  const service = getServiceClient();
  if (!auth || !service) {
    return NextResponse.json(
      { ok: false, error: "Die Registrierung ist derzeit nicht verfügbar." },
      { status: 503 }
    );
  }

  // Dublette: 409; bei noch unbestätigtem Konto zusätzlich unconfirmed: true,
  // damit die Seite "Bestätigungsmail erneut senden" anbieten kann.
  const existing = await findAccountByEmail(service, email);
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "Für diese E-Mail-Adresse existiert bereits ein Konto.",
        unconfirmed: !existing.confirmed,
      },
      { status: 409 }
    );
  }

  const origin = new URL(request.url).origin;
  const signedUp = await auth.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });
  if (signedUp.error || !signedUp.data.user) {
    const message = signedUp.error?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      return NextResponse.json(
        { ok: false, error: "Für diese E-Mail-Adresse existiert bereits ein Konto." },
        { status: 409 }
      );
    }
    if (/signups? not allowed|disabled/i.test(message)) {
      return NextResponse.json(
        { ok: false, error: "Die Registrierung ist derzeit geschlossen." },
        { status: 503 }
      );
    }
    if (/rate limit|too many/i.test(message)) {
      return NextResponse.json(
        { ok: false, error: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Die Registrierung ist fehlgeschlagen. Bitte erneut versuchen." },
      { status: 502 }
    );
  }

  // Startplan und Anzeigename setzen; die Profilzeile stammt vom Trigger.
  const patch = {
    plan: REGISTRATION.defaultPlan,
    plan_valid_until: planValidUntil(REGISTRATION.defaultValidDays),
    display_name: displayName || null,
    active: true,
  };
  const updated = await service
    .from(PROFILES_TABLE)
    .update(patch)
    .eq("id", signedUp.data.user.id)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) {
    // Profilzeile (noch) nicht vorhanden: anlegen, damit der Startplan nicht verloren geht.
    await service
      .from(PROFILES_TABLE)
      .upsert({ id: signedUp.data.user.id, email, ...patch });
  }

  return accepted();
}
