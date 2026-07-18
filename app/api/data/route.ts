import { NextResponse } from "next/server";
import { MASTER_UID, sessionFromRequest } from "@/lib/session";
import {
  ANALYSIS_TABLE,
  getServiceClient,
  SHARED_ROW_ID,
} from "@/lib/supabase-server";
import { parseAnalysisFile } from "@/lib/io/json-file";
import { findUserById } from "@/lib/users";

/**
 * Datenstand pro Nutzer in Supabase (eine Zeile je Nutzer mit dem kompletten,
 * versionierten Analyse-JSON, Prinzip "letzter Schreiber gewinnt").
 *
 * Zeilenschlüssel: die Nutzer-Kennung; der Master-Admin arbeitet auf der
 * bisherigen Zeile "shared", der bestehende Datenstand bleibt damit beim
 * Admin-Zugang. Neue Nutzer starten leer; Übergabe von Daten läuft bewusst
 * über JSON-Export und -Import.
 */

async function resolveAccess(request: Request): Promise<
  | { response: NextResponse }
  | { rowId: string }
> {
  const session = await sessionFromRequest(request);
  if (!session) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 }
      ),
    };
  }
  if (session.uid === MASTER_UID) {
    return { rowId: SHARED_ROW_ID };
  }
  // Status live prüfen: Deaktivierte Nutzer verlieren den Datenzugriff sofort.
  const user = await findUserById(session.uid);
  if (!user || !user.active) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Der Zugang ist deaktiviert oder wurde entfernt.",
        },
        { status: 403 }
      ),
    };
  }
  return { rowId: session.uid };
}

export async function GET(request: Request) {
  const access = await resolveAccess(request);
  if ("response" in access) return access.response;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      configured: false,
      payload: null,
      updatedAt: null,
    });
  }

  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .select("payload, updated_at")
    .eq("id", access.rowId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error:
          "Die Cloud-Daten konnten nicht geladen werden. Supabase-Konfiguration und Tabelle prüfen.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    payload: data?.payload ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const access = await resolveAccess(request);
  if ("response" in access) return access.response;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: "Cloud-Speicherung ist nicht konfiguriert.",
      },
      { status: 503 }
    );
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    bodyText = "";
  }

  const parsed = parseAnalysisFile(bodyText);
  if (!parsed.ok || !parsed.data) {
    return NextResponse.json(
      {
        ok: false,
        error: `Der Datenstand wurde nicht gespeichert: ${parsed.error ?? "ungültiges Format."}`,
      },
      { status: 400 }
    );
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from(ANALYSIS_TABLE).upsert({
    id: access.rowId,
    payload: parsed.data,
    updated_at: updatedAt,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Die Cloud-Daten konnten nicht gespeichert werden. Supabase-Konfiguration und Tabelle prüfen.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, updatedAt });
}
