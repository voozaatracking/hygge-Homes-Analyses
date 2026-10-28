import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Ziel der Links aus Einladungs- und Passwort-Reset-E-Mails.
 *
 * Unterstützte Varianten:
 * - ?code=…                 PKCE-Code (Reset-Links, die der Browser angefordert hat)
 * - ?token_hash=…&type=…    Token-Hash (E-Mail-Vorlagen mit {{ .TokenHash }},
 *                           siehe README; Einladungen unterstützen kein PKCE)
 * - weder noch              Implizite Variante: Die Sitzung steckt im URL-Fragment,
 *                           das nur der Browser sieht. Weiterleitung auf die
 *                           Zielseite, deren Client die Sitzung übernimmt.
 *
 * Nach Erfolg geht es zu ?next=… (nur seiteninterne Pfade), Standard "/".
 */
const OTP_TYPES: EmailOtpType[] = [
  "invite",
  "recovery",
  "email_change",
  "signup",
  "magiclink",
  "email",
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next") ?? "/";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?error=config", request.url)
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectWithError(request);
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (tokenHash && type && (OTP_TYPES as string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) return redirectWithError(request);
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (params.get("error")) return redirectWithError(request);

  // Kein serverseitig verwertbarer Parameter: Sitzung liegt im Fragment.
  return NextResponse.redirect(new URL(next, request.url));
}

function redirectWithError(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/auth/set-password?error=link", request.url)
  );
}
