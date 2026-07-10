import type { PropertyInput, ValueSource } from "@/lib/types/analysis";
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from "@/lib/config/assumptions";
import { calcElectricity, type ElectricityResult } from "@/lib/calculations/electricity";
import { calcCleaning, type CleaningResult } from "@/lib/calculations/cleaning";
import { effectiveEnergy, type EffectiveEnergy } from "@/lib/calculations/energy";
import { scoreProperty, type ScoreResult } from "@/lib/calculations/scoring";

/** Sichere Division: null bei fehlenden Werten oder Divisor <= 0. */
export function safeDiv(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

/**
 * Effektiver Nachtpreis der Unterkunft.
 * Bei "Nachtpreis pro Bett": Preis pro Bett × Anzahl Betten.
 * Bei "Nachtpreis für die gesamte Unterkunft": eingegebener Nachtpreis.
 */
export function effectiveNightPrice(p: {
  mode: "perUnit" | "perBed";
  nightPrice: number | null;
  beds: number | null;
}): number | null {
  if (p.nightPrice == null || p.nightPrice < 0) return null;
  if (p.mode === "perBed") {
    if (p.beds == null || p.beds <= 0) return null;
    return p.nightPrice * p.beds;
  }
  return p.nightPrice;
}

/** Nachtpreis pro Bett = effektiver Nachtpreis der Unterkunft / Anzahl Betten. */
export function pricePerBed(
  effectivePrice: number | null,
  beds: number | null
): number | null {
  return safeDiv(effectivePrice, beds);
}

/** Auslastungsquote = vermietete Tage pro Monat / 30. Nur gültig für 0..30 Tage. */
export function occupancyRate(rentedDays: number | null): number | null {
  if (rentedDays == null || rentedDays < 0 || rentedDays > DAYS_PER_MONTH) {
    return null;
  }
  return rentedDays / DAYS_PER_MONTH;
}

export function monthlyRevenue(
  effectivePrice: number | null,
  rentedDays: number | null
): number | null {
  if (
    effectivePrice == null ||
    rentedDays == null ||
    rentedDays < 0 ||
    rentedDays > DAYS_PER_MONTH
  ) {
    return null;
  }
  return effectivePrice * rentedDays;
}

/** Mindestpreis pro Nacht bei 100 % Auslastung = Umsatz pro Monat / 30. */
export function minPriceAtFullOccupancy(
  monthlyRev: number | null
): number | null {
  if (monthlyRev == null) return null;
  return monthlyRev / DAYS_PER_MONTH;
}

export function annualRevenue(monthlyRev: number | null): number | null {
  if (monthlyRev == null) return null;
  return monthlyRev * MONTHS_PER_YEAR;
}

/** Miete pro qm = Kaltmiete / Gesamtfläche. */
export function rentPerSqm(
  coldRent: number | null,
  areaSqm: number | null
): number | null {
  return safeDiv(coldRent, areaSqm);
}

/**
 * Mietpreis-Abweichung = (Miete pro qm − Markt-Mietpreis pro qm) / Markt-Mietpreis pro qm.
 * Null (= "nicht berechenbar"), wenn der Marktpreis fehlt oder <= 0 ist.
 */
export function marketDeviation(
  rentSqm: number | null,
  marketRentSqm: number | null
): number | null {
  if (rentSqm == null || marketRentSqm == null || marketRentSqm <= 0) {
    return null;
  }
  return (rentSqm - marketRentSqm) / marketRentSqm;
}

export interface CostLine {
  label: string;
  amount: number;
  source: ValueSource;
}

export interface DerivedProperty {
  energy: EffectiveEnergy;

  effectiveNightPrice: number | null;
  pricePerBed: number | null;
  occupancyRate: number | null;
  monthlyRevenue: number | null;
  minPriceAtFullOccupancy: number | null;
  annualRevenue: number | null;

  electricityAuto: ElectricityResult | null;
  electricityUsed: { amount: number; source: ValueSource } | null;
  cleaningAuto: CleaningResult | null;
  cleaningUsed: { amount: number; source: ValueSource } | null;

  costLines: CostLine[];
  totalMonthlyCosts: number | null;
  monthlyProfit: number | null;
  annualProfit: number | null;

  rentPerSqm: number | null;
  marketDeviation: number | null;

  areaProductivityMonthly: number | null;
  areaProductivityAnnual: number | null;
  roomProductivity: number | null;
  bedProductivity: number | null;
  bedsPerRoom: number | null;

  score: ScoreResult;
}

/**
 * Zentrale Ableitung aller Kennzahlen eines Objekts.
 * Einzige Quelle für UI, Vergleichstabelle und Exporte.
 */
export function deriveProperty(input: PropertyInput): DerivedProperty {
  const energy = effectiveEnergy(input.energy);

  const effPrice = effectiveNightPrice({
    mode: input.pricing.mode,
    nightPrice: input.pricing.nightPrice,
    beds: input.beds,
  });
  const perBed = pricePerBed(effPrice, input.beds);
  const occRate = occupancyRate(input.pricing.rentedDaysPerMonth);
  const monthlyRev = monthlyRevenue(effPrice, input.pricing.rentedDaysPerMonth);
  const minPrice = minPriceAtFullOccupancy(monthlyRev);
  const annualRev = annualRevenue(monthlyRev);

  const electricityAuto = calcElectricity({
    consumptionKwhSqmYear: energy.consumption,
    areaSqm: input.areaSqm,
    pricePerKwh: input.electricityAssumptions.pricePerKwh,
    surchargePct: input.electricityAssumptions.surchargePct,
  });
  const electricityUsed = input.costs.useManualElectricity
    ? input.costs.electricityManual != null && input.costs.electricityManual >= 0
      ? { amount: input.costs.electricityManual, source: "manual" as const }
      : null
    : electricityAuto
      ? { amount: electricityAuto.monthlyCost, source: "derived" as const }
      : null;

  const cleaningAuto = calcCleaning({
    areaSqm: input.areaSqm,
    minutesPerSqm: input.cleaningAssumptions.minutesPerSqm,
    hourlyWage: input.cleaningAssumptions.hourlyWage,
    changesPerMonth: input.cleaningAssumptions.changesPerMonth,
  });
  const cleaningUsed = input.costs.useManualCleaning
    ? input.costs.cleaningManual != null && input.costs.cleaningManual >= 0
      ? { amount: input.costs.cleaningManual, source: "manual" as const }
      : null
    : cleaningAuto
      ? { amount: cleaningAuto.monthlyCost, source: "derived" as const }
      : null;

  const costLines: CostLine[] = [];
  const pushManual = (label: string, amount: number | null) => {
    if (amount != null && amount >= 0) {
      costLines.push({ label, amount, source: "manual" });
    }
  };
  pushManual("Kaltmiete", input.costs.coldRent);
  if (electricityUsed) {
    costLines.push({ label: "Strom", ...electricityUsed });
  }
  pushManual("Internet", input.costs.internet);
  pushManual("Sonstige Nebenkosten inkl. Heizung", input.costs.ancillary);
  pushManual("Netflix / Streaming", input.costs.streaming);
  pushManual("GEZ-Gebühr", input.costs.gez);
  pushManual("GEMA-Gebühr", input.costs.gema);
  pushManual("Wäsche", input.costs.laundry);
  if (cleaningUsed) {
    costLines.push({ label: "Reinigung", ...cleaningUsed });
  }
  for (const extra of input.costs.extras) {
    pushManual(extra.label || "Sonstige Kosten", extra.amount);
  }

  const totalMonthlyCosts =
    costLines.length > 0
      ? costLines.reduce((sum, line) => sum + line.amount, 0)
      : null;

  const monthlyProfit =
    monthlyRev != null && totalMonthlyCosts != null
      ? monthlyRev - totalMonthlyCosts
      : null;
  const annualProfit =
    monthlyProfit != null ? monthlyProfit * MONTHS_PER_YEAR : null;

  const rentSqm = rentPerSqm(input.costs.coldRent, input.areaSqm);
  const deviation = marketDeviation(rentSqm, input.marketRentPerSqm);

  const areaProdMonthly = safeDiv(monthlyRev, input.areaSqm);
  const areaProdAnnual =
    areaProdMonthly != null ? areaProdMonthly * MONTHS_PER_YEAR : null;
  const roomProd = safeDiv(input.areaSqm, input.bedrooms);
  const bedProd = safeDiv(input.areaSqm, input.beds);
  const bedsRoom = safeDiv(input.beds, input.bedrooms);

  const score = scoreProperty({
    rentPerSqm: rentSqm,
    roomProductivity: roomProd,
    areaProductivity: areaProdMonthly,
    bedsPerRoom: bedsRoom,
    energyConsumption: energy.consumption,
  });

  return {
    energy,
    effectiveNightPrice: effPrice,
    pricePerBed: perBed,
    occupancyRate: occRate,
    monthlyRevenue: monthlyRev,
    minPriceAtFullOccupancy: minPrice,
    annualRevenue: annualRev,
    electricityAuto,
    electricityUsed,
    cleaningAuto,
    cleaningUsed,
    costLines,
    totalMonthlyCosts,
    monthlyProfit,
    annualProfit,
    rentPerSqm: rentSqm,
    marketDeviation: deviation,
    areaProductivityMonthly: areaProdMonthly,
    areaProductivityAnnual: areaProdAnnual,
    roomProductivity: roomProd,
    bedProductivity: bedProd,
    bedsPerRoom: bedsRoom,
    score,
  };
}
