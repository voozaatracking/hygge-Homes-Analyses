import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Zugangsschutz für alle Seiten (Next 16: proxy.ts statt middleware.ts).
 *
 * Geprüft wird das signierte Session-Cookie (Benutzername/Passwort-Login).
 * Der Status "aktiv" wird zusätzlich bei jedem Datenzugriff in /api/data
 * live geprüft; deaktivierte Nutzer verlieren den Datenzugriff sofort und
 * sehen schlimmstenfalls bis zum Cookie-Ablauf noch die leere Seitenhülle.
 *
 * Ohne gesetztes SITE_PASSWORD bleibt die Seite in der lokalen Entwicklung
 * offen; in Produktion wird auf die Login-Seite geleitet.
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.SITE_PASSWORD;

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
    return redirectToLogin(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token, secret);
  if (session) {
    return NextResponse.next();
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
     * - /login (sonst Weiterleitungsschleife)
     * - /api (API-Routen prüfen die Sitzung selbst und antworten
     *   mit JSON-Statuscodes statt einer HTML-Weiterleitung)
     * - /_next/static und /_next/image (Build-Assets)
     * - Dateien mit Endung (favicon, Bilder aus public/)
     */
    "/((?!api|login|_next/static|_next/image|.*\\..*).*)",
  ],
};
