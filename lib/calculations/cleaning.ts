import { fmtEur, fmtNum } from "@/lib/format";

export interface CleaningResult {
  minutesPerChange: number;
  hoursPerChange: number;
  costPerCleaning: number;
  monthlyCost: number;
  /** Vollständige, anzeigbare Herleitung. */
  lines: string[];
}

/**
 * Berechnet die Reinigungskosten transparent aus Fläche, Minuten pro qm,
 * Stundenlohn und Wechseln pro Monat. Alle Annahmen sind editierbar.
 * Gibt null zurück, wenn eine Eingabe fehlt oder ungültig ist.
 */
export function calcCleaning(params: {
  areaSqm: number | null;
  minutesPerSqm: number | null;
  hourlyWage: number | null;
  changesPerMonth: number | null;
}): CleaningResult | null {
  const { areaSqm, minutesPerSqm, hourlyWage, changesPerMonth } = params;
  if (
    areaSqm == null ||
    minutesPerSqm == null ||
    hourlyWage == null ||
    changesPerMonth == null
  ) {
    return null;
  }
  if (areaSqm <= 0 || minutesPerSqm <= 0 || hourlyWage < 0 || changesPerMonth < 0) {
    return null;
  }

  const minutesPerChange = areaSqm * minutesPerSqm;
  const hoursPerChange = minutesPerChange / 60;
  const costPerCleaning = hoursPerChange * hourlyWage;
  const monthlyCost = costPerCleaning * changesPerMonth;

  const lines = [
    `${fmtNum(areaSqm)} qm × ${fmtNum(minutesPerSqm)} Minuten = ${fmtNum(minutesPerChange)} Minuten pro Reinigung`,
    `${fmtNum(minutesPerChange)} / 60 = ${fmtNum(hoursPerChange, 2)} Stunden pro Reinigung`,
    `${fmtNum(hoursPerChange, 2)} Stunden × ${fmtEur(hourlyWage)} = ${fmtEur(costPerCleaning)} pro Reinigung`,
    `${fmtEur(costPerCleaning)} × ${fmtNum(changesPerMonth)} Wechsel = ${fmtEur(monthlyCost)} Reinigungskosten pro Monat`,
  ];

  return { minutesPerChange, hoursPerChange, costPerCleaning, monthlyCost, lines };
}
