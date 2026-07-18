import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, timingSafeEqual } from "@/lib/auth";

/**
 * Passwortschutz für die gesamte Seite (Next 16: proxy.ts statt middleware.ts).
 *
 * Ausgenommen sind die Login-Seite, die Login-API, Next-interne Assets und
 * statische Dateien (alles mit Dateiendung), siehe matcher unten.
 *
 * Ohne gesetzte Umgebungsvariable SITE_PASSWORD bleibt die Seite in der
 * lokalen Entwicklung offen. In Produktion wird in dem Fall auf die
 * Login-Seite geleitet, die auf die fehlende Konfiguration hinweist.
 */
export async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
    return redirectToLogin(request);
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie) {
    const expected = await authToken(password);
    if (timingSafeEqual(cookie, expected)) {
      return NextResponse.next();
    }
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from && from !== "/") {
    url.searchParams.set("from", from);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Alles prüfen außer:
     * - /login und /api/login (sonst Weiterleitungsschleife)
     * - /_next/static und /_next/image (Build-Assets)
     * - Dateien mit Endung (favicon, Bilder aus public/)
     */
    "/((?!login|api/login|_next/static|_next/image|.*\\..*).*)",
  ],
};
