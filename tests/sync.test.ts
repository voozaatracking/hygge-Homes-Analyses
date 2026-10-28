import { describe, expect, it } from "vitest";
import { initialSyncState, reduceSync, type SyncState } from "@/lib/sync";

/** Reducer der Cloud-Speicherung: Konfliktzustand (Optimistic Lock, 409). */

function synced(version: number): SyncState {
  return reduceSync(initialSyncState, {
    type: "loaded",
    version,
    updatedAt: "2026-10-28T10:00:00Z",
  });
}

describe("Sync-Reducer: Grundzustände", () => {
  it("übernimmt Version und Zeitstempel beim Laden und Speichern", () => {
    const loaded = synced(3);
    expect(loaded.status).toBe("synced");
    expect(loaded.version).toBe(3);
    expect(loaded.lastSavedAt).toBe("2026-10-28T10:00:00Z");

    const saving = reduceSync(loaded, { type: "saving" });
    expect(saving.status).toBe("saving");

    const saved = reduceSync(saving, {
      type: "saved",
      version: 4,
      updatedAt: "2026-10-28T10:05:00Z",
    });
    expect(saved.status).toBe("synced");
    expect(saved.version).toBe(4);
    expect(saved.conflict).toBeNull();
  });

  it("setzt beim Deaktivieren alles zurück", () => {
    const state = reduceSync(synced(2), { type: "disabled" });
    expect(state).toEqual({ ...initialSyncState, status: "disabled" });
  });

  it("behält die Version bei einem Fehler", () => {
    const state = reduceSync(synced(2), { type: "error", message: "offline" });
    expect(state.status).toBe("error");
    expect(state.message).toBe("offline");
    expect(state.version).toBe(2);
  });
});

describe("Sync-Reducer: Konfliktfall", () => {
  const conflict = reduceSync(synced(2), {
    type: "conflict",
    version: 5,
    payload: { objects: ["server"] },
    updatedAt: "2026-10-28T11:00:00Z",
  });

  it("geht bei 409 in den Konfliktzustand und merkt sich den Serverstand", () => {
    expect(conflict.status).toBe("conflict");
    expect(conflict.conflict).toEqual({
      version: 5,
      payload: { objects: ["server"] },
      updatedAt: "2026-10-28T11:00:00Z",
    });
    // Die eigene Version bleibt bis zur Entscheidung unverändert.
    expect(conflict.version).toBe(2);
  });

  it("speichert im Konfliktzustand nicht automatisch weiter", () => {
    expect(reduceSync(conflict, { type: "saving" })).toBe(conflict);
  });

  it("\"Serverstand laden\" übernimmt Version und Zeitstempel des Servers", () => {
    const state = reduceSync(conflict, { type: "resolve", mode: "loadServer" });
    expect(state.status).toBe("synced");
    expect(state.version).toBe(5);
    expect(state.lastSavedAt).toBe("2026-10-28T11:00:00Z");
    expect(state.conflict).toBeNull();
  });

  it("\"Trotzdem speichern\" sendet mit der Serverversion erneut", () => {
    const state = reduceSync(conflict, { type: "resolve", mode: "overwrite" });
    expect(state.status).toBe("saving");
    expect(state.version).toBe(5);
    expect(state.conflict).toBeNull();

    const saved = reduceSync(state, {
      type: "saved",
      version: 6,
      updatedAt: "2026-10-28T11:01:00Z",
    });
    expect(saved.status).toBe("synced");
    expect(saved.version).toBe(6);
  });

  it("behandelt eine inzwischen gelöschte Serverzeile (version null)", () => {
    const gone = reduceSync(synced(2), {
      type: "conflict",
      version: null,
      payload: null,
      updatedAt: null,
    });
    const state = reduceSync(gone, { type: "resolve", mode: "overwrite" });
    // Nächste Speicherung ist eine Erstanlage (expectedVersion null).
    expect(state.version).toBeNull();
    expect(state.status).toBe("saving");
  });

  it("ignoriert resolve ohne Konflikt", () => {
    const state = synced(2);
    expect(reduceSync(state, { type: "resolve", mode: "overwrite" })).toBe(state);
  });
});
