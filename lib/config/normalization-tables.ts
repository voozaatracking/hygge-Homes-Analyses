import type { EnergyClass } from "@/lib/types/analysis";

/**
 * Zentrale Konfiguration der Normierungs- und Schwellenwertlogik.
 *
 * Quelle: "Objektanalyse Eckdaten.xlsx", Blatt "Normierungstabellen",
 * übernommen in der im Anweisungsprompt dokumentierten Form.
 * Die Werte dürfen hier geändert werden, nicht verstreut im UI-Code.
 */

export interface StepEntry {
  /** Untergrenze: Die Stufe gilt ab diesem Wert (einschließlich). */
  min: number;
  value: number;
}

/**
 * Verhalten für Werte unterhalb der ersten Untergrenze einer Stufentabelle.
 * "clampToFirst": Der Wert der ersten Stufe wird verwendet.
 * Dokumentierte Annahme, da die Originaltabellen dazu keine Aussage treffen.
 */
export const BELOW_FIRST_THRESHOLD_BEHAVIOR: "clampToFirst" | "invalid" =
  "clampToFirst";

/** Energieeffizienzklassen nach Verbrauchsschwellen (kWh/qm p.a.). */
export const ENERGY_CLASS_THRESHOLDS: { min: number; cls: EnergyClass }[] = [
  { min: 0.001, cls: "A+" },
  { min: 31, cls: "A" },
  { min: 51, cls: "B" },
  { min: 71, cls: "C" },
  { min: 91, cls: "C" },
  { min: 111, cls: "D" },
  { min: 131, cls: "D" },
  { min: 151, cls: "E" },
  { min: 171, cls: "F" },
  { min: 191, cls: "G" },
  { min: 231, cls: "H" },
];

/**
 * Repräsentativer Mindestverbrauch für Klasse H (keine obere Schwelle in der Tabelle).
 * Dokumentierte, änderbare Annahme.
 */
export const ENERGY_CLASS_H_REPRESENTATIVE = 231;

/** Normierung: Miete pro qm (€/qm). */
export const NORM_MIETE_PRO_QM: StepEntry[] = [
  { min: 0, value: 1.0 },
  { min: 8, value: 0.9 },
  { min: 9, value: 0.8 },
  { min: 10, value: 0.7 },
  { min: 11, value: 0.6 },
  { min: 12, value: 0.5 },
  { min: 13, value: 0.4 },
  { min: 14, value: 0.3 },
  { min: 15, value: 0.2 },
  { min: 16, value: 0.1 },
  { min: 17, value: 0.0 },
];

/**
 * Normierung: Raumproduktivität (qm/Raum).
 * Achtung: erst steigend, dann fallend. Darf nicht durch eine monotone Formel ersetzt werden.
 */
export const NORM_RAUMPRODUKTIVITAET: StepEntry[] = [
  { min: 0, value: 0.0 },
  { min: 16, value: 0.1 },
  { min: 17, value: 0.2 },
  { min: 18, value: 0.3 },
  { min: 19, value: 0.4 },
  { min: 20, value: 0.5 },
  { min: 21, value: 0.6 },
  { min: 22, value: 0.7 },
  { min: 23, value: 0.8 },
  { min: 24, value: 0.9 },
  { min: 25, value: 1.0 },
  { min: 26, value: 0.9 },
  { min: 27, value: 0.8 },
  { min: 28, value: 0.7 },
  { min: 29, value: 0.6 },
  { min: 30, value: 0.5 },
  { min: 31, value: 0.4 },
  { min: 32, value: 0.3 },
  { min: 33, value: 0.2 },
  { min: 34, value: 0.1 },
  { min: 35, value: 0.0 },
  { min: 99, value: 0.0 },
];

/**
 * Normierung: Flächenproduktivität (€/qm).
 * Die Schwellen beziehen sich auf den Monatswert (Umsatz pro Monat / Fläche),
 * dokumentierte Annahme, siehe README.
 */
export const NORM_FLAECHENPRODUKTIVITAET: StepEntry[] = [
  { min: 0, value: 0.0 },
  { min: 25, value: 0.1 },
  { min: 28, value: 0.2 },
  { min: 31, value: 0.3 },
  { min: 34, value: 0.4 },
  { min: 37, value: 0.5 },
  { min: 40, value: 0.6 },
  { min: 43, value: 0.7 },
  { min: 46, value: 0.8 },
  { min: 49, value: 0.9 },
  { min: 52, value: 1.0 },
];

/** Normierung: Betten pro Schlafzimmer beziehungsweise Raum. */
export const NORM_BETTEN_PRO_RAUM: StepEntry[] = [
  { min: 1, value: 0.5 },
  { min: 1.5, value: 0.85 },
  { min: 2, value: 1.0 },
  { min: 2.33, value: 0.9 },
  { min: 2.66, value: 0.8 },
  { min: 3, value: 0.7 },
  { min: 3.33, value: 0.6 },
  { min: 3.67, value: 0.5 },
  { min: 4, value: 0.4 },
  { min: 4.33, value: 0.3 },
  { min: 4.66, value: 0.2 },
  { min: 5, value: 0.1 },
  { min: 999, value: 0.0 },
];

/** Normierung: Energieverbrauch (kWh/qm p.a.). */
export const NORM_ENERGIEVERBRAUCH: StepEntry[] = [
  { min: 0.001, value: 1.0 },
  { min: 31, value: 0.9 },
  { min: 51, value: 0.8 },
  { min: 71, value: 0.7 },
  { min: 91, value: 0.6 },
  { min: 111, value: 0.5 },
  { min: 131, value: 0.4 },
  { min: 151, value: 0.3 },
  { min: 171, value: 0.2 },
  { min: 191, value: 0.1 },
  { min: 231, value: 0.0 },
];

/**
 * Gewichtungen der Objektbewertung. Summe = 1,00.
 * Im ersten Release nicht durch den Nutzer veränderbar (nur hier).
 */
export const SCORE_WEIGHTS = {
  rentPerSqm: 0.25,
  roomProductivity: 0.35,
  areaProductivity: 0.2,
  bedsPerRoom: 0.1,
  energyConsumption: 0.1,
} as const;

export type ScoreFactorKey = keyof typeof SCORE_WEIGHTS;

export const SCORE_FACTOR_LABELS: Record<ScoreFactorKey, string> = {
  rentPerSqm: "Miete pro qm",
  roomProductivity: "Raumproduktivität",
  areaProductivity: "Flächenproduktivität",
  bedsPerRoom: "Betten pro Raum",
  energyConsumption: "Energieverbrauch",
};

export const SCORE_NORM_TABLES: Record<ScoreFactorKey, StepEntry[]> = {
  rentPerSqm: NORM_MIETE_PRO_QM,
  roomProductivity: NORM_RAUMPRODUKTIVITAET,
  areaProductivity: NORM_FLAECHENPRODUKTIVITAET,
  bedsPerRoom: NORM_BETTEN_PRO_RAUM,
  energyConsumption: NORM_ENERGIEVERBRAUCH,
};

/** Verbale Einordnung der Gesamtbewertung. */
export const SCORE_BANDS: { min: number; label: string }[] = [
  { min: 0, label: "schlecht" },
  { min: 0.4, label: "moderat" },
  { min: 0.8, label: "sehr gut" },
];

export function scoreLabel(score: number): string {
  let label = SCORE_BANDS[0].label;
  for (const band of SCORE_BANDS) {
    if (score >= band.min) label = band.label;
  }
  return label;
}
