import type { PropertyInput } from "@/lib/types/analysis";
import type { DerivedProperty } from "@/lib/calculations/property-calculations";
import type { ScenarioResult } from "@/lib/calculations/scenarios";
import type { FieldErrors } from "@/lib/validation/rules";
import type { MissingNotes } from "@/lib/calculations/missing";

/** Tonalität der Gewinn-Kennzahlen, aus dem Monatsgewinn abgeleitet. */
export type ProfitTone = "neutral" | "positive" | "negative";

/**
 * Gemeinsame Props aller Formular-Sektionen. Der Zustand (Objekt, abgeleitete
 * Kennzahlen, Validierung) liegt in der Wrapper-Komponente PropertyForm;
 * die Sektionen rendern nur und schreiben über `set` zurück.
 */
export interface SectionProps {
  property: PropertyInput;
  derived: DerivedProperty;
  errors: FieldErrors;
  /** Hinweise für nicht berechenbare Kennzahlen (fehlende Eingaben). */
  missing: MissingNotes;
  set: (updater: (draft: PropertyInput) => void) => void;
  scenarios: ScenarioResult[] | null;
  profitTone: ProfitTone;
  /** Sichtbar im aktiven Tab; sonst bleibt die Sektion im DOM, aber ausgeblendet. */
  active: boolean;
}
