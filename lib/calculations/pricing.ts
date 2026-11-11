import type { PropertyInput } from "@/lib/types/analysis";
import {
  deriveProperty,
  EMPTY_CONTEXT,
  type DeriveContext,
} from "@/lib/calculations/property-calculations";
import { DAYS_PER_MONTH, PRICING_DEFAULTS } from "@/lib/config/assumptions";
import { formatMissing } from "@/lib/calculations/missing";

/**
 * Break-even-Nachtpreis und Mindestpreis für das Pricing-Tool. Rein, ohne IO.
 *
 * Definition: Der Break-even-Nachtpreis ist der Nachtpreis (in der Einheit
 * der Preiseingabe, also je Unterkunft oder je Bett), bei dem der
 * Monatsgewinn genau 0 ist, wenn alle übrigen Eingaben unverändert bleiben
 * und die vermieteten Nächte der Bezugsauslastung entsprechen.
 *
 * Umsetzung ohne zweite Kostenrechnung: Der Monatsgewinn ist linear im
 * Nachtpreis (preisabhängig sind nur Plattformprovision und Kurtaxe im
 * Prozentmodus, beide proportional zum Umsatz). deriveProperty wird mit zwei
 * Stützpreisen ausgewertet, daraus folgen Steigung und Nullstelle.
 */
export interface PricingOptions {
  /** Aufschlag in Prozent auf den Break-even-Preis; Standard PRICING_DEFAULTS.markupPct. */
  markupPct?: number | null;
  /** Bezugsauslastung in vermieteten Nächten pro Monat; leer = geplante Auslastung des Objekts. */
  referenceDays?: number | null;
}

export interface BreakEvenPrice {
  price: number | null;
  /** Grund, wenn nicht berechenbar. */
  note: string | null;
}

export interface PricingResult {
  /** Verwendete Bezugsauslastung (Nächte pro Monat) oder null. */
  referenceDays: number | null;
  markupPct: number;
  breakEvenPlanned: BreakEvenPrice;
  breakEvenFull: BreakEvenPrice;
  /** Mindestpreis = Break-even-Preis × (1 + Aufschlag / 100). */
  minPricePlanned: number | null;
  minPriceFull: number | null;
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
      note: `Nicht berechenbar: Die Bezugsauslastung muss zwischen 1 und ${DAYS_PER_MONTH} Nächten liegen.`,
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

export function derivePricing(
  input: PropertyInput,
  context: DeriveContext = EMPTY_CONTEXT,
  options: PricingOptions = {}
): PricingResult {
  const markupPct =
    options.markupPct != null && !Number.isNaN(options.markupPct)
      ? options.markupPct
      : PRICING_DEFAULTS.markupPct;
  const referenceDays =
    options.referenceDays != null && !Number.isNaN(options.referenceDays)
      ? options.referenceDays
      : input.pricing.rentedDaysPerMonth;

  const breakEvenPlanned = breakEvenNightPrice(input, context, referenceDays);
  const breakEvenFull = breakEvenNightPrice(input, context, DAYS_PER_MONTH);
  const withMarkup = (price: number | null) =>
    price == null ? null : price * (1 + markupPct / 100);

  return {
    referenceDays,
    markupPct,
    breakEvenPlanned,
    breakEvenFull,
    minPricePlanned: withMarkup(breakEvenPlanned.price),
    minPriceFull: withMarkup(breakEvenFull.price),
  };
}
