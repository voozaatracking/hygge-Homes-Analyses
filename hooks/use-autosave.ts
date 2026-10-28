"use client";

import { useEffect, type RefObject } from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { buildAnalysisFile } from "@/lib/io/json-file";

export const AUTOSAVE_KEY = "hygge-analyse-autosave-v1";
export const AUTOSAVE_DELAY_MS = 800;

/**
 * Automatische Zwischenspeicherung im Browser (localStorage), damit ein
 * versehentlicher Reload keine Eingaben mehr löscht. Der JSON-Export bleibt
 * die dauerhafte Sicherung; gespeichert wird dasselbe versionierte Format.
 * Der Schlüssel ist nutzerbezogen und liegt in einem Ref, weil er erst nach
 * dem Laden der Sitzung bekannt ist.
 */
export function useAutosave(
  keyRef: RefObject<string | null>,
  objects: PropertyInput[],
  locations: LocationInput[],
  dirty: boolean
) {
  // Änderungen verzögert in den Browser-Zwischenspeicher schreiben.
  useEffect(() => {
    const key = keyRef.current;
    if (!key) return;
    const timeout = window.setTimeout(() => {
      try {
        if (objects.length === 0 && locations.length === 0) {
          // Nur nach bewusstem Leeren entfernen, nie beim ersten Start.
          if (dirty) window.localStorage.removeItem(key);
          return;
        }
        const file = buildAnalysisFile(objects, locations, "object");
        window.localStorage.setItem(key, JSON.stringify(file));
      } catch {
        // Speicher voll oder blockiert: Zwischenspeicherung überspringen.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [keyRef, objects, locations, dirty]);

  // Schutz vor Datenverlust: Browser-Warnung bei ungespeicherten Änderungen.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty && (objects.length > 0 || locations.length > 0)) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, objects.length, locations.length]);
}
