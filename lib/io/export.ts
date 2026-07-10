import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  label: string;
  value: (row: T) => string | number | null;
}

/**
 * Baut eine CSV-Datei mit Semikolon-Trennzeichen und deutschem Dezimalkomma,
 * damit sie sich direkt in deutschem Excel öffnen lässt.
 */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const escape = (v: string) =>
    /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const format = (v: string | number | null) => {
    if (v == null) return "";
    if (typeof v === "number") {
      return String(v).replace(".", ",");
    }
    return v;
  };
  const header = columns.map((c) => escape(c.label)).join(";");
  const body = rows
    .map((row) => columns.map((c) => escape(format(c.value(row)))).join(";"))
    .join("\n");
  return `${header}\n${body}`;
}

/** Baut eine XLSX-Arbeitsmappe mit einem Blatt aus denselben Spaltendefinitionen. */
export function toXlsxBlob<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  sheetName: string
): Blob {
  const aoa: (string | number | null)[][] = [
    columns.map((c) => c.label),
    ...rows.map((row) => columns.map((c) => c.value(row))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  const out = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Löst im Browser einen Datei-Download aus. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mime: string) {
  downloadBlob(new Blob([text], { type: mime }), filename);
}
