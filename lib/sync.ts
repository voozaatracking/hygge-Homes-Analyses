/**
 * Zustand der Cloud-Speicherung als reiner Reducer, ohne Browser-Abhängigkeiten,
 * damit der Konfliktfall (Optimistic Lock, HTTP 409) ohne Browser testbar ist.
 */

export type SyncStatus =
  | "checking"
  | "disabled"
  | "synced"
  | "saving"
  | "error"
  | "conflict";

export interface SyncConflict {
  /** Version der Serverzeile; null, wenn die Zeile inzwischen fehlt. */
  version: number | null;
  /** Aktueller Serverstand (Analyse-JSON) oder null. */
  payload: unknown;
  updatedAt: string | null;
}

export interface SyncState {
  status: SyncStatus;
  lastSavedAt: string | null;
  message: string | null;
  /** Zuletzt bekannte Version der eigenen Zeile; null vor der ersten Speicherung. */
  version: number | null;
  conflict: SyncConflict | null;
}

export type SyncEvent =
  | { type: "disabled" }
  | { type: "loaded"; version: number | null; updatedAt: string | null }
  | { type: "saving" }
  | { type: "saved"; version: number; updatedAt: string }
  | { type: "error"; message: string }
  | {
      type: "conflict";
      version: number | null;
      payload: unknown;
      updatedAt: string | null;
    }
  /** Konflikt aufgelöst: Serverstand übernommen oder Überschreiben angestoßen. */
  | { type: "resolve"; mode: "loadServer" | "overwrite" };

export const initialSyncState: SyncState = {
  status: "checking",
  lastSavedAt: null,
  message: null,
  version: null,
  conflict: null,
};

export function reduceSync(state: SyncState, event: SyncEvent): SyncState {
  switch (event.type) {
    case "disabled":
      return { ...initialSyncState, status: "disabled" };
    case "loaded":
      return {
        status: "synced",
        lastSavedAt: event.updatedAt,
        message: null,
        version: event.version,
        conflict: null,
      };
    case "saving":
      // Während eines Konflikts wird nicht automatisch gespeichert.
      if (state.status === "conflict") return state;
      return { ...state, status: "saving", message: null };
    case "saved":
      return {
        status: "synced",
        lastSavedAt: event.updatedAt,
        message: null,
        version: event.version,
        conflict: null,
      };
    case "error":
      return { ...state, status: "error", message: event.message };
    case "conflict":
      return {
        ...state,
        status: "conflict",
        message: null,
        conflict: {
          version: event.version,
          payload: event.payload,
          updatedAt: event.updatedAt,
        },
      };
    case "resolve": {
      if (!state.conflict) return state;
      // In beiden Fällen gilt ab jetzt die Serverversion als Ausgangspunkt:
      // "loadServer" übernimmt den Serverstand, "overwrite" sendet den lokalen
      // Stand mit der Serverversion erneut.
      return {
        status: event.mode === "loadServer" ? "synced" : "saving",
        lastSavedAt:
          event.mode === "loadServer"
            ? state.conflict.updatedAt
            : state.lastSavedAt,
        message: null,
        version: state.conflict.version,
        conflict: null,
      };
    }
    default:
      return state;
  }
}
