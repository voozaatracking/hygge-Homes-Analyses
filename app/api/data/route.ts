import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { ANALYSIS_TABLE, getServiceClient } from "@/lib/supabase/admin";
import { parseAnalysisFile } from "@/lib/io/json-file";

/**
 * Datenstand pro Nutzer in Supabase (eine Zeile je Nutzer mit dem kompletten,
 * versionierten Analyse-JSON). Zeilenschlüssel ist die Auth-ID.
 * Zugriff: 401 ohne Sitzung, 403 ohne aktiven Plan (lib/access.ts).
 *
 * Optimistic Lock: GET liefert `version` mit. PUT erwartet
 * { expectedVersion, file }: Der Server aktualisiert nur, wenn die gespeicherte
 * Version mit expectedVersion übereinstimmt (bedingtes Update in einer
 * Anweisung), erhöht sie und liefert sie zurück. Bei Abweichung 409 mit
 * aktueller Version und aktuellem Payload. Erste Speicherung einer noch nicht
 * vorhandenen Zeile: expectedVersion null, Anlage mit Version 1.
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
      version: null,
    });
  }

  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .select("payload, updated_at, version")
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
    version: data?.version ?? null,
  });
}

function storeError() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Die Cloud-Daten konnten nicht gespeichert werden. Supabase-Konfiguration und Tabelle prüfen.",
    },
    { status: 502 }
  );
}

export async function PUT(request: Request) {
  const result = await requireAccess();
  if ("response" in result) return result.response;
  const userId = result.access.userId;

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

  let envelope: { expectedVersion?: unknown; file?: unknown } = {};
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") {
      envelope = body as { expectedVersion?: unknown; file?: unknown };
    }
  } catch {
    envelope = {};
  }

  const expectedVersion =
    typeof envelope.expectedVersion === "number" &&
    Number.isInteger(envelope.expectedVersion) &&
    envelope.expectedVersion >= 1
      ? envelope.expectedVersion
      : envelope.expectedVersion == null
        ? null
        : undefined;
  if (expectedVersion === undefined) {
    return NextResponse.json(
      { ok: false, error: "Ungültige erwartete Version." },
      { status: 400 }
    );
  }

  const parsed = parseAnalysisFile(
    envelope.file === undefined ? "" : JSON.stringify(envelope.file)
  );
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

  if (expectedVersion == null) {
    // Erstanlage: Zeile darf noch nicht existieren.
    const { error } = await supabase.from(ANALYSIS_TABLE).insert({
      id: userId,
      payload: parsed.data,
      updated_at: updatedAt,
      version: 1,
    });
    if (error) {
      if (error.code === "23505") return conflictResponse(supabase, userId);
      return storeError();
    }
    return NextResponse.json({ ok: true, updatedAt, version: 1 });
  }

  // Bedingtes Update: nur wenn die gespeicherte Version noch die erwartete ist.
  const nextVersion = expectedVersion + 1;
  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .update({ payload: parsed.data, updated_at: updatedAt, version: nextVersion })
    .eq("id", userId)
    .eq("version", expectedVersion)
    .select("version")
    .maybeSingle();
  if (error) return storeError();
  if (!data) return conflictResponse(supabase, userId);

  return NextResponse.json({ ok: true, updatedAt, version: nextVersion });
}

/** 409 mit dem aktuellen Serverstand, damit der Client entscheiden kann. */
async function conflictResponse(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  userId: string
) {
  const { data } = await supabase
    .from(ANALYSIS_TABLE)
    .select("payload, updated_at, version")
    .eq("id", userId)
    .maybeSingle();
  return NextResponse.json(
    {
      ok: false,
      conflict: true,
      error:
        "Der Datenstand wurde inzwischen an anderer Stelle geändert. Bitte Serverstand laden oder trotzdem speichern.",
      version: data?.version ?? null,
      payload: data?.payload ?? null,
      updatedAt: data?.updated_at ?? null,
    },
    { status: 409 }
  );
}
