"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { emptyLocation, emptyProperty } from "@/lib/utils";
import { buildAnalysisFile, parseAnalysisFile } from "@/lib/io/json-file";

/**
 * Automatische Zwischenspeicherung im Browser (localStorage), damit ein
 * versehentlicher Reload keine Eingaben mehr löscht. Der JSON-Export bleibt
 * die dauerhafte Sicherung; gespeichert wird dasselbe versionierte Format.
 */
const AUTOSAVE_KEY = "hygge-analyse-autosave-v1";
const AUTOSAVE_DELAY_MS = 800;

interface AnalysisState {
  objects: PropertyInput[];
  locations: LocationInput[];
  /** true, sobald ungespeicherte Änderungen vorliegen (Schutz vor Datenverlust). */
  dirty: boolean;
}

type Action =
  | { type: "addObject" }
  | { type: "updateObject"; object: PropertyInput }
  | { type: "removeObject"; id: string }
  | { type: "duplicateObject"; id: string }
  | { type: "addObjects"; objects: PropertyInput[] }
  | { type: "addLocation" }
  | { type: "updateLocation"; location: LocationInput }
  | { type: "removeLocation"; id: string }
  | { type: "duplicateLocation"; id: string }
  | { type: "addLocations"; locations: LocationInput[] }
  | { type: "loadFile"; objects: PropertyInput[]; locations: LocationInput[] }
  | {
      type: "restoreAutosave";
      objects: PropertyInput[];
      locations: LocationInput[];
    }
  | { type: "resetObjects" }
  | { type: "resetLocations" }
  | { type: "markSaved" };

const initialState: AnalysisState = {
  objects: [],
  locations: [],
  dirty: false,
};

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case "addObject":
      return {
        ...state,
        dirty: true,
        objects: [
          ...state.objects,
          emptyProperty(`Objekt ${state.objects.length + 1}`),
        ],
      };
    case "updateObject":
      return {
        ...state,
        dirty: true,
        objects: state.objects.map((o) =>
          o.id === action.object.id ? action.object : o
        ),
      };
    case "removeObject":
      return {
        ...state,
        dirty: true,
        objects: state.objects.filter((o) => o.id !== action.id),
      };
    case "duplicateObject": {
      const source = state.objects.find((o) => o.id === action.id);
      if (!source) return state;
      const copy: PropertyInput = structuredClone(source);
      copy.id = emptyProperty("").id;
      copy.name = `${source.name} (Kopie)`;
      const index = state.objects.findIndex((o) => o.id === action.id);
      const objects = [...state.objects];
      objects.splice(index + 1, 0, copy);
      return { ...state, dirty: true, objects };
    }
    case "addObjects":
      return {
        ...state,
        dirty: true,
        objects: [...state.objects, ...action.objects],
      };
    case "addLocation":
      return {
        ...state,
        dirty: true,
        locations: [
          ...state.locations,
          emptyLocation(`Standort ${state.locations.length + 1}`),
        ],
      };
    case "updateLocation":
      return {
        ...state,
        dirty: true,
        locations: state.locations.map((l) =>
          l.id === action.location.id ? action.location : l
        ),
      };
    case "removeLocation":
      return {
        ...state,
        dirty: true,
        locations: state.locations.filter((l) => l.id !== action.id),
      };
    case "duplicateLocation": {
      const source = state.locations.find((l) => l.id === action.id);
      if (!source) return state;
      const copy: LocationInput = structuredClone(source);
      copy.id = emptyLocation("").id;
      copy.name = `${source.name} (Kopie)`;
      const index = state.locations.findIndex((l) => l.id === action.id);
      const locations = [...state.locations];
      locations.splice(index + 1, 0, copy);
      return { ...state, dirty: true, locations };
    }
    case "addLocations":
      return {
        ...state,
        dirty: true,
        locations: [...state.locations, ...action.locations],
      };
    case "loadFile":
      return {
        objects: action.objects,
        locations: action.locations,
        dirty: false,
      };
    case "restoreAutosave":
      // Nie über bereits begonnene Eingaben schreiben.
      if (state.objects.length > 0 || state.locations.length > 0) return state;
      return {
        objects: action.objects,
        locations: action.locations,
        dirty: false,
      };
    case "resetObjects":
      return { ...state, dirty: true, objects: [] };
    case "resetLocations":
      return { ...state, dirty: true, locations: [] };
    case "markSaved":
      return { ...state, dirty: false };
    default:
      return state;
  }
}

/** Status der Cloud-Speicherung (Supabase über /api/data). */
export interface SyncInfo {
  status: "checking" | "disabled" | "synced" | "saving" | "error";
  lastSavedAt: string | null;
  message: string | null;
}

const CLOUD_SAVE_DELAY_MS = 1200;

/** Vergleichsbasis für "hat sich etwas geändert": nur die Nutzdaten. */
function serializeData(
  objects: PropertyInput[],
  locations: LocationInput[]
): string {
  return JSON.stringify({ objects, locations });
}

const AnalysisContext = createContext<{
  state: AnalysisState;
  dispatch: (action: Action) => void;
  sync: SyncInfo;
} | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [sync, setSync] = useState<SyncInfo>({
    status: "checking",
    lastSavedAt: null,
    message: null,
  });
  const restoredRef = useRef(false);
  /** true, sobald der erste Abgleich mit der Cloud abgeschlossen ist. */
  const cloudReadyRef = useRef(false);
  const cloudEnabledRef = useRef(false);
  /** Zuletzt mit der Cloud abgeglichener Datenstand (Schleifenschutz). */
  const lastSyncedRef = useRef<string | null>(null);
  /** Nutzerbezogener Schlüssel des Browser-Zwischenspeichers. */
  const autosaveKeyRef = useRef<string | null>(null);

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
          const me = (await meResponse.json()) as { uid?: string };
          uid = typeof me.uid === "string" ? me.uid : null;
        }
      } catch {
        uid = null;
      }

      if (uid == null) {
        // Keine Sitzung (z. B. Login-Seite): weder Zwischenspeicher noch Cloud.
        cloudReadyRef.current = false;
        setSync({ status: "disabled", lastSavedAt: null, message: null });
        return;
      }

      autosaveKeyRef.current = `${AUTOSAVE_KEY}:${uid}`;

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
            dispatch({
              type: "restoreAutosave",
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
          setSync({
            status: response.status === 401 ? "disabled" : "error",
            lastSavedAt: null,
            message:
              response.status === 401
                ? null
                : (body?.error ??
                  "Cloud nicht erreichbar, Daten bleiben lokal."),
          });
          cloudReadyRef.current = true;
          return;
        }
        const body = (await response.json()) as {
          configured?: boolean;
          payload?: unknown;
          updatedAt?: string | null;
        };
        if (!body.configured) {
          cloudEnabledRef.current = false;
          cloudReadyRef.current = true;
          setSync({ status: "disabled", lastSavedAt: null, message: null });
          return;
        }
        cloudEnabledRef.current = true;
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
              dispatch({
                type: "loadFile",
                objects: parsed.data.objects,
                locations: parsed.data.locations,
              });
            }
          }
        }
        cloudReadyRef.current = true;
        setSync({
          status: "synced",
          lastSavedAt: body.updatedAt ?? null,
          message: null,
        });
      } catch {
        cloudReadyRef.current = true;
        setSync({
          status: "error",
          lastSavedAt: null,
          message: "Cloud nicht erreichbar, Daten bleiben lokal.",
        });
      }
    };
    void start();
  }, []);

  // Änderungen verzögert in den Browser-Zwischenspeicher schreiben.
  useEffect(() => {
    const key = autosaveKeyRef.current;
    if (!key) return;
    const timeout = window.setTimeout(() => {
      try {
        if (state.objects.length === 0 && state.locations.length === 0) {
          // Nur nach bewusstem Leeren entfernen, nie beim ersten Start.
          if (state.dirty) window.localStorage.removeItem(key);
          return;
        }
        const file = buildAnalysisFile(state.objects, state.locations, "object");
        window.localStorage.setItem(key, JSON.stringify(file));
      } catch {
        // Speicher voll oder blockiert: Zwischenspeicherung überspringen.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [state.objects, state.locations, state.dirty]);

  // Änderungen verzögert in die Cloud schreiben (letzter Schreiber gewinnt).
  useEffect(() => {
    if (!cloudEnabledRef.current || !cloudReadyRef.current) return;
    const current = serializeData(state.objects, state.locations);
    if (current === lastSyncedRef.current) return;
    if (
      state.objects.length === 0 &&
      state.locations.length === 0 &&
      !state.dirty
    ) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSync((prev) => ({ ...prev, status: "saving", message: null }));
      try {
        const file = buildAnalysisFile(state.objects, state.locations, "object");
        const response = await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(file),
        });
        const body = (await response.json().catch(() => null)) as {
          ok?: boolean;
          updatedAt?: string;
          error?: string;
        } | null;
        if (response.ok && body?.ok) {
          lastSyncedRef.current = current;
          setSync({
            status: "synced",
            lastSavedAt: body.updatedAt ?? new Date().toISOString(),
            message: null,
          });
        } else {
          setSync({
            status: "error",
            lastSavedAt: null,
            message:
              body?.error ??
              "Cloud-Speichern fehlgeschlagen, Daten bleiben lokal.",
          });
        }
      } catch {
        setSync({
          status: "error",
          lastSavedAt: null,
          message: "Cloud-Speichern fehlgeschlagen, Daten bleiben lokal.",
        });
      }
    }, CLOUD_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [state.objects, state.locations, state.dirty]);

  // Schutz vor Datenverlust: Browser-Warnung bei ungespeicherten Änderungen.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (state.dirty && (state.objects.length > 0 || state.locations.length > 0)) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.dirty, state.objects.length, state.locations.length]);

  const value = useMemo(() => ({ state, dispatch, sync }), [state, sync]);
  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis muss innerhalb von AnalysisProvider verwendet werden.");
  }
  return context;
}
