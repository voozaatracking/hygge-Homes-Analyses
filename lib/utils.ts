import type {
  ListingInput,
  LocationInput,
  PropertyInput,
} from "@/lib/types/analysis";
import {
  CLEANING_DEFAULTS,
  ELECTRICITY_DEFAULTS,
  LISTING_DEFAULTS,
  REVENUE_DEFAULTS,
  WEEKS_PER_YEAR,
} from "@/lib/config/assumptions";
import type { ProfileDefaults } from "@/lib/profile/settings";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Leeres Objekt. Ohne Profil-Defaults gelten die zentralen Annahmen aus
 * lib/config/assumptions.ts; mit Profil-Defaults werden Strom-, Reinigungs-,
 * Provisions- und Kurtaxe-Annahmen des Nutzers vorbelegt. Bestehende Objekte
 * und importierte Dateien sind davon nicht betroffen.
 */
export function emptyProperty(
  name: string,
  defaults?: ProfileDefaults
): PropertyInput {
  const electricity = {
    ...ELECTRICITY_DEFAULTS,
    ...(defaults
      ? {
          pricePerKwh: defaults.electricity.pricePerKwh,
          surchargePct: defaults.electricity.surchargePct,
        }
      : {}),
  };
  const cleaning = defaults ? { ...defaults.cleaning } : { ...CLEANING_DEFAULTS };
  const revenue = defaults ? { ...defaults.revenue } : { ...REVENUE_DEFAULTS };
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
      touristTaxMode: defaults
        ? (defaults.touristTax.mode as PropertyInput["costs"]["touristTaxMode"])
        : "perPersonNight",
      touristTaxPerPersonNight: defaults?.touristTax.perPersonNight ?? null,
      touristTaxPct: defaults?.touristTax.pct ?? null,
      extras: [],
    },
    electricityAssumptions: electricity,
    cleaningAssumptions: cleaning,
    revenueAssumptions: revenue,
    startInvestment: null,
    marketRentPerSqm: null,
    highlighted: false,
  };
}

export function emptyLocation(
  name: string,
  defaults?: ProfileDefaults
): LocationInput {
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
    listings: [],
    changesPerWeek:
      defaults?.listing.changesPerWeek ?? LISTING_DEFAULTS.changesPerWeek,
  };
}

/** Leeres Inserat mit 52 leeren Kalenderwochen. */
export function emptyListing(name: string): ListingInput {
  return {
    id: newId(),
    name,
    bookingUrl: "",
    rating: null,
    persons: null,
    cleaningCost: null,
    extraCostPerPerson: null,
    weeklyPrices: emptyWeeklyPrices(),
    includeInAggregate: true,
  };
}

export function emptyWeeklyPrices(): (number | null)[] {
  return Array.from({ length: WEEKS_PER_YEAR }, () => null);
}

/** Füllt leere KW mit dem jeweils letzten davor eingetragenen Preis auf. */
export function fillWeeklyPricesRight(
  prices: (number | null)[]
): (number | null)[] {
  const next = [...prices];
  let last: number | null = null;
  for (let i = 0; i < next.length; i++) {
    const v = next[i];
    if (v != null) {
      last = v;
    } else if (last != null) {
      next[i] = last;
    }
  }
  return next;
}

/**
 * Bringt eine Wochenpreis-Liste auf exakt 52 Einträge
 * (zu kurze Listen auffüllen, zu lange abschneiden).
 */
export function normalizeWeeklyPrices(
  prices: (number | null)[] | undefined
): (number | null)[] {
  const result = emptyWeeklyPrices();
  if (!prices) return result;
  for (let i = 0; i < Math.min(prices.length, WEEKS_PER_YEAR); i++) {
    const v = prices[i];
    result[i] = typeof v === "number" && !Number.isNaN(v) ? v : null;
  }
  return result;
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
