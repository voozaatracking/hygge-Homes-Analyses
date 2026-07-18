import { NextResponse } from "next/server";
import { hasValidAuthCookie } from "@/lib/auth";
import {
  ANALYSIS_TABLE,
  getServiceClient,
  SHARED_ROW_ID,
} from "@/lib/supabase-server";
import { parseAnalysisFile } from "@/lib/io/json-file";

/**
 * Gemeinsamer Datenstand in Supabase (eine Zeile mit dem kompletten,
 * versionierten Analyse-JSON, Prinzip "letzter Schreiber gewinnt").
 *
 * GET  → { configured, payload, updatedAt }
 * PUT  → speichert einen validierten Analyse-Datenstand
 *
 * Beide Methoden verlangen das Auth-Cookie des Passwortschutzes und
 * antworten mit JSON-Statuscodes (kein HTML-Redirect wie der Proxy).
 */

async function requireAuth(request: Request): Promise<NextResponse | null> {
  const ok = await hasValidAuthCookie(request.headers.get("cookie"));
  if (ok) return null;
  return NextResponse.json(
    { ok: false, error: "Nicht angemeldet." },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  const denied = await requireAuth(request);
  if (denied) return denied;

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
    .eq("id", SHARED_ROW_ID)
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
  const denied = await requireAuth(request);
  if (denied) return denied;

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
    id: SHARED_ROW_ID,
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
