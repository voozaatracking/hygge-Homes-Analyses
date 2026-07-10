import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import {
  CLEANING_DEFAULTS,
  ELECTRICITY_DEFAULTS,
} from "@/lib/config/assumptions";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProperty(name: string): PropertyInput {
  return {
    id: newId(),
    name,
    listingUrl: "",
    address: "",
    areaSqm: null,
    bedrooms: null,
    beds: null,
    energy: { consumption: null, energyClass: null },
    pricing: { mode: "perUnit", nightPrice: null, rentedDaysPerMonth: null },
    costs: {
      coldRent: null,
      internet: null,
      ancillary: null,
      streaming: null,
      gez: null,
      gema: null,
      laundry: null,
      electricityManual: null,
      useManualElectricity: false,
      cleaningManual: null,
      useManualCleaning: false,
      extras: [],
    },
    electricityAssumptions: { ...ELECTRICITY_DEFAULTS },
    cleaningAssumptions: { ...CLEANING_DEFAULTS },
    marketRentPerSqm: null,
    highlighted: false,
  };
}

export function emptyLocation(name: string): LocationInput {
  return {
    id: newId(),
    name,
    dataSource: "",
    collectedAt: new Date().toISOString().slice(0, 10),
    occupancyPct: null,
    rentedDaysPerMonth: null,
    avgAnnualRevenue: null,
    avgRevenuePerNight: null,
    avgCleaningCost: null,
    extraPersonCost: null,
    sourceUrl: "",
    notes: "",
    highlighted: false,
  };
}

export type SortDirection = "asc" | "desc";

/**
 * Sortiert Zeilen nach einem per Funktion gelieferten Wert.
 * null-Werte stehen immer am Ende, unabhängig von der Richtung.
 */
export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => number | string | null,
  direction: SortDirection
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" || typeof vb === "string") {
      return String(va).localeCompare(String(vb), "de") * factor;
    }
    return (va - vb) * factor;
  });
}
