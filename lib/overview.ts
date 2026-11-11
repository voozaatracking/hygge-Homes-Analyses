import type { PropertyInput } from "@/lib/types/analysis";
import { deriveScenarios } from "@/lib/calculations/scenarios";
import type { DeriveContext } from "@/lib/calculations/property-calculations";

/**
 * Kachelwerte der Objektübersicht, rein und ohne UI.
 * Gewinn oder Verlust pro Monat aus dem moderaten Szenario (Schlüssel "base",
 * im UI "Realistisch": eingegebene Auslastung und Preis ohne Skalierung).
 */
export interface TileSummary {
  id: string;
  name: string;
  /** Adresstext oder Platzhalter. */
  address: string;
  hasAddress: boolean;
  /** Monatsgewinn (positiv) oder -verlust (negativ); null = nicht berechenbar. */
  monthlyProfit: number | null;
  /** Beschriftung passend zum Vorzeichen. */
  label: "Gewinn pro Monat" | "Verlust pro Monat" | "Noch nicht berechenbar";
  tone: "positive" | "negative" | "neutral";
}

export const NO_ADDRESS_TEXT = "Keine Adresse hinterlegt";

export function tileSummary(input: PropertyInput, context?: DeriveContext): TileSummary {
  const scenarios = deriveScenarios(input, context);
  const base = scenarios?.find((s) => s.key === "base") ?? null;
  const profit =
    base?.monthlyProfit != null && Number.isFinite(base.monthlyProfit)
      ? base.monthlyProfit
      : null;
  const address = input.address.text.trim();
  return {
    id: input.id,
    name: input.name.trim() || "Ohne Namen",
    address: address || NO_ADDRESS_TEXT,
    hasAddress: address !== "",
    monthlyProfit: profit,
    label:
      profit == null
        ? "Noch nicht berechenbar"
        : profit < 0
          ? "Verlust pro Monat"
          : "Gewinn pro Monat",
    tone: profit == null ? "neutral" : profit < 0 ? "negative" : "positive",
  };
}

/** Objekt zu einer Kennung aus der URL; null bei leerer oder unbekannter Kennung. */
export function findObject(
  objects: PropertyInput[],
  id: string | null | undefined
): PropertyInput | null {
  if (!id) return null;
  return objects.find((o) => o.id === id) ?? null;
}
