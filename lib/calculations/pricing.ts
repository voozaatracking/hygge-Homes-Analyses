import type { PropertyInput } from "@/lib/types/analysis";
import {
  deriveProperty,
  EMPTY_CONTEXT,
  type DeriveContext,
} from "@/lib/calculations/property-calculations";
import {
  DAYS_PER_MONTH,
  PRICING_BASE_SURCHARGE_EUR,
  PRICING_MARKUP_PCT,
} from "@/lib/config/assumptions";
import { formatMissing } from "@/lib/calculations/missing";

/**
 * Empfehlungen für das Pricing-Tool. Rein, ohne IO; ohne Einfluss auf
 * Umsatz, Kosten, Gewinn, Szenarien oder Bewertung.
 *
 * Break-even-Nachtpreis: der Nachtpreis (in der Einheit der Preiseingabe, je
 * Unterkunft oder je Bett), bei dem der Monatsgewinn bei den geplanten
 * vermieteten Nächten genau 0 ist, wenn alle übrigen Eingaben unverändert
 * bleiben. Ohne zweite Kostenrechnung: Der Gewinn ist linear im Nachtpreis
 * (preisabhängig sind nur Plattformprovision und Kurtaxe im Prozentmodus),
 * deriveProperty wird mit zwei Stützpreisen ausgewertet, daraus Steigung
 * und Nullstelle.
 *
 * Mindestpreis = Break-even-Preis × (1 + PRICING_MARKUP_PCT / 100), auf volle
 * Euro aufgerundet. Basispreis = ungerundeter Mindestpreis +
 * PRICING_BASE_SURCHARGE_EUR, auf volle Euro aufgerundet.
 */
export interface BreakEvenPrice {
  price: number | null;
  /** Grund, wenn nicht berechenbar. */
  note: string | null;
}

export interface PricingResult {
  /** Geplante vermietete Nächte pro Monat des Objekts. */
  referenceDays: number | null;
  breakEven: BreakEvenPrice;
  /** Mindestpreis, auf volle Euro aufgerundet. */
  minPrice: number | null;
  /** Basispreis, auf volle Euro aufgerundet. */
  basePrice: number | null;
}

const P1 = 100;
const P2 = 200;

/** Break-even-Nachtpreis bei gegebenen vermieteten Nächten pro Monat. */
export function breakEvenNightPrice(
  input: PropertyInput,
  context: DeriveContext,
  rentedDays: number | null
): BreakEvenPrice {
  if (rentedDays == null || Number.isNaN(rentedDays)) {
    return { price: null, note: formatMissing(["vermietete Tage"]) };
  }
  if (rentedDays <= 0 || rentedDays > DAYS_PER_MONTH) {
    return {
      price: null,
      note: `Nicht berechenbar: Die vermieteten Tage müssen zwischen 1 und ${DAYS_PER_MONTH} liegen.`,
    };
  }
  if (input.pricing.mode === "perBed" && (input.beds == null || input.beds <= 0)) {
    return { price: null, note: formatMissing(["Betten"]) };
  }

  const profitAt = (price: number): number | null => {
    const clone = structuredClone(input);
    clone.pricing.nightPrice = price;
    clone.pricing.rentedDaysPerMonth = rentedDays;
    return deriveProperty(clone, context).monthlyProfit;
  };
  const profit1 = profitAt(P1);
  const profit2 = profitAt(P2);
  if (profit1 == null || profit2 == null) {
    return { price: null, note: "Nicht berechenbar: Noch keine Kosten erfasst." };
  }
  const slope = (profit2 - profit1) / (P2 - P1);
  if (!(slope > 1e-9)) {
    return {
      price: null,
      note: "Nicht berechenbar: Plattformprovision und Kurtaxe erreichen zusammen 100 % des Preises.",
    };
  }
  const price = P1 - profit1 / slope;
  if (!Number.isFinite(price)) {
    return { price: null, note: "Nicht berechenbar." };
  }
  return { price: Math.max(0, price), note: null };
}

/** Auf volle Euro aufrunden; kleine Gleitkommafehler nicht hochrunden. */
export function ceilEuro(value: number): number {
  const rounded = Math.ceil(value - 1e-9);
  return rounded === 0 ? 0 : rounded; // -0 vermeiden
}

export function derivePricing(
  input: PropertyInput,
  context: DeriveContext = EMPTY_CONTEXT
): PricingResult {
  const referenceDays = input.pricing.rentedDaysPerMonth;
  const breakEven = breakEvenNightPrice(input, context, referenceDays);
  if (breakEven.price == null) {
    return { referenceDays, breakEven, minPrice: null, basePrice: null };
  }
  const minRaw = breakEven.price * (1 + PRICING_MARKUP_PCT / 100);
  return {
    referenceDays,
    breakEven,
    minPrice: ceilEuro(minRaw),
    basePrice: ceilEuro(minRaw + PRICING_BASE_SURCHARGE_EUR),
  };
}
