import * as XLSX from "xlsx";
import type { ListingInput } from "@/lib/types/analysis";
import { WEEKS_PER_YEAR } from "@/lib/config/assumptions";
import { emptyWeeklyPrices, newId } from "@/lib/utils";

/**
 * Import der bestehenden Standortanalyse-Excel ("Kopie von Standortanalyse ...").
 *
 * Erwartete Struktur des Datenblatts (meist "Daten"):
 * - Zelle A1: Name der Stadt/Region.
 * - Eine Kopfzeile mit "Name des Inserats", "Booking Inserat", "Bewertung",
 *   "Personen", "Reinigungskosten", "Mehrkosten p.P." sowie "KW 1" bis "KW 52".
 * - Darunter eine Zeile je Inserat.
 *
 * Zusätzlich wird, falls vorhanden, die AirDNA-Auslastungsquote aus dem
 * Blatt "Dashboard" (Zelle C7) gelesen.
 */

export interface ListingImportResult {
  ok: boolean;
  error?: string;
  /** Stadt/Region aus A1 des Datenblatts. */
  cityName?: string;
  /** Auslastungsquote in Prozent (0..100), falls im Dashboard gefunden. */
  occupancyPct?: number | null;
  listings?: ListingInput[];
  /** Übersprungene, nicht lesbare Zeilen. */
  skippedRows?: number;
}

type Cell = string | number | boolean | Date | null | undefined;

function asText(value: Cell): string {
  if (value == null) return "";
  return String(value).trim();
}

function asNumber(value: Cell): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  const text = asText(value)
    .replace(/[€%\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

export function parseListingWorkbook(data: ArrayBuffer): ListingImportResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    return {
      ok: false,
      error: "Die Datei konnte nicht als Excel-Datei gelesen werden.",
    };
  }

  // Datenblatt suchen: bevorzugt "Daten", sonst das erste Blatt mit passender Kopfzeile.
  const sheetNames = [...workbook.SheetNames].sort((a, b) =>
    a === "Daten" ? -1 : b === "Daten" ? 1 : 0
  );

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows: Cell[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    });

    // Kopfzeile innerhalb der ersten 10 Zeilen suchen.
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const first = asText(rows[i]?.[0]).toLowerCase();
      if (first.startsWith("name des inserats")) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) continue;

    const header = rows[headerRowIndex].map((c) => asText(c).toLowerCase());
    const columnOf = (prefix: string): number =>
      header.findIndex((h) => h.startsWith(prefix));

    const colName = columnOf("name des inserats");
    const colBooking = columnOf("booking");
    const colRating = columnOf("bewertung");
    const colPersons = columnOf("personen");
    const colCleaning = columnOf("reinigungskosten");
    const colExtra = columnOf("mehrkosten");

    // KW-Spalten anhand der Überschriften "KW 1" bis "KW 52" zuordnen.
    const weekColumns = new Map<number, number>();
    header.forEach((h, index) => {
      const match = /^kw\s*(\d{1,2})$/.exec(h);
      if (!match) return;
      const week = Number(match[1]);
      if (week >= 1 && week <= WEEKS_PER_YEAR) {
        weekColumns.set(week, index);
      }
    });

    if (weekColumns.size === 0) {
      return {
        ok: false,
        error: `Im Blatt "${sheetName}" wurde die Kopfzeile gefunden, aber keine KW-Spalten (KW 1 bis KW 52).`,
      };
    }

    const listings: ListingInput[] = [];
    let skippedRows = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const name = colName >= 0 ? asText(row[colName]) : "";
      const booking = colBooking >= 0 ? asText(row[colBooking]) : "";
      const weeklyPrices = emptyWeeklyPrices();
      let hasWeekValue = false;
      for (const [week, column] of weekColumns) {
        const value = asNumber(row[column]);
        if (value != null && value >= 0) {
          weeklyPrices[week - 1] = value;
          hasWeekValue = true;
        }
      }

      const hasAnything =
        name !== "" ||
        booking !== "" ||
        hasWeekValue ||
        (colRating >= 0 && asNumber(row[colRating]) != null) ||
        (colPersons >= 0 && asNumber(row[colPersons]) != null);
      if (!hasAnything) continue;

      // Ohne Namen und ohne Preise ist die Zeile nicht auswertbar.
      if (name === "" && booking === "" && !hasWeekValue) {
        skippedRows += 1;
        continue;
      }

      // In der Praxis steht der Inseratstitel oft in der Booking-Spalte.
      const displayName =
        name !== "" ? name : looksLikeUrl(booking) ? "" : booking;
      const bookingUrl = looksLikeUrl(booking) ? booking : "";

      listings.push({
        id: newId(),
        name: displayName || `Inserat ${listings.length + 1}`,
        bookingUrl,
        rating: colRating >= 0 ? asNumber(row[colRating]) : null,
        persons: colPersons >= 0 ? asNumber(row[colPersons]) : null,
        cleaningCost: colCleaning >= 0 ? asNumber(row[colCleaning]) : null,
        extraCostPerPerson: colExtra >= 0 ? asNumber(row[colExtra]) : null,
        weeklyPrices,
        includeInAggregate: true,
      });
    }

    if (listings.length === 0) {
      return {
        ok: false,
        error: `Im Blatt "${sheetName}" wurden unterhalb der Kopfzeile keine Inserate gefunden.`,
      };
    }

    return {
      ok: true,
      cityName: asText(rows[0]?.[0]) || undefined,
      occupancyPct: readDashboardOccupancy(workbook),
      listings,
      skippedRows,
    };
  }

  return {
    ok: false,
    error:
      'Kein passendes Datenblatt gefunden. Erwartet wird eine Kopfzeile, die mit "Name des Inserats" beginnt (Blatt "Daten" der Standortanalyse-Excel).',
  };
}

/** Liest die AirDNA-Auslastungsquote aus Dashboard!C7, falls vorhanden. */
function readDashboardOccupancy(workbook: XLSX.WorkBook): number | null {
  const dashboard = workbook.Sheets["Dashboard"];
  if (!dashboard) return null;
  const cell = dashboard["C7"] as { v?: Cell } | undefined;
  const value = asNumber(cell?.v ?? null);
  if (value == null) return null;
  // Quote (0..1) in Prozent umrechnen; Werte über 1 gelten bereits als Prozent.
  if (value > 0 && value <= 1) return value * 100;
  if (value > 1 && value <= 100) return value;
  return null;
}
