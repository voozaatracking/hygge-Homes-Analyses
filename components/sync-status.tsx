"use client";

import { useAnalysis } from "@/components/providers";

/**
 * Dezente Statusanzeige der Cloud-Speicherung im Footer.
 * Wird nichts angezeigt, ist die Cloud-Speicherung nicht konfiguriert
 * oder der Status noch nicht geprüft.
 */
export function SyncStatus() {
  const { sync } = useAnalysis();

  if (sync.status === "checking" || sync.status === "disabled") return null;

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
