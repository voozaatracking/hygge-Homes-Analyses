import { NextResponse } from "next/server";
import {
  createSessionToken,
  MASTER_UID,
  MASTER_USERNAME,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";
import { findUserByUsername, touchLastLogin } from "@/lib/users";

/**
 * Anmeldung mit Benutzername und Passwort.
 *
 * Reihenfolge:
 * 1. Nutzer aus der Tabelle app_users (aktiv, Passwort-Hash stimmt).
 * 2. Master-Admin-Notzugang: Benutzername "admin" mit SITE_PASSWORD.
 *    Funktioniert immer, auch bei leerer Tabelle oder gestörtem Supabase,
 *    damit niemand ausgesperrt werden kann.
 *
 * Bei Erfolg wird ein signiertes, httpOnly-Session-Cookie gesetzt (7 Tage).
 */
export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Auf dem Server ist kein SITE_PASSWORD konfiguriert. In Vercel setzen und neu deployen.",
      },
      { status: 500 }
    );
  }

  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    if (typeof body.username === "string") username = body.username.trim();
    if (typeof body.password === "string") password = body.password;
  } catch {
    // Leerer oder ungültiger Body wird wie falsche Zugangsdaten behandelt.
  }

  // 1) Nutzer aus der Tabelle.
  const user = username ? await findUserByUsername(username) : null;
  if (user) {
    const valid = await verifyPassword(password, user.password_hash);
    if (valid && !user.active) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Der Zugang ist deaktiviert. Bitte an den Administrator wenden.",
        },
        { status: 403 }
      );
    }
    if (valid) {
      await touchLastLogin(user.id);
      return respondWithSession(sitePassword, {
        uid: user.id,
        username: user.username,
        role: user.role,
      });
    }
  }

  // 2) Master-Admin-Notzugang.
  if (
    username.toLowerCase() === MASTER_USERNAME &&
    password === sitePassword
  ) {
    return respondWithSession(sitePassword, {
      uid: MASTER_UID,
      username: MASTER_USERNAME,
      role: "admin",
    });
  }

  return NextResponse.json(
    { ok: false, error: "Benutzername oder Passwort ist falsch." },
    { status: 401 }
  );
}

async function respondWithSession(
  secret: string,
  payload: { uid: string; username: string; role: "admin" | "member" }
) {
  const token = await createSessionToken(payload, secret);
  const response = NextResponse.json({
    ok: true,
    username: payload.username,
    role: payload.role,
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
