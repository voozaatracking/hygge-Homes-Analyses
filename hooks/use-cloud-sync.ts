"use client";

import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { buildAnalysisFile, parseAnalysisFile } from "@/lib/io/json-file";
import { initialSyncState, reduceSync } from "@/lib/sync";

export const CLOUD_SAVE_DELAY_MS = 1200;

/** Vergleichsbasis für "hat sich etwas geändert": nur die Nutzdaten. */
export function serializeData(
  objects: PropertyInput[],
  locations: LocationInput[]
): string {
  return JSON.stringify({ objects, locations });
}

export interface LoadedData {
  objects: PropertyInput[];
  locations: LocationInput[];
}

interface CloudSyncOptions {
  objects: PropertyInput[];
  locations: LocationInput[];
  dirty: boolean;
  /** Serverstand übernehmen (beim Laden und bei "Serverstand laden"). */
  onLoad: (data: LoadedData) => void;
  /** Lokalen Zwischenspeicher wiederherstellen, bevor die Cloud abgeglichen wird. */
  onRestoreAutosave: (data: LoadedData) => void;
  /** Nutzerbezogener Schlüssel des Browser-Zwischenspeichers (wird hier gesetzt). */
  autosaveKeyRef: RefObject<string | null>;
  autosaveKey: string;
}

/**
 * Cloud-Speicherung über /api/data mit Optimistic Lock.
 *
 * Beim Start: Sitzung klären (/api/me), Zwischenspeicher wiederherstellen,
 * dann Cloud abgleichen; vorhandene Cloud-Daten gewinnen. Danach werden
 * Änderungen verzögert gespeichert (letzte bekannte Version wird mitgeschickt).
 * Bei 409 keine stille Wiederholung, sondern Konfliktzustand; der Nutzer
 * entscheidet über resolveConflict.
 */
export function useCloudSync({
  objects,
  locations,
  dirty,
  onLoad,
  onRestoreAutosave,
  autosaveKeyRef,
  autosaveKey,
}: CloudSyncOptions) {
  const [sync, dispatchSync] = useReducer(reduceSync, initialSyncState);
  const restoredRef = useRef(false);
  /** true, sobald der erste Abgleich mit der Cloud abgeschlossen ist. */
  const cloudReadyRef = useRef(false);
  const cloudEnabledRef = useRef(false);
  /** Zuletzt mit der Cloud abgeglichener Datenstand (Schleifenschutz). */
  const lastSyncedRef = useRef<string | null>(null);
  /** Zuletzt bekannte Serverversion der eigenen Zeile (Optimistic Lock). */
  const versionRef = useRef<number | null>(null);
  /** Aktueller Datenstand für Aufrufe außerhalb des Render-Zyklus. */
  const dataRef = useRef({ objects, locations });
  const syncStatusRef = useRef(sync.status);
  const onLoadRef = useRef(onLoad);
  const onRestoreRef = useRef(onRestoreAutosave);
  useEffect(() => {
    dataRef.current = { objects, locations };
    syncStatusRef.current = sync.status;
    onLoadRef.current = onLoad;
    onRestoreRef.current = onRestoreAutosave;
  }, [objects, locations, sync.status, onLoad, onRestoreAutosave]);

  // Beim ersten Laden: Sitzung klären, Zwischenspeicher wiederherstellen,
  // dann Cloud abgleichen. Der Zwischenspeicher ist pro Nutzer getrennt,
  // damit auf einem geteilten Rechner keine Daten zwischen Zugängen wandern.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const start = async () => {
      let uid: string | null = null;
      try {
        const meResponse = await fetch("/api/me", { cache: "no-store" });
        if (meResponse.ok) {
          const me = (await meResponse.json()) as { userId?: string };
          uid = typeof me.userId === "string" ? me.userId : null;
        }
      } catch {
        uid = null;
      }

      if (uid == null) {
        // Keine Sitzung (z. B. Login-Seite): weder Zwischenspeicher noch Cloud.
        cloudReadyRef.current = false;
        dispatchSync({ type: "disabled" });
        return;
      }

      autosaveKeyRef.current = `${autosaveKey}:${uid}`;

      try {
        const stored = window.localStorage.getItem(autosaveKeyRef.current);
        if (stored) {
          const parsed = parseAnalysisFile(stored);
          if (
            parsed.ok &&
            parsed.data &&
            (parsed.data.objects.length > 0 ||
              parsed.data.locations.length > 0)
          ) {
            onRestoreRef.current({
              objects: parsed.data.objects,
              locations: parsed.data.locations,
            });
          }
        }
      } catch {
        // localStorage nicht verfügbar (z. B. blockiert): Feature still deaktivieren.
      }

      await loadFromCloud();
    };

    // Cloud-Abgleich: Vorhandene Cloud-Daten gewinnen beim Laden, damit alle
    // Geräte des Nutzers mit demselben Stand starten. Ein lokaler Stand ohne
    // Cloud-Daten wird anschließend automatisch hochgeladen.
    const loadFromCloud = async () => {
      try {
        const response = await fetch("/api/data", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          if (response.status === 401 || response.status === 403) {
            dispatchSync({ type: "disabled" });
          } else {
            dispatchSync({
              type: "error",
              message:
                body?.error ?? "Cloud nicht erreichbar, Daten bleiben lokal.",
            });
          }
          cloudReadyRef.current = true;
          return;
        }
        const body = (await response.json()) as {
          configured?: boolean;
          payload?: unknown;
          updatedAt?: string | null;
          version?: number | null;
        };
        if (!body.configured) {
          cloudEnabledRef.current = false;
          cloudReadyRef.current = true;
          dispatchSync({ type: "disabled" });
          return;
        }
        cloudEnabledRef.current = true;
        versionRef.current = body.version ?? null;
        if (body.payload != null) {
          const parsed = parseAnalysisFile(JSON.stringify(body.payload));
          if (parsed.ok && parsed.data) {
            const hasData =
              parsed.data.objects.length > 0 ||
              parsed.data.locations.length > 0;
            if (hasData) {
              lastSyncedRef.current = serializeData(
                parsed.data.objects,
                parsed.data.locations
              );
              onLoadRef.current({
                objects: parsed.data.objects,
                locations: parsed.data.locations,
              });
            }
          }
        }
        cloudReadyRef.current = true;
        dispatchSync({
          type: "loaded",
          version: body.version ?? null,
          updatedAt: body.updatedAt ?? null,
        });
      } catch {
        cloudReadyRef.current = true;
        dispatchSync({
          type: "error",
          message: "Cloud nicht erreichbar, Daten bleiben lokal.",
        });
      }
    };
    void start();
  }, [autosaveKey, autosaveKeyRef]);

  /**
   * Speichert den aktuellen Datenstand mit der erwarteten Version.
   * 409 führt in den Konfliktzustand; dort wird nicht still wiederholt.
   */
  const saveToCloud = useCallback(async () => {
    const { objects, locations } = dataRef.current;
    const current = serializeData(objects, locations);
    dispatchSync({ type: "saving" });
    try {
      const file = buildAnalysisFile(objects, locations, "object");
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: versionRef.current, file }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        conflict?: boolean;
        updatedAt?: string | null;
        version?: number | null;
        payload?: unknown;
        error?: string;
      } | null;
      if (response.ok && body?.ok && typeof body.version === "number") {
        lastSyncedRef.current = current;
        versionRef.current = body.version;
        dispatchSync({
          type: "saved",
          version: body.version,
          updatedAt: body.updatedAt ?? new Date().toISOString(),
        });
        return;
      }
      if (response.status === 409 && body?.conflict) {
        dispatchSync({
          type: "conflict",
          version: body.version ?? null,
          payload: body.payload ?? null,
          updatedAt: body.updatedAt ?? null,
        });
        return;
      }
      dispatchSync({
        type: "error",
        message:
          body?.error ?? "Cloud-Speichern fehlgeschlagen, Daten bleiben lokal.",
      });
    } catch {
      dispatchSync({
        type: "error",
        message: "Cloud-Speichern fehlgeschlagen, Daten bleiben lokal.",
      });
    }
  }, []);

  // Änderungen verzögert in die Cloud schreiben. Im Konfliktzustand pausiert.
  useEffect(() => {
    if (!cloudEnabledRef.current || !cloudReadyRef.current) return;
    if (syncStatusRef.current === "conflict") return;
    const current = serializeData(objects, locations);
    if (current === lastSyncedRef.current) return;
    if (objects.length === 0 && locations.length === 0 && !dirty) return;

    const timeout = window.setTimeout(() => {
      void saveToCloud();
    }, CLOUD_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [objects, locations, dirty, saveToCloud]);

  /** Konflikt auflösen: Serverstand laden (lokal verwerfen) oder trotzdem speichern. */
  const resolveConflict = useCallback(
    (mode: "loadServer" | "overwrite") => {
      const conflict = sync.conflict;
      if (!conflict) return;
      versionRef.current = conflict.version;
      if (mode === "loadServer") {
        const parsed =
          conflict.payload != null
            ? parseAnalysisFile(JSON.stringify(conflict.payload))
            : null;
        const objects = parsed?.ok && parsed.data ? parsed.data.objects : [];
        const locations =
          parsed?.ok && parsed.data ? parsed.data.locations : [];
        lastSyncedRef.current = serializeData(objects, locations);
        onLoadRef.current({ objects, locations });
        dispatchSync({ type: "resolve", mode });
        return;
      }
      dispatchSync({ type: "resolve", mode });
      void saveToCloud();
    },
    [sync.conflict, saveToCloud]
  );

  return { sync, resolveConflict };
}
