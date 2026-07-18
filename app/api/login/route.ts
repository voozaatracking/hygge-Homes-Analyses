import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE_SECONDS,
  authToken,
  timingSafeEqual,
} from "@/lib/auth";

/**
 * Nimmt das eingegebene Passwort entgegen, vergleicht es mit SITE_PASSWORD
 * und setzt bei Erfolg das httpOnly-Auth-Cookie.
 *
 * Verglichen werden die HMAC-Ableitungen beider Werte, nicht die Klartexte.
 * Dadurch ist der Vergleich unabhängig von der Passwortlänge und ohne
 * verwertbare Zeitunterschiede.
 */
export async function POST(request: Request) {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Auf dem Server ist kein Zugangspasswort konfiguriert. In Vercel die Umgebungsvariable SITE_PASSWORD setzen und neu deployen.",
      },
      { status: 500 }
    );
  }

  let submitted = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") {
      submitted = body.password;
    }
  } catch {
    // Ungültiger oder fehlender Body: wird wie ein leeres Passwort behandelt.
  }

  const expectedToken = await authToken(password);
  const submittedToken = await authToken(submitted);

  if (!timingSafeEqual(submittedToken, expectedToken)) {
    return NextResponse.json(
      { ok: false, error: "Falsches Passwort." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: expectedToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  return response;
}
