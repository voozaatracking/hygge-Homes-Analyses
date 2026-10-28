import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { ANALYSIS_TABLE, getServiceClient } from "@/lib/supabase/admin";
import { parseAnalysisFile } from "@/lib/io/json-file";

/**
 * Datenstand pro Nutzer in Supabase (eine Zeile je Nutzer mit dem kompletten,
 * versionierten Analyse-JSON, Prinzip "letzter Schreiber gewinnt").
 *
 * Zeilenschlüssel ist die Auth-ID. Zugriff: 401 ohne Sitzung, 403 ohne
 * aktiven Plan (lib/access.ts). Neue Nutzer starten leer; Übergabe von Daten
 * läuft bewusst über JSON-Export und -Import.
 */

export async function GET() {
  const result = await requireAccess();
  if ("response" in result) return result.response;

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
    .eq("id", result.access.userId)
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
  const result = await requireAccess();
  if ("response" in result) return result.response;

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
    id: result.access.userId,
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
