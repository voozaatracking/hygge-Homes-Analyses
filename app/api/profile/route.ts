import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getServiceClient, PROFILES_TABLE } from "@/lib/supabase/admin";
import {
  parseProfileSettings,
  validateProfileSettings,
} from "@/lib/profile/settings";

/**
 * Profil des angemeldeten Nutzers.
 * GET  → display_name, email, plan, plan_valid_until, settings (mit Defaults)
 * PUT  → { displayName?, settings? } aktualisiert Anzeigename und Einstellungen
 *        (Zod-validiert, 400 bei Fehler). E-Mail und Plan sind hier nicht änderbar.
 */
export async function GET() {
  const result = await requireAccess();
  if ("response" in result) return result.response;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Cloud-Speicherung ist nicht konfiguriert." },
      { status: 503 }
    );
  }
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("display_name, email, plan, plan_valid_until, settings")
    .eq("id", result.access.userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Das Profil konnte nicht geladen werden." },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    displayName: (data.display_name as string | null) ?? null,
    email: data.email as string,
    plan: data.plan as string,
    planValidUntil: (data.plan_valid_until as string | null) ?? null,
    settings: parseProfileSettings(data.settings),
  });
}

export async function PUT(request: Request) {
  const result = await requireAccess();
  if ("response" in result) return result.response;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Cloud-Speicherung ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  let body: { displayName?: unknown; settings?: unknown } = {};
  try {
    const raw = (await request.json()) as unknown;
    if (raw && typeof raw === "object") body = raw as typeof body;
  } catch {
    body = {};
  }

  const patch: Record<string, unknown> = {};
  if (body.displayName !== undefined) {
    if (body.displayName !== null && typeof body.displayName !== "string") {
      return NextResponse.json(
        { ok: false, error: "Der Anzeigename muss ein Text sein." },
        { status: 400 }
      );
    }
    const name = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (name.length > 120) {
      return NextResponse.json(
        { ok: false, error: "Der Anzeigename darf höchstens 120 Zeichen haben." },
        { status: 400 }
      );
    }
    patch.display_name = name === "" ? null : name;
  }
  if (body.settings !== undefined) {
    const validated = validateProfileSettings(body.settings);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }
    patch.settings = validated.data;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Keine Änderungen übermittelt." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(patch)
    .eq("id", result.access.userId)
    .select("display_name, settings")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Das Profil konnte nicht gespeichert werden." },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    displayName: (data.display_name as string | null) ?? null,
    settings: parseProfileSettings(data.settings),
  });
}
