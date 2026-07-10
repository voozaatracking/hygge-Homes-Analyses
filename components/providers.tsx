"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { emptyLocation, emptyProperty } from "@/lib/utils";

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

const AnalysisContext = createContext<{
  state: AnalysisState;
  dispatch: (action: Action) => void;
} | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  const value = useMemo(() => ({ state, dispatch }), [state]);
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
