import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/session";

/** Liefert die aktuelle Sitzung (Benutzername, Rolle, Kennung). */
export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Nicht angemeldet." },
      { status: 401 }
    );
  }
  return NextResponse.json({
    ok: true,
    uid: session.uid,
    username: session.username,
    role: session.role,
  });
}
