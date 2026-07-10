"use client";

import { useRef, useState } from "react";
import type { AnalysisMode } from "@/lib/types/analysis";
import { useAnalysis } from "@/components/providers";
import { sampleLocations, sampleProperties } from "@/lib/sample-data";
import { buildAnalysisFile, parseAnalysisFile } from "@/lib/io/json-file";
import { downloadText } from "@/lib/io/export";
import {
  CLEANING_DEFAULTS,
  DAYS_PER_MONTH,
  ELECTRICITY_DEFAULTS,
  MONTHS_PER_YEAR,
} from "@/lib/config/assumptions";
import { Button, ConfirmDialog, Notice } from "@/components/ui";
import { ExcelImportDialog } from "@/components/excel-import";

/**
 * Werkzeugleiste eines Analysebereichs: Datensätze anlegen, Beispieldaten
 * laden, Excel importieren, Analyse als JSON sichern und wieder laden,
 * Bereich zurücksetzen, Kurzhilfe.
 */
export function Toolbar({ mode }: { mode: AnalysisMode }) {
  const { state, dispatch } = useAnalysis();
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [excelOpen, setExcelOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    objects: number;
    locations: number;
    apply: () => void;
  } | null>(null);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const hasAnyData = state.objects.length > 0 || state.locations.length > 0;

  const exportJson = () => {
    const file = buildAnalysisFile(state.objects, state.locations, mode);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(
      JSON.stringify(file, null, 2),
      `hygge-analyse-${stamp}.json`,
      "application/json"
    );
    dispatch({ type: "markSaved" });
    setMessage({
      kind: "success",
      text: "Die Analyse wurde als JSON-Datei heruntergeladen. Diese Datei kann später über \u201EJSON laden\u201C wieder geöffnet werden.",
    });
  };

  const handleJsonFile = async (file: File) => {
    setMessage(null);
    const text = await file.text();
    const parsed = parseAnalysisFile(text);
    if (!parsed.ok || !parsed.data) {
      setMessage({
        kind: "error",
        text: parsed.error ?? "Die Datei konnte nicht gelesen werden.",
      });
      return;
    }
    const data = parsed.data;
    const apply = () => {
      dispatch({
        type: "loadFile",
        objects: data.objects,
        locations: data.locations,
      });
      setMessage({
        kind: "success",
        text: `Analyse geladen: ${data.objects.length} Objekt(e), ${data.locations.length} Standort(e). Stand der Datei: ${new Date(data.exportedAt).toLocaleString("de-DE")}.`,
      });
    };
    if (hasAnyData) {
      setPendingFile({
        objects: data.objects.length,
        locations: data.locations.length,
        apply,
      });
    } else {
      apply();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            dispatch({ type: mode === "object" ? "addObject" : "addLocation" })
          }
        >
          {mode === "object" ? "Neues Objekt" : "Neuer Standort"}
        </Button>
        <Button
          onClick={() => {
            if (mode === "object") {
              dispatch({ type: "addObjects", objects: sampleProperties() });
            } else {
              dispatch({ type: "addLocations", locations: sampleLocations() });
            }
          }}
        >
          Beispieldaten laden
        </Button>
        <Button onClick={() => setExcelOpen(true)}>
          Aus Excel/CSV importieren
        </Button>
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
        <Button onClick={exportJson}>Als JSON speichern</Button>
        <Button onClick={() => jsonInputRef.current?.click()}>
          JSON laden
        </Button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleJsonFile(file);
            e.target.value = "";
          }}
        />
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
        <Button variant="ghost" onClick={() => setHelpOpen((v) => !v)}>
          {helpOpen ? "Hilfe ausblenden" : "Hilfe"}
        </Button>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          {mode === "object" ? "Alle Objekte löschen" : "Alle Standorte löschen"}
        </Button>
      </div>

      {state.dirty && hasAnyData ? (
        <p className="text-xs text-muted">
          Ungespeicherte Änderungen. Die Daten liegen nur im Browser, zum
          Sichern „Als JSON speichern“ verwenden.
        </p>
      ) : null}

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      {helpOpen ? (
        <div className="bg-card border border-line rounded-xl p-5 text-sm text-ink space-y-3">
          <h3 className="font-display text-base tracking-[0.12em] uppercase">
            So rechnet das Tool
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-muted">
            <li>
              Rechenbasis sind {DAYS_PER_MONTH} Tage pro Monat und{" "}
              {MONTHS_PER_YEAR} Monate pro Jahr. Auslastung = vermietete Tage /{" "}
              {DAYS_PER_MONTH}.
            </li>
            <li>
              Der Nachtpreis gilt wahlweise pro Unterkunft oder pro Bett. Bei
              „pro Bett“ wird der Preis mit der Bettenanzahl
              multipliziert.
            </li>
            <li>
              Stromkosten werden aus Energieverbrauch × Fläche ×{" "}
              {ELECTRICITY_DEFAULTS.pricePerKwh.toLocaleString("de-DE")} €/kWh
              plus {ELECTRICITY_DEFAULTS.surchargePct} % Aufschlag geschätzt.
              Annahmen sind je Objekt änderbar, ein manueller Wert hat immer
              Vorrang.
            </li>
            <li>
              Reinigungskosten werden aus Fläche ×{" "}
              {CLEANING_DEFAULTS.minutesPerSqm} min/qm ×{" "}
              {CLEANING_DEFAULTS.hourlyWage.toLocaleString("de-DE")} €/h ×{" "}
              {CLEANING_DEFAULTS.changesPerMonth} Wechseln pro Monat geschätzt,
              ebenfalls je Objekt änderbar.
            </li>
            <li>
              Aus einer Energieeffizienzklasse abgeleitete Verbräuche sind
              Schätzwerte (Bereichsmitte) und werden entsprechend
              gekennzeichnet.
            </li>
            <li>
              Die Objektbewertung gewichtet Miete/qm (25 %), Raumproduktivität
              (35 %), Flächenproduktivität (20 %), Betten pro Raum (10 %) und
              Energieverbrauch (10 %). Unter 40 % gilt ein Objekt als schlecht,
              unter 80 % als moderat, ab 80 % als sehr gut.
            </li>
            <li>
              Marktdaten (z. B. Vergleichsmiete) werden manuell recherchiert
              und eingetragen, es gibt keinen automatischen Abruf.
            </li>
            <li>
              Alle Daten bleiben im Browser. Gespeichert wird ausschließlich
              über den JSON-Export, geladen über „JSON laden“.
            </li>
          </ul>
        </div>
      ) : null}

      <ExcelImportDialog
        mode={mode}
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title={
          mode === "object" ? "Alle Objekte löschen?" : "Alle Standorte löschen?"
        }
        message="Alle Einträge dieses Bereichs werden entfernt. Nicht als JSON gespeicherte Daten gehen verloren."
        confirmLabel="Löschen"
        onConfirm={() => {
          dispatch({
            type: mode === "object" ? "resetObjects" : "resetLocations",
          });
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={pendingFile != null}
        title="Aktuelle Daten ersetzen?"
        message={
          pendingFile
            ? `Die geladene Datei enthält ${pendingFile.objects} Objekt(e) und ${pendingFile.locations} Standort(e). Beim Laden werden die aktuellen Daten beider Bereiche ersetzt.`
            : ""
        }
        confirmLabel="Laden und ersetzen"
        onConfirm={() => {
          pendingFile?.apply();
          setPendingFile(null);
        }}
        onCancel={() => setPendingFile(null)}
      />
    </div>
  );
}
