/** Deutsche Formatierungs-Helfer. Zentral, damit alle Anzeigen konsistent bleiben. */

const nf = (digits: number) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function fmtNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "–";
  return nf(digits).format(value);
}

export function fmtEur(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "–";
  return `${nf(digits).format(value)} €`;
}

export function fmtPct(
  value: number | null | undefined,
  digits = 1,
  /** true, wenn der Wert als Quote (0..1) vorliegt. */
  fromRate = true
): string {
  if (value == null || Number.isNaN(value)) return "–";
  const pct = fromRate ? value * 100 : value;
  return `${nf(digits).format(pct)} %`;
}

/**
 * Parst deutsche und englische Zahleneingaben ("1.234,56", "1234.56", "12,5 %", "45 €").
 * Gibt null für leere Eingaben zurück und NaN für nicht interpretierbare Eingaben.
 */
export function parseLocaleNumber(raw: string): number | null {
  const cleaned = raw.replace(/[€%\s]/g, "").trim();
  if (cleaned === "") return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const value = Number(normalized);
  return Number.isNaN(value) ? NaN : value;
}

/** Für Eingabefelder: Zahl als deutschen String darstellen (Komma als Dezimaltrennzeichen). */
export function numberToInput(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value).replace(".", ",");
}

/** Datum und Uhrzeit im deutschen Format, z. B. "18.07.2026, 14:30". */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
