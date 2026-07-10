import type { AssumptionsSnapshot } from "@/lib/types/analysis";
import {
  BELOW_FIRST_THRESHOLD_BEHAVIOR,
  ENERGY_CLASS_H_REPRESENTATIVE,
} from "@/lib/config/normalization-tables";

/**
 * Zentrale, dokumentierte Annahmen der Berechnungslogik.
 * Strompreis, Aufschlag und Reinigungswerte sind nur Startwerte:
 * Sie werden im UI sichtbar angezeigt und sind pro Objekt frei editierbar.
 */

export const CALC_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1;

/** Standardlogik der bisherigen Tabelle: 30 Tage pro Monat, 12 Monate pro Jahr. */
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

export const ELECTRICITY_DEFAULTS = {
  pricePerKwh: 0.35,
  surchargePct: 30,
};

export const CLEANING_DEFAULTS = {
  minutesPerSqm: 2,
  hourlyWage: 22,
  changesPerMonth: 4,
};

/** Toleranzen für Widerspruchswarnungen in der Standortanalyse. */
export const LOCATION_CONFLICT_TOLERANCE = {
  /** Absolute Abweichung in Tagen zwischen manueller Eingabe und Ableitung. */
  daysAbs: 0.5,
  /** Relative Abweichung in Prozent zwischen zwei Umsatzableitungen. */
  revenueRelPct: 10,
};

export function assumptionsSnapshot(): AssumptionsSnapshot {
  return {
    daysPerMonth: DAYS_PER_MONTH,
    monthsPerYear: MONTHS_PER_YEAR,
    electricityDefaults: { ...ELECTRICITY_DEFAULTS },
    cleaningDefaults: { ...CLEANING_DEFAULTS },
    energyClassHRepresentative: ENERGY_CLASS_H_REPRESENTATIVE,
    belowFirstThresholdBehavior: BELOW_FIRST_THRESHOLD_BEHAVIOR,
  };
}
