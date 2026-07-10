import type { LocationInput, ValueSource } from "@/lib/types/analysis";
import {
  DAYS_PER_MONTH,
  LOCATION_CONFLICT_TOLERANCE,
  MONTHS_PER_YEAR,
} from "@/lib/config/assumptions";
import { fmtEur, fmtNum } from "@/lib/format";

export interface SourcedValue {
  value: number;
  source: ValueSource;
  /** Kurzer Hinweis zur Herkunft, z. B. "aus Jahresumsatz berechnet". */
  note: string | null;
}

export interface DerivedLocation {
  occupancyRate: SourcedValue | null;
  rentedDays: SourcedValue | null;
  monthlyRevenue: SourcedValue | null;
  /** Zweite Umsatzableitung aus Umsatz pro Nacht × vermietete Tage (falls möglich). */
  monthlyRevenueFromNight: SourcedValue | null;
  annualRevenue: SourcedValue | null;
  revenuePerNight: SourcedValue | null;
  cleaningCost: SourcedValue | null;
  extraPersonCost: SourcedValue | null;
  /** Widerspruchs- und Abweichungswarnungen. Manuelle Eingaben werden nie überschrieben. */
  warnings: string[];
}

const manual = (value: number, note: string | null = null): SourcedValue => ({
  value,
  source: "manual",
  note,
});
const derived = (value: number, note: string): SourcedValue => ({
  value,
  source: "derived",
  note,
});

/** Zentrale Ableitung aller Standortkennzahlen inkl. Herkunft und Warnungen. */
export function deriveLocation(input: LocationInput): DerivedLocation {
  const warnings: string[] = [];

  const pct =
    input.occupancyPct != null &&
    input.occupancyPct >= 0 &&
    input.occupancyPct <= 100
      ? input.occupancyPct
      : null;
  const days =
    input.rentedDaysPerMonth != null &&
    input.rentedDaysPerMonth >= 0 &&
    input.rentedDaysPerMonth <= DAYS_PER_MONTH
      ? input.rentedDaysPerMonth
      : null;

  let occupancyRate: SourcedValue | null = null;
  let rentedDays: SourcedValue | null = null;

  if (pct != null && days != null) {
    occupancyRate = manual(pct / 100);
    rentedDays = manual(days);
    const derivedDays = (pct / 100) * DAYS_PER_MONTH;
    if (Math.abs(derivedDays - days) > LOCATION_CONFLICT_TOLERANCE.daysAbs) {
      warnings.push(
        `Auslastungsquote und vermietete Tage passen nicht zusammen: ${fmtNum(pct, 1)} % entsprechen ${fmtNum(derivedDays, 1)} Tagen pro Monat, eingegeben sind ${fmtNum(days, 1)} Tage. Beide Eingaben bleiben unverändert, bitte prüfen.`
      );
    }
  } else if (pct != null) {
    occupancyRate = manual(pct / 100);
    rentedDays = derived(
      (pct / 100) * DAYS_PER_MONTH,
      "aus Auslastungsquote × 30 berechnet"
    );
  } else if (days != null) {
    rentedDays = manual(days);
    occupancyRate = derived(
      days / DAYS_PER_MONTH,
      "aus vermieteten Tagen / 30 berechnet"
    );
  }

  const annualRevenue =
    input.avgAnnualRevenue != null && input.avgAnnualRevenue >= 0
      ? manual(input.avgAnnualRevenue)
      : null;

  const monthlyRevenue = annualRevenue
    ? derived(
        annualRevenue.value / MONTHS_PER_YEAR,
        "aus Jahresumsatz / 12 berechnet"
      )
    : null;

  const revenuePerNight =
    input.avgRevenuePerNight != null && input.avgRevenuePerNight >= 0
      ? manual(input.avgRevenuePerNight)
      : null;

  const monthlyRevenueFromNight =
    revenuePerNight && rentedDays
      ? derived(
          revenuePerNight.value * rentedDays.value,
          "aus Umsatz pro Nacht × vermietete Tage geschätzt"
        )
      : null;

  if (monthlyRevenue && monthlyRevenueFromNight && monthlyRevenue.value > 0) {
    const relDiff =
      Math.abs(monthlyRevenueFromNight.value - monthlyRevenue.value) /
      monthlyRevenue.value;
    if (relDiff * 100 > LOCATION_CONFLICT_TOLERANCE.revenueRelPct) {
      warnings.push(
        `Die beiden Umsatzableitungen weichen um ${fmtNum(relDiff * 100, 1)} % voneinander ab: ${fmtEur(monthlyRevenue.value)} pro Monat aus dem Jahresumsatz gegenüber ${fmtEur(monthlyRevenueFromNight.value)} aus Umsatz pro Nacht × Tage. Beide Werte werden angezeigt, keine Eingabe wird überschrieben.`
      );
    }
  }

  return {
    occupancyRate,
    rentedDays,
    monthlyRevenue,
    monthlyRevenueFromNight,
    annualRevenue,
    revenuePerNight,
    cleaningCost:
      input.avgCleaningCost != null && input.avgCleaningCost >= 0
        ? manual(input.avgCleaningCost)
        : null,
    extraPersonCost:
      input.extraPersonCost != null && input.extraPersonCost >= 0
        ? manual(input.extraPersonCost)
        : null,
    warnings,
  };
}
