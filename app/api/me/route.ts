import { NextResponse } from "next/server";
import { getAccess, getSessionUser, toPublicAccess } from "@/lib/access";

/**
 * Liefert das Access-Objekt des angemeldeten Nutzers ohne interne Felder.
 * 401 ohne Sitzung. Ein Nutzer ohne Profil (sollte nach dem Trigger nicht
 * vorkommen) wird wie ein Nutzer ohne Zugang behandelt.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Nicht angemeldet." },
      { status: 401 }
    );
  }
  const access = await getAccess(user.id);
  if (!access) {
    return NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      displayName: null,
      role: "member",
      plan: "none",
      planValidUntil: null,
      hasAccess: false,
      isAdmin: false,
    });
  }
  return NextResponse.json({ ok: true, ...toPublicAccess(access) });
}
