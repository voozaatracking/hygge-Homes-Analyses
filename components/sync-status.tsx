"use client";

import { useAnalysis } from "@/components/providers";

/**
 * Dezente Statusanzeige der Cloud-Speicherung im Footer.
 * Wird nichts angezeigt, ist die Cloud-Speicherung nicht konfiguriert
 * oder der Status noch nicht geprüft. Im Konfliktfall (Optimistic Lock)
 * erscheinen die zwei Entscheidungen des Nutzers.
 */
export function SyncStatus() {
  const { sync, resolveConflict } = useAnalysis();

  if (sync.status === "checking" || sync.status === "disabled") return null;

  if (sync.status === "conflict") {
    const changedAt = sync.conflict?.updatedAt
      ? new Date(sync.conflict.updatedAt).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
    return (
      <span role="alert" className="text-brick flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Cloud: Konflikt, der Datenstand wurde an anderer Stelle geändert
          {changedAt ? ` (${changedAt})` : ""}.
        </span>
        <button
          type="button"
          onClick={() => resolveConflict("loadServer")}
          className="underline underline-offset-2 hover:text-ink"
        >
          Serverstand laden
        </button>
        <button
          type="button"
          onClick={() => resolveConflict("overwrite")}
          className="underline underline-offset-2 hover:text-ink"
        >
          Trotzdem speichern
        </button>
      </span>
    );
  }

  let text: string;
  if (sync.status === "saving") {
    text = "Cloud: speichert …";
  } else if (sync.status === "error") {
    text = sync.message ?? "Cloud: Fehler, Daten bleiben lokal.";
  } else if (sync.lastSavedAt) {
    const time = new Date(sync.lastSavedAt).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    text = `Cloud: gespeichert um ${time} Uhr`;
  } else {
    text = "Cloud: verbunden";
  }

  return (
    <span
      role="status"
      className={sync.status === "error" ? "text-brick" : "text-muted"}
    >
      {text}
    </span>
  );
}
