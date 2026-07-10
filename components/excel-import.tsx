"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildLocationsFromMatrix,
  buildPropertiesFromMatrix,
  LOCATION_IMPORT_FIELDS,
  OBJECT_IMPORT_FIELDS,
  readWorkbook,
  suggestMapping,
  unmappedColumns,
  type ColumnMapping,
  type Matrix,
  type RowError,
} from "@/lib/io/excel-import";
import type { AnalysisMode } from "@/lib/types/analysis";
import { useAnalysis } from "@/components/providers";
import { Button, Notice, SectionTitle } from "@/components/ui";

interface WorkbookState {
  fileName: string;
  sheetNames: string[];
  getMatrix: (sheetName: string) => Matrix;
}

/**
 * Import von Excel- und CSV-Dateien in drei Schritten:
 * Datei wählen, Spalten zuordnen (mit automatischem Vorschlag über
 * Spaltennamen, nicht Zellpositionen), Ergebnis prüfen.
 */
export function ExcelImportDialog({
  mode,
  open,
  onClose,
}: {
  mode: AnalysisMode;
  open: boolean;
  onClose: () => void;
}) {
  const { dispatch } = useAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields =
    mode === "object" ? OBJECT_IMPORT_FIELDS : LOCATION_IMPORT_FIELDS;

  const [workbook, setWorkbook] = useState<WorkbookState | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [readError, setReadError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    errors: RowError[];
  } | null>(null);

  const matrix: Matrix = useMemo(() => {
    if (!workbook || !sheetName) return [];
    return workbook.getMatrix(sheetName);
  }, [workbook, sheetName]);

  const headers = useMemo(() => matrix[0] ?? [], [matrix]);
  const unmapped = useMemo(
    () => unmappedColumns(headers, mapping),
    [headers, mapping]
  );

  const reset = () => {
    setWorkbook(null);
    setSheetName("");
    setMapping({});
    setReadError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setReadError(null);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const book = readWorkbook(buffer);
      if (book.sheetNames.length === 0) {
        setReadError("Die Datei enthält kein lesbares Tabellenblatt.");
        return;
      }
      const first = book.sheetNames[0];
      setWorkbook({ fileName: file.name, ...book });
      setSheetName(first);
      const firstMatrix = book.getMatrix(first);
      setMapping(suggestMapping(firstMatrix[0] ?? [], fields));
    } catch {
      setReadError(
        "Die Datei konnte nicht gelesen werden. Unterstützt werden .xlsx, .xls, .csv und .tsv."
      );
    }
  };

  const changeSheet = (name: string) => {
    if (!workbook) return;
    setSheetName(name);
    setResult(null);
    const m = workbook.getMatrix(name);
    setMapping(suggestMapping(m[0] ?? [], fields));
  };

  const runImport = () => {
    if (matrix.length < 2) {
      setReadError(
        "Das gewählte Tabellenblatt enthält außer der Kopfzeile keine Datenzeilen."
      );
      return;
    }
    if (mode === "object") {
      const { rows, errors } = buildPropertiesFromMatrix(matrix, mapping);
      dispatch({ type: "addObjects", objects: rows });
      setResult({ imported: rows.length, errors });
    } else {
      const { rows, errors } = buildLocationsFromMatrix(matrix, mapping);
      dispatch({ type: "addLocations", locations: rows });
      setResult({ imported: rows.length, errors });
    }
  };

  if (!open) return null;

  const previewRows = matrix.slice(1, 9);
  const columnOptions = headers.map((h, i) => ({
    index: i,
    label: `Spalte ${i + 1}: ${String(h ?? "").trim() || "(ohne Überschrift)"}`,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Excel-Import"
    >
      <div className="bg-card border border-line rounded-xl p-6 max-w-3xl w-full space-y-6">
        <div className="flex items-start justify-between gap-4">
          <SectionTitle
            hint={
              mode === "object"
                ? "Eigene Excel- oder CSV-Dateien mit Objektdaten übernehmen. Die Zuordnung erfolgt über Spaltennamen, nicht über feste Zellpositionen."
                : "Eigene Excel- oder CSV-Dateien mit Standortdaten übernehmen. Die Zuordnung erfolgt über Spaltennamen, nicht über feste Zellpositionen."
            }
          >
            {mode === "object"
              ? "Objekte aus Datei importieren"
              : "Standorte aus Datei importieren"}
          </SectionTitle>
          <Button variant="ghost" onClick={close}>
            Schließen
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-ink" htmlFor="excel-import-file">
            Datei auswählen (.xlsx, .xls, .csv, .tsv)
          </label>
          <input
            id="excel-import-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="block w-full text-sm text-ink file:mr-3 file:px-3.5 file:py-2 file:rounded-lg file:border file:border-line file:bg-card file:text-ink file:text-sm hover:file:bg-card-soft"
          />
          {readError ? <Notice kind="error">{readError}</Notice> : null}
        </div>

        {workbook ? (
          <>
            {workbook.sheetNames.length > 1 ? (
              <div className="space-y-1">
                <label className="text-sm text-ink" htmlFor="excel-import-sheet">
                  Tabellenblatt
                </label>
                <select
                  id="excel-import-sheet"
                  value={sheetName}
                  onChange={(e) => changeSheet(e.target.value)}
                  className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink"
                >
                  {workbook.sheetNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <h4 className="text-sm text-ink mb-2">
                Vorschau ({workbook.fileName})
              </h4>
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-muted border-b border-line bg-card-soft/60">
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 font-medium whitespace-nowrap">
                          {String(h ?? "").trim() || `Spalte ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-line/50">
                        {headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 whitespace-nowrap tabular">
                            {row[ci] == null ? "" : String(row[ci])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-1">
                Angezeigt werden die ersten {previewRows.length} Datenzeilen.
              </p>
            </div>

            <div>
              <h4 className="text-sm text-ink mb-2">Spalten zuordnen</h4>
              <p className="text-xs text-muted mb-3">
                Automatisch erkannte Zuordnungen sind vorbelegt und können hier
                korrigiert werden. Nicht zugeordnete Felder bleiben beim Import
                leer.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label
                      className="text-xs text-ink"
                      htmlFor={`map-${field.key}`}
                    >
                      {field.label}
                    </label>
                    <select
                      id={`map-${field.key}`}
                      value={mapping[field.key] ?? ""}
                      onChange={(e) => {
                        setResult(null);
                        setMapping((m) => ({
                          ...m,
                          [field.key]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }));
                      }}
                      className="w-full bg-card border border-line rounded-lg px-2 py-1.5 text-xs text-ink"
                    >
                      <option value="">nicht zugeordnet</option>
                      {columnOptions.map((o) => (
                        <option key={o.index} value={o.index}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {unmapped.length > 0 ? (
                <div className="mt-3">
                  <Notice kind="info">
                    Nicht zugeordnete Spalten der Datei (werden ignoriert):{" "}
                    {unmapped.join(", ")}
                  </Notice>
                </div>
              ) : null}
            </div>

            {result ? (
              <div className="space-y-2">
                <Notice kind="success">
                  {result.imported}{" "}
                  {mode === "object"
                    ? result.imported === 1
                      ? "Objekt wurde übernommen."
                      : "Objekte wurden übernommen."
                    : result.imported === 1
                      ? "Standort wurde übernommen."
                      : "Standorte wurden übernommen."}
                </Notice>
                {result.errors.length > 0 ? (
                  <Notice kind="warning">
                    <span className="block mb-1">
                      {result.errors.length} Hinweis(e) beim Import. Betroffene
                      Werte wurden nicht übernommen und können im Formular
                      nachgetragen werden:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i}>
                          Zeile {e.rowNumber}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Andere Datei wählen
              </Button>
              {result ? (
                <Button variant="primary" onClick={close}>
                  Fertig
                </Button>
              ) : (
                <Button variant="primary" onClick={runImport}>
                  Importieren
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
