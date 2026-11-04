import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { findAccountByEmail } from "@/lib/registration-status";

/**
 * Bestätigungsmail erneut senden. POST { email }.
 * Rate-Limit 3 je E-Mail und 10 je IP pro Stunde (In-Memory je Serverinstanz).
 * Versand nur, wenn ein Konto existiert und noch unbestätigt ist; die Antwort
 * ist immer dieselbe neutrale 200, damit keine Rückschlüsse auf fremde
 * Konten möglich sind.
 */
export const RESEND_RATE_LIMIT_EMAIL = { limit: 3, windowMs: 60 * 60 * 1000 };
export const RESEND_RATE_LIMIT_IP = { limit: 10, windowMs: 60 * 60 * 1000 };
const byEmail = createRateLimiter(RESEND_RATE_LIMIT_EMAIL);
const byIp = createRateLimiter(RESEND_RATE_LIMIT_IP);

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const NEUTRAL_MESSAGE =
  "Falls ein unbestätigtes Konto zu dieser Adresse existiert, haben wir die Bestätigungsmail erneut gesendet.";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unbekannt";
}

const neutral = () => NextResponse.json({ ok: true, message: NEUTRAL_MESSAGE });

export async function POST(request: Request) {
  const ipRate = byIp.check(clientIp(request));
  if (!ipRate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(ipRate.retryAfterSeconds) } }
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
    return NextResponse.json(
      { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." },
      { status: 400 }
    );
  }
  const email = parsed.data.email;

  const emailRate = byEmail.check(email);
  if (!emailRate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Für diese Adresse wurden bereits mehrere Bestätigungsmails angefordert. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(emailRate.retryAfterSeconds) } }
    );
  }

  const service = getServiceClient();
  const auth = getServerAuthClient();
  if (!service || !auth) return neutral();

  const account = await findAccountByEmail(service, email);
  if (!account || account.confirmed) return neutral();

  const origin = new URL(request.url).origin;
  await auth.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/` },
  });
  // Fehler bewusst nicht unterscheiden: Antwort bleibt neutral.
  return neutral();
}
