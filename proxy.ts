import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicKey } from "@/lib/supabase/keys";

/**
 * Zugangsschutz für alle Seiten (Next 16: proxy.ts statt middleware.ts).
 *
 * Liest die Supabase-Sitzung aus den Cookies, frischt sie bei Bedarf auf
 * (Set-Cookie auf Request und Response) und leitet ohne Sitzung auf /login.
 * Hier wird nur die Sitzung geprüft, keine Datenbank: Rolle, Plan und Status
 * prüft das Server-Layout der geschützten Seiten über lib/access.ts.
 *
 * Öffentlich: /login, /auth/*, /no-access. API-Routen prüfen die Sitzung
 * selbst und antworten mit JSON-Statuscodes statt einer HTML-Weiterleitung.
 *
 * Ohne Supabase-Konfiguration bleibt die Seite in der lokalen Entwicklung
 * offen; in Produktion wird auf die Login-Seite geleitet.
 */
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/no-access",
  "/impressum",
  "/datenschutz",
  "/agb",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const pathname = request.nextUrl.pathname;

  if (!url || !key) {
    if (process.env.NODE_ENV !== "production" || isPublic(pathname)) {
      return NextResponse.next();
    }
    return redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Direkt nach dem Erzeugen des Clients die Sitzung prüfen; dazwischen kein
  // weiterer Code, sonst kann eine Auffrischung verloren gehen. getClaims
  // prüft das Token lokal (JWKS) und frischt es bei Ablauf auf.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  // Auth-Antworten dürfen nicht von CDN oder Proxy zwischengespeichert werden.
  response.headers.set("Cache-Control", "private, no-store");

  if (isPublic(pathname)) {
    if (signedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!signedIn) return redirectToLogin(request);
  return response;
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
     * - /api (API-Routen prüfen die Sitzung selbst)
     * - /_next/static und /_next/image (Build-Assets)
     * - Dateien mit Endung (favicon, Bilder aus public/)
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
