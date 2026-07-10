import {
  SCORE_FACTOR_LABELS,
  SCORE_NORM_TABLES,
  SCORE_WEIGHTS,
  scoreLabel,
  type ScoreFactorKey,
} from "@/lib/config/normalization-tables";
import { stepLookup } from "@/lib/calculations/steps";

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  /** Roh-Kennwert (z. B. 11,5 €/qm), null wenn nicht berechenbar. */
  raw: number | null;
  /** Normwert 0..1, null wenn nicht berechenbar. */
  norm: number | null;
  weight: number;
  /** Gewichteter Beitrag = Normwert × Gewichtung. */
  contribution: number | null;
}

export interface ScoreResult {
  complete: boolean;
  /** Labels der fehlenden Bewertungsfaktoren (leer, wenn vollständig). */
  missing: string[];
  /** Gesamtscore 0..1, nur gesetzt wenn vollständig. */
  total: number | null;
  /** Verbale Einordnung, nur gesetzt wenn vollständig. */
  label: string | null;
  factors: ScoreFactor[];
}

/**
 * Objektbewertung als gewichtete Summe der normierten Faktoren.
 * Fehlt ein Pflichtwert, wird keine scheinbar vollständige Bewertung angezeigt.
 */
export function scoreProperty(
  raw: Record<ScoreFactorKey, number | null>
): ScoreResult {
  const factors: ScoreFactor[] = (
    Object.keys(SCORE_WEIGHTS) as ScoreFactorKey[]
  ).map((key) => {
    const rawValue = raw[key];
    const norm =
      rawValue == null || rawValue < 0
        ? null
        : stepLookup(SCORE_NORM_TABLES[key], rawValue);
    const weight = SCORE_WEIGHTS[key];
    return {
      key,
      label: SCORE_FACTOR_LABELS[key],
      raw: rawValue,
      norm,
      weight,
      contribution: norm == null ? null : norm * weight,
    };
  });

  const missing = factors.filter((f) => f.norm == null).map((f) => f.label);
  const complete = missing.length === 0;
  const total = complete
    ? factors.reduce((sum, f) => sum + (f.contribution ?? 0), 0)
    : null;

  return {
    complete,
    missing,
    total,
    label: total == null ? null : scoreLabel(total),
    factors,
  };
}
