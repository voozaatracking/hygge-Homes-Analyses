import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Meldet ab: Supabase-Sitzung beenden, Auth-Cookies werden geleert. */
export async function POST() {
  const supabase = await getServerSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
