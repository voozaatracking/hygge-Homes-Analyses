"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { emptyLocation, emptyProperty } from "@/lib/utils";
import type { SyncState } from "@/lib/sync";
import { AUTOSAVE_KEY, useAutosave } from "@/hooks/use-autosave";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { useProfile, type ProfileInfo } from "@/hooks/use-profile";
import type { ProfileDefaults } from "@/lib/profile/settings";

/**
 * Zustand der Analyse (Objekte, Standorte) als Reducer. Zwischenspeicherung
 * im Browser und Cloud-Sync liegen in hooks/use-autosave.ts und
 * hooks/use-cloud-sync.ts.
 */
interface AnalysisState {
  objects: PropertyInput[];
  locations: LocationInput[];
  /** true, sobald ungespeicherte Änderungen vorliegen (Schutz vor Datenverlust). */
  dirty: boolean;
}

type Action =
  | { type: "addObject"; defaults?: ProfileDefaults }
  | { type: "updateObject"; object: PropertyInput }
  | { type: "removeObject"; id: string }
  | { type: "duplicateObject"; id: string }
  | { type: "addObjects"; objects: PropertyInput[] }
  | { type: "addLocation"; defaults?: ProfileDefaults }
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
          emptyProperty(`Objekt ${state.objects.length + 1}`, action.defaults),
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
          emptyLocation(`Standort ${state.locations.length + 1}`, action.defaults),
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

/** Status der Cloud-Speicherung (Supabase über /api/data), siehe lib/sync.ts. */
export type SyncInfo = SyncState;

const AnalysisContext = createContext<{
  state: AnalysisState;
  dispatch: (action: Action) => void;
  sync: SyncInfo;
  /** Profil des Nutzers (Standardannahmen, Firmendaten); null ohne Sitzung. */
  profile: ProfileInfo | null;
  /** Profil neu laden, z. B. nach dem Speichern auf /profil. */
  refreshProfile: () => Promise<ProfileInfo | null>;
  /** Konflikt auflösen: Serverstand laden (lokal verwerfen) oder trotzdem speichern. */
  resolveConflict: (mode: "loadServer" | "overwrite") => void;
} | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const { profile, refreshProfile } = useProfile();

  // Neue Objekte und Standorte erhalten die Standardannahmen des Profils,
  // ohne dass Aufrufer sie kennen müssen. Duplikate übernehmen die Werte
  // des Originals; Importe bleiben unverändert.
  const dispatch = useCallback(
    (action: Action) => {
      if (
        (action.type === "addObject" || action.type === "addLocation") &&
        action.defaults === undefined &&
        profile
      ) {
        rawDispatch({ ...action, defaults: profile.settings.defaults });
        return;
      }
      rawDispatch(action);
    },
    [profile]
  );
  /** Nutzerbezogener Schlüssel des Browser-Zwischenspeichers, gesetzt vom Cloud-Sync. */
  const autosaveKeyRef = useRef<string | null>(null);

  const onLoad = useCallback(
    (data: { objects: PropertyInput[]; locations: LocationInput[] }) =>
      rawDispatch({ type: "loadFile", ...data }),
    []
  );
  const onRestoreAutosave = useCallback(
    (data: { objects: PropertyInput[]; locations: LocationInput[] }) =>
      rawDispatch({ type: "restoreAutosave", ...data }),
    []
  );

  const { sync, resolveConflict } = useCloudSync({
    objects: state.objects,
    locations: state.locations,
    dirty: state.dirty,
    onLoad,
    onRestoreAutosave,
    autosaveKeyRef,
    autosaveKey: AUTOSAVE_KEY,
  });
  useAutosave(autosaveKeyRef, state.objects, state.locations, state.dirty);

  const value = useMemo(
    () => ({ state, dispatch, sync, resolveConflict, profile, refreshProfile }),
    [state, dispatch, sync, resolveConflict, profile, refreshProfile]
  );
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
