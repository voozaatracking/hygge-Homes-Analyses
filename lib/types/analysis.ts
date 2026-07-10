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
