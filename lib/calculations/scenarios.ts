import type { PropertyInput } from "@/lib/types/analysis";
import { DAYS_PER_MONTH, SCENARIO_FACTORS } from "@/lib/config/assumptions";
import { deriveProperty } from "@/lib/calculations/property-calculations";

export type ScenarioKey = "pessimistic" | "base" | "optimistic";

export interface ScenarioResult {
  key: ScenarioKey;
  label: string;
  occupancyFactor: number;
  priceFactor: number;
  /** Skalierter Nachtpreis (Bedeutung wie in der Eingabe: pro Einheit oder pro Bett). */
  nightPrice: number;
  /** Skalierte vermietete Nächte pro Monat, begrenzt auf 0 bis 30. */
  rentedDaysPerMonth: number;
  monthlyRevenue: number | null;
  totalMonthlyCosts: number | null;
  monthlyProfit: number | null;
  annualProfit: number | null;
}

const SCENARIO_DEFS: {
  key: ScenarioKey;
  label: string;
  occupancyFactor: number;
  priceFactor: number;
}[] = [
  {
    key: "pessimistic",
    label: "Pessimistisch",
    ...SCENARIO_FACTORS.pessimistic,
  },
  { key: "base", label: "Realistisch", occupancyFactor: 1, priceFactor: 1 },
  { key: "optimistic", label: "Optimistisch", ...SCENARIO_FACTORS.optimistic },
];

/**
 * Rechnet das Objekt in drei Szenarien durch. Das realistische Szenario
 * entspricht den eingegebenen Werten; pessimistisch und optimistisch
 * skalieren Auslastung und Nachtpreis mit den zentralen Faktoren.
 *
 * Umsatzabhängige Kosten (Plattformprovision, Kurtaxe) skalieren automatisch
 * mit, alle übrigen Kosten bleiben fix, da die vollständige Ableitung
 * (deriveProperty) je Szenario erneut ausgeführt wird.
 *
 * Gibt null zurück, wenn Nachtpreis oder vermietete Nächte fehlen.
 */
export function deriveScenarios(
  input: PropertyInput
): ScenarioResult[] | null {
  const { nightPrice, rentedDaysPerMonth } = input.pricing;
  if (
    nightPrice == null ||
    nightPrice < 0 ||
    rentedDaysPerMonth == null ||
    rentedDaysPerMonth < 0 ||
    rentedDaysPerMonth > DAYS_PER_MONTH
  ) {
    return null;
  }

  return SCENARIO_DEFS.map((def) => {
    const scaledPrice = nightPrice * def.priceFactor;
    const scaledDays = Math.min(
      DAYS_PER_MONTH,
      Math.max(0, rentedDaysPerMonth * def.occupancyFactor)
    );
    const clone = structuredClone(input);
    clone.pricing.nightPrice = scaledPrice;
    clone.pricing.rentedDaysPerMonth = scaledDays;
    const derived = deriveProperty(clone);
    return {
      key: def.key,
      label: def.label,
      occupancyFactor: def.occupancyFactor,
      priceFactor: def.priceFactor,
      nightPrice: scaledPrice,
      rentedDaysPerMonth: scaledDays,
      monthlyRevenue: derived.monthlyRevenue,
      totalMonthlyCosts: derived.totalMonthlyCosts,
      monthlyProfit: derived.monthlyProfit,
      annualProfit: derived.annualProfit,
    };
  });
}
