import { NextResponse } from "next/server";
import { ANALYSIS_TABLE, getServiceClient } from "@/lib/supabase-server";

/**
 * Keep-alive für Supabase Free: Projekte werden nach etwa einer Woche ohne
 * Aktivität pausiert. Vercel ruft diese Route täglich per Cron auf
 * (vercel.json) und löst damit eine minimale Leseabfrage aus.
 *
 * Zugriffsschutz: Vercel sendet "Authorization: Bearer <CRON_SECRET>", sobald
 * die Umgebungsvariable CRON_SECRET existiert. Ohne gesetztes Secret oder mit
 * falschem Header wird abgelehnt (fail closed).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header || !constantTimeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json(
      { ok: false, error: "Nicht autorisiert." },
      { status: 401 }
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Cloud-Speicherung ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from(ANALYSIS_TABLE)
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Die Leseabfrage ist fehlgeschlagen. Supabase-Konfiguration prüfen.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
