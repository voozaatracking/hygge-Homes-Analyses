import {
  BELOW_FIRST_THRESHOLD_BEHAVIOR,
  type StepEntry,
} from "@/lib/config/normalization-tables";

/**
 * Stufen-Lookup: Es gilt die Stufe, deren Untergrenze zuletzt erreicht wurde.
 * Werte unterhalb der ersten Untergrenze werden gemäß konfigurierter Annahme behandelt.
 */
export function stepLookup(
  table: StepEntry[],
  value: number | null | undefined
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const sorted = [...table].sort((a, b) => a.min - b.min);
  let hit: StepEntry | null = null;
  for (const entry of sorted) {
    if (value >= entry.min) hit = entry;
    else break;
  }
  if (!hit) {
    return BELOW_FIRST_THRESHOLD_BEHAVIOR === "clampToFirst"
      ? sorted[0].value
      : null;
  }
  return hit.value;
}
