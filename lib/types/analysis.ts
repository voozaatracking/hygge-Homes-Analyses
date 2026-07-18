/**
 * Zentrales Datenmodell der Anwendung.
 * Alle Eingaben sind bewusst `number | null`, damit "keine Eingabe" von "0" unterscheidbar bleibt.
 */

export type EnergyClass = "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export const ENERGY_CLASSES: EnergyClass[] = [
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
];

/** Herkunft eines Wertes: manuell eingegeben, automatisch abgeleitet oder nicht verfügbar. */
export type ValueSource = "manual" | "derived" | "unavailable";

export type PriceMode = "perUnit" | "perBed";

export interface CostItem {
  id: string;
  label: string;
  amount: number | null;
}

export interface ElectricityAssumptions {
  /** Strompreis in €/kWh, frei editierbar. */
  pricePerKwh: number | null;
  /** Aufschlag in Prozent, frei editierbar. */
  surchargePct: number | null;
}

export interface CleaningAssumptions {
  minutesPerSqm: number | null;
  hourlyWage: number | null;
  changesPerMonth: number | null;
}

export interface PropertyInput {
  id: string;
  name: string;
  listingUrl: string;
  address: string;

  areaSqm: number | null;
  bedrooms: number | null;
  beds: number | null;

  energy: {
    /** Manuell eingegebener Energieverbrauch in kWh/qm p.a. */
    consumption: number | null;
    /** Manuell eingegebene Energieeffizienzklasse. */
    energyClass: EnergyClass | null;
  };

  pricing: {
    mode: PriceMode;
    /** Bedeutung abhängig von `mode`: Preis für die gesamte Unterkunft oder pro Bett. */
    nightPrice: number | null;
    rentedDaysPerMonth: number | null;
  };

  costs: {
    coldRent: number | null;
    internet: number | null;
    /** Sonstige Nebenkosten inklusive Heizung. */
    ancillary: number | null;
    streaming: number | null;
    gez: number | null;
    gema: number | null;
    laundry: number | null;
    /** Manuelle Stromkosten pro Monat (nur genutzt, wenn useManualElectricity = true). */
    electricityManual: number | null;
    useManualElectricity: boolean;
    /** Manuelle Reinigungskosten pro Monat (nur genutzt, wenn useManualCleaning = true). */
    cleaningManual: number | null;
    useManualCleaning: boolean;
    extras: CostItem[];
  };

  electricityAssumptions: ElectricityAssumptions;
  cleaningAssumptions: CleaningAssumptions;

  /** Durchschnittlicher Markt-Mietpreis in €/qm, manuell recherchiert. */
  marketRentPerSqm: number | null;

  highlighted: boolean;
}

/**
 * Ein recherchiertes Booking-Inserat eines Standorts mit Wochen-Listenpreisen
 * für KW 1 bis 52 (Struktur der Standortanalyse-Excel).
 */
export interface ListingInput {
  id: string;
  name: string;
  /** Link zum Booking-Inserat (optional, reiner Merkposten). */
  bookingUrl: string;
  rating: number | null;
  persons: number | null;
  /** Reinigungskosten pro Gästewechsel. */
  cleaningCost: number | null;
  /** Mehrkosten pro Person. */
  extraCostPerPerson: number | null;
  /** Wochen-Listenpreise KW 1 bis 52. Länge immer 52, fehlende Werte null. */
  weeklyPrices: (number | null)[];
  /** Fließt die Zeile in Durchschnitt und Diagramm ein. */
  includeInAggregate: boolean;
}

export interface LocationInput {
  id: string;
  name: string;
  dataSource: string;
  /** Datum der Datenerhebung (ISO, yyyy-mm-dd). */
  collectedAt: string;

  occupancyPct: number | null;
  rentedDaysPerMonth: number | null;
  avgAnnualRevenue: number | null;
  avgRevenuePerNight: number | null;
  avgCleaningCost: number | null;
  extraPersonCost: number | null;

  sourceUrl: string;
  notes: string;
  highlighted: boolean;

  /** Recherchierte Inserate mit Wochenpreisen (KW-Analyse). */
  listings: ListingInput[];
  /**
   * Annahme des KW-Modells: Gästewechsel pro Woche.
   * Die Excel rechnet mit 2 (ergibt 104 Reinigungen pro Jahr).
   */
  changesPerWeek: number | null;
}

export type AnalysisMode = "object" | "location";

export interface AssumptionsSnapshot {
  daysPerMonth: number;
  monthsPerYear: number;
  electricityDefaults: { pricePerKwh: number; surchargePct: number };
  cleaningDefaults: {
    minutesPerSqm: number;
    hourlyWage: number;
    changesPerMonth: number;
  };
  energyClassHRepresentative: number;
  belowFirstThresholdBehavior: string;
}

/** Versioniertes Export-/Importformat (JSON). */
export interface AnalysisFile {
  schemaVersion: number;
  calcVersion: string;
  exportedAt: string;
  analysisMode: AnalysisMode;
  objects: PropertyInput[];
  locations: LocationInput[];
  assumptions: AssumptionsSnapshot;
}
