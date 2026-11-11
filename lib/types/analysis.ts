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
  /**
   * Angenommener Stromverbrauch in kWh/qm pro Monat, frei editierbar.
   * Bewusst unabhängig vom Energieausweis-Verbrauch: Dieser beschreibt
   * den Heizenergiebedarf und ist keine Grundlage für die Stromrechnung.
   */
  consumptionKwhSqmMonth: number | null;
}

export interface CleaningAssumptions {
  minutesPerSqm: number | null;
  hourlyWage: number | null;
  changesPerMonth: number | null;
}

export interface RevenueAssumptions {
  /**
   * Plattformprovision in Prozent des Umsatzes (Airbnb, Booking usw.),
   * frei editierbar. Wird als eigene Kostenzeile vom Umsatz abgezogen.
   */
  platformCommissionPct: number | null;
}

/** Erfassungsmodus der Kurtaxe: Euro pro Person und Nacht oder Prozent vom Preis. */
export type TouristTaxMode = "perPersonNight" | "percentOfPrice";

export const TOURIST_TAX_MODES: TouristTaxMode[] = [
  "perPersonNight",
  "percentOfPrice",
];

/** Adresse mit optionalen Koordinaten (nur serverseitig ermittelt, siehe /api/geocode). */
export interface GeoAddress {
  text: string;
  lat: number | null;
  lng: number | null;
}

export type TravelOriginMode = "hq" | "custom";
export type TravelCostMode = "perKm" | "perTrip";

/**
 * Fahrtkosten für die Reinigung (Fixkosten, nicht umsatzabhängig).
 * - perKm: Strecke × 2 (Hin und zurück) × Satz × Fahrten pro Monat
 * - perTrip: Fixpreis je Fahrt (Hin und zurück) × Fahrten pro Monat
 * tripsPerMonth leer bedeutet: Reinigungen pro Monat des Objekts.
 */
export interface TravelInput {
  enabled: boolean;
  originMode: TravelOriginMode;
  customOrigin: GeoAddress;
  costMode: TravelCostMode;
  ratePerKm: number | null;
  pricePerTrip: number | null;
  tripsPerMonth: number | null;
}

export interface PropertyInput {
  id: string;
  name: string;
  listingUrl: string;
  /** Standort des Objekts; Koordinaten optional für Entfernung und Fahrtkosten. */
  address: GeoAddress;
  travel: TravelInput;

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
    /**
     * Erfassungsmodus der Kurtaxe / Tourismusabgabe. Es gilt immer nur das
     * Feld des aktiven Modus; der Wert des anderen Modus bleibt erhalten.
     * - "perPersonNight": € pro Person und Nacht (touristTaxPerPersonNight)
     * - "percentOfPrice": Prozent vom Übernachtungspreis (touristTaxPct)
     */
    touristTaxMode: TouristTaxMode;
    /**
     * Kurtaxe / Tourismusabgabe in € pro Person und Nacht. Optional:
     * Nur wenn ausgefüllt und größer 0, entsteht eine Kostenzeile
     * (Betrag × Betten × vermietete Nächte pro Monat).
     */
    touristTaxPerPersonNight: number | null;
    /**
     * Kurtaxe / Tourismusabgabe in Prozent vom Übernachtungspreis. Optional:
     * Nur wenn ausgefüllt und größer 0, entsteht eine Kostenzeile
     * (Monatsumsatz × Prozent / 100, dieselbe Preisbasis wie die Provision).
     */
    touristTaxPct: number | null;
    extras: CostItem[];
  };

  electricityAssumptions: ElectricityAssumptions;
  cleaningAssumptions: CleaningAssumptions;
  revenueAssumptions: RevenueAssumptions;

  /**
   * Einmalige Startinvestition in € (Einrichtung, Kaution, Erstausstattung).
   * Grundlage der Amortisationsrechnung.
   */
  startInvestment: number | null;

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
  electricityDefaults: {
    pricePerKwh: number;
    surchargePct: number;
    consumptionKwhSqmMonth: number;
  };
  cleaningDefaults: {
    minutesPerSqm: number;
    hourlyWage: number;
    changesPerMonth: number;
  };
  revenueDefaults: { platformCommissionPct: number };
  scenarioFactors: {
    pessimistic: { occupancyFactor: number; priceFactor: number };
    optimistic: { occupancyFactor: number; priceFactor: number };
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
