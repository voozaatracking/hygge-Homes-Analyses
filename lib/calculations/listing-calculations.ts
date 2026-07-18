import type {
  ListingInput,
  LocationInput,
  ValueSource,
} from "@/lib/types/analysis";
import {
  DAYS_PER_MONTH,
  LISTING_DEFAULTS,
  MONTHS_PER_YEAR,
  NIGHTS_PER_YEAR,
  WEEKS_PER_YEAR,
} from "@/lib/config/assumptions";

/**
 * Inserats- und KW-Analyse eines Standorts.
 *
 * Rechenmodell aus der Standortanalyse-Excel:
 * - Basis pro Inserat: Summe der 52 Wochen-Listenpreise minus Reinigungskosten
 *   × 52 Wochen × Gästewechsel pro Woche (Excel: 2 → 104).
 * - Umsatz pro Jahr = Basis × Auslastungsquote des Standorts.
 * - Umsatz pro vermieteter Nacht = Basis / 364 (unabhängig von der Quote).
 * - Fehlende Reinigungskosten eines Inserats werden durch den Durchschnitt
 *   der angegebenen Reinigungskosten ersetzt (Fußnote der Excel).
 */

export interface DerivedListing {
  /** Anzahl ausgefüllter Kalenderwochen (0 bis 52). */
  filledWeeks: number;
  /** Summe der ausgefüllten Wochenpreise; fehlende Wochen zählen als 0. */
  weeklySum: number | null;
  /** Durchschnittlicher Wochenpreis über die ausgefüllten Wochen. */
  avgWeeklyPrice: number | null;
  /** Preisniveau pro Jahr = Summe der 52 Wochen-Listenpreise. */
  yearPriceLevel: number | null;
  /** Preis pro Nacht = durchschnittlicher Wochenpreis / 7. */
  pricePerNight: number | null;
  /** Verwendete Reinigungskosten pro Wechsel inkl. Herkunft. */
  cleaningUsed: { amount: number; source: ValueSource } | null;
  /** Reinigungskosten pro Jahr = Reinigung × 52 × Wechsel pro Woche. */
  cleaningPerYear: number | null;
  /** Basiswert vor Auslastung: Wochenpreissumme minus Jahresreinigung. */
  netListedYear: number | null;
  annualRevenue: number | null;
  monthlyRevenue: number | null;
  revenuePerNight: number | null;
  warnings: string[];
}

export interface ListingAggregate {
  /** Anzahl der einbezogenen Inserate mit auswertbaren Daten. */
  count: number;
  /** Mittelwerte des Preisniveaus über die einbezogenen Inserate. */
  avgWeeklyPrice: number | null;
  avgYearPriceLevel: number | null;
  avgPricePerNight: number | null;
  avgRating: number | null;
  avgCleaning: number | null;
  avgExtraPerson: number | null;
  avgAnnualRevenue: number | null;
  avgMonthlyRevenue: number | null;
  avgRevenuePerNight: number | null;
}

export interface DerivedListingRow {
  listing: ListingInput;
  derived: DerivedListing;
}

export interface DerivedListingAnalysis {
  /** Auslastungsquote (0..1) aus der Standort-Eingabe, sonst null. */
  occupancyRate: number | null;
  /** Vermietete Tage pro Monat = Quote × 30. */
  rentedDaysPerMonth: number | null;
  /** Effektiv verwendete Gästewechsel pro Woche. */
  changesPerWeek: number;
  rows: DerivedListingRow[];
  /** Durchschnitt über alle einbezogenen Inserate. */
  aggregate: ListingAggregate;
  /** Analyseweite Hinweise (fehlende Quote, Reinigungs-Fallback usw.). */
  warnings: string[];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function isValidAmount(value: number | null): value is number {
  return value != null && !Number.isNaN(value) && value >= 0;
}

/** Ableitung eines einzelnen Inserats. Exportiert für Tests. */
export function deriveListing(
  listing: ListingInput,
  context: {
    occupancyRate: number | null;
    changesPerWeek: number;
    cleaningFallback: number | null;
  }
): DerivedListing {
  const warnings: string[] = [];

  const filled = listing.weeklyPrices.filter(isValidAmount);
  const filledWeeks = filled.length;
  const weeklySum =
    filledWeeks > 0 ? filled.reduce((sum, v) => sum + v, 0) : null;

  if (filledWeeks > 0 && filledWeeks < WEEKS_PER_YEAR) {
    warnings.push(
      `Nur ${filledWeeks} von ${WEEKS_PER_YEAR} Kalenderwochen ausgefüllt; fehlende Wochen zählen als 0 €.`
    );
  }

  let cleaningUsed: DerivedListing["cleaningUsed"] = null;
  if (isValidAmount(listing.cleaningCost)) {
    cleaningUsed = { amount: listing.cleaningCost, source: "manual" };
  } else if (context.cleaningFallback != null) {
    cleaningUsed = { amount: context.cleaningFallback, source: "derived" };
  }

  // Preisniveau-Kennzahlen (aktuelle Auswertung der Standortanalyse).
  const avgWeeklyPrice = weeklySum != null ? weeklySum / filledWeeks : null;
  const yearPriceLevel = weeklySum;
  const pricePerNight = avgWeeklyPrice != null ? avgWeeklyPrice / 7 : null;

  // Umsatzmodell (derzeit ausgeblendet, bleibt für eine spätere
  // Wiederaktivierung mitberechnet; erzeugt bewusst keine Warnungen).
  let cleaningPerYear: number | null = null;
  let netListedYear: number | null = null;
  if (weeklySum != null) {
    const cleaningAmount = cleaningUsed?.amount ?? 0;
    cleaningPerYear = cleaningAmount * WEEKS_PER_YEAR * context.changesPerWeek;
    netListedYear = weeklySum - cleaningPerYear;
  }

  const annualRevenue =
    netListedYear != null && context.occupancyRate != null
      ? netListedYear * context.occupancyRate
      : null;
  const monthlyRevenue =
    annualRevenue != null ? annualRevenue / MONTHS_PER_YEAR : null;
  const revenuePerNight =
    netListedYear != null ? netListedYear / NIGHTS_PER_YEAR : null;

  return {
    filledWeeks,
    weeklySum,
    avgWeeklyPrice,
    yearPriceLevel,
    pricePerNight,
    cleaningUsed,
    cleaningPerYear,
    netListedYear,
    annualRevenue,
    monthlyRevenue,
    revenuePerNight,
    warnings,
  };
}

/** Zentrale Ableitung der gesamten KW-Analyse eines Standorts. */
export function deriveListingAnalysis(
  location: LocationInput
): DerivedListingAnalysis {
  const warnings: string[] = [];

  const occupancyRate =
    location.occupancyPct != null &&
    location.occupancyPct >= 0 &&
    location.occupancyPct <= 100
      ? location.occupancyPct / 100
      : null;

  const changesPerWeek =
    location.changesPerWeek != null && location.changesPerWeek > 0
      ? location.changesPerWeek
      : LISTING_DEFAULTS.changesPerWeek;

  const givenCleaningCosts = location.listings
    .map((l) => l.cleaningCost)
    .filter(isValidAmount);
  const cleaningFallback = average(givenCleaningCosts);

  const rows: DerivedListingRow[] = location.listings.map((listing) => ({
    listing,
    derived: deriveListing(listing, {
      occupancyRate,
      changesPerWeek,
      cleaningFallback,
    }),
  }));

  const included = rows.filter((r) => r.listing.includeInAggregate);
  const values = (pick: (row: DerivedListingRow) => number | null): number[] =>
    included
      .map(pick)
      .filter((v): v is number => v != null && !Number.isNaN(v));

  const aggregate: ListingAggregate = {
    count: included.filter((r) => r.derived.weeklySum != null).length,
    avgWeeklyPrice: average(values((r) => r.derived.avgWeeklyPrice)),
    avgYearPriceLevel: average(values((r) => r.derived.yearPriceLevel)),
    avgPricePerNight: average(values((r) => r.derived.pricePerNight)),
    avgRating: average(values((r) => r.listing.rating)),
    avgCleaning: average(values((r) => r.derived.cleaningUsed?.amount ?? null)),
    avgExtraPerson: average(
      values((r) =>
        isValidAmount(r.listing.extraCostPerPerson)
          ? r.listing.extraCostPerPerson
          : null
      )
    ),
    avgAnnualRevenue: average(values((r) => r.derived.annualRevenue)),
    avgMonthlyRevenue: average(values((r) => r.derived.monthlyRevenue)),
    avgRevenuePerNight: average(values((r) => r.derived.revenuePerNight)),
  };

  return {
    occupancyRate,
    rentedDaysPerMonth:
      occupancyRate != null ? occupancyRate * DAYS_PER_MONTH : null,
    changesPerWeek,
    rows,
    aggregate,
    warnings,
  };
}
