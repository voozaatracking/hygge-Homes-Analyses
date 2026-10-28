"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseProfileSettings,
  type ProfileSettings,
} from "@/lib/profile/settings";

export interface ProfileInfo {
  displayName: string | null;
  email: string;
  plan: string;
  planValidUntil: string | null;
  settings: ProfileSettings;
}

/**
 * Lädt das Profil (/api/profile) beim Start und hält es im Kontext, damit
 * neue Objekte die Standardannahmen des Nutzers erhalten. Ohne Sitzung
 * (z. B. Login-Seite) bleibt es null.
 */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) {
        setProfile(null);
        return null;
      }
      const body = (await response.json()) as {
        ok?: boolean;
        displayName?: string | null;
        email?: string;
        plan?: string;
        planValidUntil?: string | null;
        settings?: unknown;
      };
      if (!body.ok) {
        setProfile(null);
        return null;
      }
      const next: ProfileInfo = {
        displayName: body.displayName ?? null,
        email: body.email ?? "",
        plan: body.plan ?? "none",
        planValidUntil: body.planValidUntil ?? null,
        settings: parseProfileSettings(body.settings),
      };
      setProfile(next);
      return next;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Entkoppelt vom Render-Zyklus.
    const timeout = window.setTimeout(() => void refreshProfile(), 0);
    return () => window.clearTimeout(timeout);
  }, [refreshProfile]);

  return { profile, refreshProfile };
}
