import * as XLSX from "xlsx";
import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { parseLocaleNumber } from "@/lib/format";
import { emptyLocation, emptyProperty } from "@/lib/utils";
import { DAYS_PER_MONTH } from "@/lib/config/assumptions";

export type Matrix = (string | number | null)[][];

/** Liest eine Arbeitsmappe (.xlsx, .xls, .csv, .tsv) aus einem ArrayBuffer. */
export function readWorkbook(buffer: ArrayBuffer): {
  sheetNames: string[];
  getMatrix: (sheetName: string) => Matrix;
} {
  const book = XLSX.read(buffer, { type: "array" });
  return {
    sheetNames: book.SheetNames,
    getMatrix: (sheetName: string) => {
      const sheet = book.Sheets[sheetName];
      if (!sheet) return [];
      return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: null,
        raw: true,
      }) as Matrix;
    },
  };
}

export interface ImportField {
  key: string;
  label: string;
  synonyms: string[];
  kind: "text" | "number";
}

/** Zielfelder für den Objekt-Import, erkannt über Spaltennamen (nicht Zellpositionen). */
export const OBJECT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Objektname", synonyms: ["objektname", "objekt", "name", "bezeichnung"], kind: "text" },
  { key: "address", label: "Standort / Adresse", synonyms: ["standort", "adresse", "ort", "lage"], kind: "text" },
  { key: "listingUrl", label: "Link zum Inserat", synonyms: ["link", "inserat", "url", "exposé", "expose"], kind: "text" },
  { key: "areaSqm", label: "Gesamtfläche (qm)", synonyms: ["fläche", "flaeche", "gesamtfläche", "qm", "wohnfläche", "größe", "groesse"], kind: "number" },
  { key: "bedrooms", label: "Schlafräume", synonyms: ["schlafräume", "schlafraeume", "schlafzimmer", "räume", "raeume", "zimmer"], kind: "number" },
  { key: "beds", label: "Betten", synonyms: ["betten", "schlafplätze", "schlafplaetze", "bettenanzahl"], kind: "number" },
  { key: "energyConsumption", label: "Energieverbrauch (kWh/qm p.a.)", synonyms: ["energieverbrauch", "verbrauch", "kwh"], kind: "number" },
  { key: "energyClass", label: "Energieeffizienzklasse", synonyms: ["energieeffizienzklasse", "energieklasse", "effizienzklasse", "klasse"], kind: "text" },
  { key: "nightPrice", label: "Nachtpreis Unterkunft (€)", synonyms: ["nachtpreis", "preis pro nacht", "preis/nacht", "übernachtungspreis", "uebernachtungspreis"], kind: "number" },
  { key: "rentedDaysPerMonth", label: "Vermietete Tage pro Monat", synonyms: ["vermietete tage", "auslastung tage", "tage", "belegte tage"], kind: "number" },
  { key: "coldRent", label: "Kaltmiete (€/Monat)", synonyms: ["kaltmiete", "miete", "grundmiete"], kind: "number" },
  { key: "marketRentPerSqm", label: "Markt-Mietpreis (€/qm)", synonyms: ["marktpreis", "markt-mietpreis", "vergleichsmiete", "marktmiete"], kind: "number" },
];

/** Zielfelder für den Standort-Import. */
export const LOCATION_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Stadt / Region", synonyms: ["stadt", "region", "standort", "ort", "name"], kind: "text" },
  { key: "dataSource", label: "Datenquelle", synonyms: ["datenquelle", "quelle", "source"], kind: "text" },
  { key: "collectedAt", label: "Datum der Erhebung", synonyms: ["datum", "erhebung", "stand"], kind: "text" },
  { key: "occupancyPct", label: "Auslastungsquote (%)", synonyms: ["auslastung", "auslastungsquote", "belegung"], kind: "number" },
  { key: "rentedDaysPerMonth", label: "Vermietete Tage pro Monat", synonyms: ["vermietete tage", "tage"], kind: "number" },
  { key: "avgAnnualRevenue", label: "Ø Jahresumsatz (€)", synonyms: ["jahresumsatz", "umsatz jahr", "jahreseinnahmen"], kind: "number" },
  { key: "avgRevenuePerNight", label: "Ø Umsatz pro Nacht (€)", synonyms: ["umsatz pro nacht", "umsatz/nacht", "nachtumsatz", "adr"], kind: "number" },
  { key: "avgCleaningCost", label: "Ø Reinigungskosten (€)", synonyms: ["reinigungskosten", "reinigung"], kind: "number" },
  { key: "extraPersonCost", label: "Mehrkosten pro Person (€)", synonyms: ["mehrkosten", "zusätzliche person", "zusatzperson", "extra person"], kind: "number" },
  { key: "sourceUrl", label: "Quellenlink", synonyms: ["quellenlink", "link", "url"], kind: "text" },
  { key: "notes", label: "Notizen", synonyms: ["notizen", "anmerkungen", "kommentar"], kind: "text" },
];

const normalizeHeader = (h: string | number | null): string =>
  String(h ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Mapping: Feld-Key → Spaltenindex (oder null = nicht zugeordnet). */
export type ColumnMapping = Record<string, number | null>;

/**
 * Schlägt anhand der Kopfzeile automatisch ein Spalten-Mapping vor.
 * Erkennung über Spaltennamen und Synonyme, nicht über feste Zellpositionen.
 */
export function suggestMapping(
  headers: (string | number | null)[],
  fields: ImportField[]
): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const field of fields) {
    let found: number | null = null;
    for (let i = 0; i < normalized.length; i++) {
      if (used.has(i) || normalized[i] === "") continue;
      const header = normalized[i];
      const match = field.synonyms.some(
        (s) => header === s || header.includes(s)
      );
      if (match) {
        found = i;
        break;
      }
    }
    mapping[field.key] = found;
    if (found != null) used.add(found);
  }
  return mapping;
}

/** Spalten der Datei, die keinem Zielfeld zugeordnet sind. */
export function unmappedColumns(
  headers: (string | number | null)[],
  mapping: ColumnMapping
): string[] {
  const mapped = new Set(
    Object.values(mapping).filter((v): v is number => v != null)
  );
  return headers
    .map((h, i) => ({ h: normalizeHeader(h), i }))
    .filter(({ h, i }) => h !== "" && !mapped.has(i))
    .map(({ h }) => h);
}

export interface RowError {
  rowNumber: number;
  message: string;
}

function cellToNumber(cell: string | number | null): number | null {
  if (cell == null || cell === "") return null;
  if (typeof cell === "number") return cell;
  return parseLocaleNumber(String(cell));
}

function cellToText(cell: string | number | null): string {
  if (cell == null) return "";
  return String(cell).trim();
}

/** Baut aus Matrix und Mapping validierte Objekt-Datensätze. */
export function buildPropertiesFromMatrix(
  matrix: Matrix,
  mapping: ColumnMapping
): { rows: PropertyInput[]; errors: RowError[] } {
  const rows: PropertyInput[] = [];
  const errors: RowError[] = [];
  const get = (row: (string | number | null)[], key: string) => {
    const idx = mapping[key];
    return idx == null ? null : (row[idx] ?? null);
  };

  matrix.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const isEmpty = row.every((c) => c == null || String(c).trim() === "");
    if (isEmpty) return;

    const name = cellToText(get(row, "name"));
    const property = emptyProperty(name || `Importiertes Objekt ${rowNumber}`);
    property.address = cellToText(get(row, "address"));
    property.listingUrl = cellToText(get(row, "listingUrl"));

    const numeric = (key: string, label: string): number | null => {
      const v = cellToNumber(get(row, key));
      if (v != null && Number.isNaN(v)) {
        errors.push({
          rowNumber,
          message: `${label}: "${cellToText(get(row, key))}" ist keine gültige Zahl. Der Wert wurde nicht übernommen.`,
        });
        return null;
      }
      return v;
    };

    const positive = (key: string, label: string): number | null => {
      const v = numeric(key, label);
      if (v != null && v <= 0) {
        errors.push({
          rowNumber,
          message: `${label}: ${v} muss größer als 0 sein. Der Wert wurde nicht übernommen.`,
        });
        return null;
      }
      return v;
    };
    const nonNegative = (key: string, label: string): number | null => {
      const v = numeric(key, label);
      if (v != null && v < 0) {
        errors.push({
          rowNumber,
          message: `${label}: ${v} darf nicht negativ sein. Der Wert wurde nicht übernommen.`,
        });
        return null;
      }
      return v;
    };

    property.areaSqm = positive("areaSqm", "Gesamtfläche");
    property.bedrooms = positive("bedrooms", "Schlafräume");
    property.beds = positive("beds", "Betten");
    property.energy.consumption = nonNegative(
      "energyConsumption",
      "Energieverbrauch"
    );
    property.pricing.nightPrice = nonNegative("nightPrice", "Nachtpreis");
    property.pricing.rentedDaysPerMonth = numeric(
      "rentedDaysPerMonth",
      "Vermietete Tage"
    );
    property.costs.coldRent = nonNegative("coldRent", "Kaltmiete");
    property.marketRentPerSqm = positive("marketRentPerSqm", "Markt-Mietpreis");

    const cls = cellToText(get(row, "energyClass")).toUpperCase();
    if (cls !== "") {
      if (["A+", "A", "B", "C", "D", "E", "F", "G", "H"].includes(cls)) {
        property.energy.energyClass = cls as PropertyInput["energy"]["energyClass"];
      } else {
        errors.push({
          rowNumber,
          message: `Energieeffizienzklasse: "${cls}" ist keine gültige Klasse (A+ bis H). Der Wert wurde nicht übernommen.`,
        });
      }
    }

    if (
      property.pricing.rentedDaysPerMonth != null &&
      (property.pricing.rentedDaysPerMonth < 0 ||
        property.pricing.rentedDaysPerMonth > DAYS_PER_MONTH)
    ) {
      errors.push({
        rowNumber,
        message: `Vermietete Tage: ${property.pricing.rentedDaysPerMonth} liegt außerhalb von 0 bis ${DAYS_PER_MONTH}. Der Wert wurde nicht übernommen.`,
      });
      property.pricing.rentedDaysPerMonth = null;
    }

    rows.push(property);
  });

  return { rows, errors };
}

/** Baut aus Matrix und Mapping validierte Standort-Datensätze. */
export function buildLocationsFromMatrix(
  matrix: Matrix,
  mapping: ColumnMapping
): { rows: LocationInput[]; errors: RowError[] } {
  const rows: LocationInput[] = [];
  const errors: RowError[] = [];
  const get = (row: (string | number | null)[], key: string) => {
    const idx = mapping[key];
    return idx == null ? null : (row[idx] ?? null);
  };

  matrix.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const isEmpty = row.every((c) => c == null || String(c).trim() === "");
    if (isEmpty) return;

    const name = cellToText(get(row, "name"));
    const location = emptyLocation(name || `Importierter Standort ${rowNumber}`);
    location.dataSource = cellToText(get(row, "dataSource"));
    location.collectedAt = cellToText(get(row, "collectedAt"));
    location.sourceUrl = cellToText(get(row, "sourceUrl"));
    location.notes = cellToText(get(row, "notes"));

    const numeric = (key: string, label: string): number | null => {
      const v = cellToNumber(get(row, key));
      if (v != null && Number.isNaN(v)) {
        errors.push({
          rowNumber,
          message: `${label}: "${cellToText(get(row, key))}" ist keine gültige Zahl. Der Wert wurde nicht übernommen.`,
        });
        return null;
      }
      return v;
    };

    location.occupancyPct = numeric("occupancyPct", "Auslastungsquote");
    location.rentedDaysPerMonth = numeric("rentedDaysPerMonth", "Vermietete Tage");
    location.avgAnnualRevenue = numeric("avgAnnualRevenue", "Jahresumsatz");
    location.avgRevenuePerNight = numeric("avgRevenuePerNight", "Umsatz pro Nacht");
    location.avgCleaningCost = numeric("avgCleaningCost", "Reinigungskosten");
    location.extraPersonCost = numeric("extraPersonCost", "Mehrkosten pro Person");

    if (
      location.occupancyPct != null &&
      (location.occupancyPct < 0 || location.occupancyPct > 100)
    ) {
      errors.push({
        rowNumber,
        message: `Auslastungsquote: ${location.occupancyPct} % liegt außerhalb von 0 bis 100. Der Wert wurde nicht übernommen.`,
      });
      location.occupancyPct = null;
    }

    rows.push(location);
  });

  return { rows, errors };
}
