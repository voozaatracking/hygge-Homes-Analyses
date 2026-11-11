"use client";

import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { buildAnalysisFile, parseAnalysisFile } from "@/lib/io/json-file";
import { initialSyncState, reduceSync } from "@/lib/sync";

export const CLOUD_SAVE_DELAY_MS = 1200;
/** Abstand der Sitzungsprüfung ohne Nutzeraktion (ein Aufruf von /api/me je Tab). */
export const SESSION_CHECK_INTERVAL_MS = 60_000;
/** Marker im Browser: Die Sitzung lief ab, während ungespeicherte Änderungen vorlagen. */
export const PENDING_KEY_PREFIX = "hygge-analyse-pending-v1";

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
  /** true, wenn vor der letzten Abmeldung ungespeicherte Änderungen vorlagen. */
  const pendingRef = useRef(false);

  /**
   * Sitzung abgelaufen (401): aktuellen Stand sofort in den Zwischenspeicher
   * schreiben, Marker setzen und zur Anmeldung leiten. Nichts geht verloren.
   */
  const handleExpired = useCallback(() => {
    const key = autosaveKeyRef.current;
    const { objects, locations } = dataRef.current;
    const hasUnsaved =
      (objects.length > 0 || locations.length > 0) &&
      serializeData(objects, locations) !== lastSyncedRef.current;
    try {
      if (key && (objects.length > 0 || locations.length > 0)) {
        window.localStorage.setItem(
          key,
          JSON.stringify(buildAnalysisFile(objects, locations, "object"))
        );
        // Marker nur, wenn wirklich etwas ungespeichert war; sonst reicht
        // nach der Anmeldung der normale Abgleich (Cloud gewinnt).
        if (hasUnsaved) {
          window.localStorage.setItem(`${PENDING_KEY_PREFIX}:${key}`, "1");
        }
      }
    } catch {
      // Zwischenspeicher nicht verfügbar: Hinweis bleibt, Weiterleitung folgt.
    }
    dispatchSync({ type: "expired" });
    const from = window.location.pathname + window.location.search;
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("reason", "expired");
    if (from && from !== "/") url.searchParams.set("from", from);
    window.location.assign(url.toString());
  }, [autosaveKeyRef]);
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
        const pendingKey = `${PENDING_KEY_PREFIX}:${autosaveKeyRef.current}`;
        pendingRef.current = window.localStorage.getItem(pendingKey) === "1";
        window.localStorage.removeItem(pendingKey);
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
          if (response.status === 401) {
            // Sitzung nach dem Laden der Seite abgelaufen.
            handleExpired();
            return;
          }
          if (response.status === 403) {
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
        const local = dataRef.current;
        const hasLocal = local.objects.length > 0 || local.locations.length > 0;
        if (body.payload != null) {
          const parsed = parseAnalysisFile(JSON.stringify(body.payload));
          if (parsed.ok && parsed.data) {
            const hasData =
              parsed.data.objects.length > 0 ||
              parsed.data.locations.length > 0;
            const differs =
              serializeData(parsed.data.objects, parsed.data.locations) !==
              serializeData(local.objects, local.locations);
            if (hasData && pendingRef.current && hasLocal && differs) {
              // Vor der Abmeldung gab es ungespeicherte Änderungen: Der Nutzer
              // entscheidet zwischen Serverstand und lokalem Stand.
              pendingRef.current = false;
              cloudReadyRef.current = true;
              dispatchSync({
                type: "conflict",
                version: body.version ?? null,
                payload: body.payload,
                updatedAt: body.updatedAt ?? null,
              });
              return;
            }
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
  }, [autosaveKey, autosaveKeyRef, handleExpired]);

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
      if (response.status === 401) {
        handleExpired();
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
  }, [handleExpired]);

  // Sitzung regelmäßig und beim Zurückkehren in den Tab prüfen, damit der
  // Ablauf auch ohne Eingaben oder Seitenwechsel greift (401 → Anmeldung).
  useEffect(() => {
    const check = async () => {
      if (!cloudEnabledRef.current || syncStatusRef.current === "expired") return;
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (response.status === 401) handleExpired();
      } catch {
        // Netzfehler: beim nächsten Intervall erneut prüfen.
      }
    };
    const interval = window.setInterval(() => void check(), SESSION_CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [handleExpired]);

  // Änderungen verzögert in die Cloud schreiben. Im Konfliktzustand pausiert.
  useEffect(() => {
    if (!cloudEnabledRef.current || !cloudReadyRef.current) return;
    if (syncStatusRef.current === "conflict" || syncStatusRef.current === "expired") return;
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
