import { NextResponse } from "next/server";
import { MASTER_UID, sessionFromRequest } from "@/lib/session";
import { hashPassword } from "@/lib/passwords";
import {
  createUser,
  deleteUserAndData,
  findUserById,
  isValidUsername,
  listUsers,
  normalizeUsername,
  toPublicUser,
  updateUser,
} from "@/lib/users";
import { MASTER_USERNAME } from "@/lib/session";

/**
 * Admin-API der Nutzerverwaltung. Nur für Sitzungen mit Rolle "admin".
 *
 * GET    → Liste aller Nutzer (ohne Passwort-Hashes)
 * POST   → Nutzer anlegen { username, password, role }
 * PATCH  → { id, action: "activate" | "deactivate" | "resetPassword", newPassword? }
 * DELETE → { id } entfernt Nutzer und dessen Datenstand
 */

const MIN_PASSWORD_LENGTH = 8;

async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const session = await sessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Nicht angemeldet." },
      { status: 401 }
    );
  }
  if (session.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Nur für Administratoren." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const users = await listUsers();
  if (users == null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nutzerliste nicht verfügbar. Supabase-Konfiguration und Tabelle app_users prüfen (supabase/schema.sql ausführen).",
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let username = "";
  let password = "";
  let role: "admin" | "member" = "member";
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
    };
    if (typeof body.username === "string") username = body.username;
    if (typeof body.password === "string") password = body.password;
    if (body.role === "admin" || body.role === "member") role = body.role;
  } catch {
    // wird unten als ungültig behandelt
  }

  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ungültiger Benutzername: 3 bis 32 Zeichen, Kleinbuchstaben, Ziffern sowie . _ - (nicht am Rand).",
      },
      { status: 400 }
    );
  }
  if (normalized === MASTER_USERNAME) {
    return NextResponse.json(
      {
        ok: false,
        error: `Der Benutzername "${MASTER_USERNAME}" ist für den Master-Zugang reserviert.`,
      },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Das Startpasswort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
      },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const result = await createUser({ username: normalized, passwordHash, role });
  if (!result.user) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Anlegen fehlgeschlagen." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, user: result.user });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let id = "";
  let action = "";
  let newPassword = "";
  try {
    const body = (await request.json()) as {
      id?: unknown;
      action?: unknown;
      newPassword?: unknown;
    };
    if (typeof body.id === "string") id = body.id;
    if (typeof body.action === "string") action = body.action;
    if (typeof body.newPassword === "string") newPassword = body.newPassword;
  } catch {
    // wird unten als ungültig behandelt
  }

  if (id === MASTER_UID) {
    return NextResponse.json(
      { ok: false, error: "Der Master-Zugang wird nicht über die Liste verwaltet." },
      { status: 400 }
    );
  }

  const user = await findUserById(id);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Nutzer nicht gefunden." },
      { status: 404 }
    );
  }

  if (action === "activate" || action === "deactivate") {
    const ok = await updateUser(id, { active: action === "activate" });
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Änderung fehlgeschlagen." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      user: toPublicUser({ ...user, active: action === "activate" }),
    });
  }

  if (action === "resetPassword") {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Das neue Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
        },
        { status: 400 }
      );
    }
    const passwordHash = await hashPassword(newPassword);
    const ok = await updateUser(id, { password_hash: passwordHash });
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Zurücksetzen fehlgeschlagen." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, user: toPublicUser(user) });
  }

  return NextResponse.json(
    { ok: false, error: "Unbekannte Aktion." },
    { status: 400 }
  );
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let id = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id === "string") id = body.id;
  } catch {
    // wird unten als ungültig behandelt
  }

  if (!id || id === MASTER_UID) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Nutzer-Kennung." },
      { status: 400 }
    );
  }

  const ok = await deleteUserAndData(id);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Löschen fehlgeschlagen." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
