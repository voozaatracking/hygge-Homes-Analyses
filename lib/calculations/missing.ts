import type { PropertyInput } from "@/lib/types/analysis";
import type { DerivedProperty } from "@/lib/calculations/property-calculations";

/**
 * Hinweise für nicht berechenbare Kennzahlen, nach dem Muster der Kurtaxe
 * (derived.touristTax.note): Jede Kennzahl, die wegen fehlender Eingaben
 * nicht berechnet werden kann, nennt den fehlenden Wert. Nur Hinweise,
 * keine Pflichtfelder. Rein, ohne UI; die Rechenlogik bleibt unverändert.
 */
export interface MissingNotes {
  effectiveNightPrice: string | null;
  occupancyRate: string | null;
  monthlyRevenue: string | null;
  electricity: string | null;
  cleaning: string | null;
  totalMonthlyCosts: string | null;
  monthlyProfit: string | null;
  breakEven: string | null;
  payback: string | null;
  rentPerSqm: string | null;
  marketDeviation: string | null;
  areaProductivity: string | null;
  roomProductivity: string | null;
  bedProductivity: string | null;
  bedsPerRoom: string | null;
}

const isMissing = (v: number | null | undefined) => v == null || Number.isNaN(v);

/** "Nicht berechenbar: A fehlt." bzw. "A und B fehlen." */
export function formatMissing(names: string[], prefix = "Nicht berechenbar"): string | null {
  if (names.length === 0) return null;
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
  return `${prefix}: ${list} ${names.length > 1 ? "fehlen" : "fehlt"}.`;
}

function revenueInputs(input: PropertyInput): string[] {
  const missing: string[] = [];
  if (isMissing(input.pricing.nightPrice)) missing.push("Nachtpreis");
  if (input.pricing.mode === "perBed" && (isMissing(input.beds) || input.beds! <= 0)) {
    missing.push("Betten");
  }
  if (isMissing(input.pricing.rentedDaysPerMonth)) missing.push("vermietete Tage");
  return missing;
}

export function describeMissing(
  input: PropertyInput,
  derived: DerivedProperty
): MissingNotes {
  const price: string[] = [];
  if (isMissing(input.pricing.nightPrice)) price.push("Nachtpreis");
  if (input.pricing.mode === "perBed" && (isMissing(input.beds) || input.beds! <= 0)) {
    price.push("Betten");
  }
  const revenue = revenueInputs(input);

  const electricity: string[] = [];
  if (input.costs.useManualElectricity) {
    if (isMissing(input.costs.electricityManual)) electricity.push("Stromkosten (manuell)");
  } else {
    if (isMissing(input.electricityAssumptions.consumptionKwhSqmMonth)) electricity.push("Stromverbrauch");
    if (isMissing(input.areaSqm)) electricity.push("Gesamtfläche");
    if (isMissing(input.electricityAssumptions.pricePerKwh)) electricity.push("Strompreis");
    if (isMissing(input.electricityAssumptions.surchargePct)) electricity.push("Aufschlag");
  }

  const cleaning: string[] = [];
  if (input.costs.useManualCleaning) {
    if (isMissing(input.costs.cleaningManual)) cleaning.push("Reinigungskosten (manuell)");
  } else {
    if (isMissing(input.areaSqm)) cleaning.push("Gesamtfläche");
    if (isMissing(input.cleaningAssumptions.minutesPerSqm)) cleaning.push("Reinigungszeit");
    if (isMissing(input.cleaningAssumptions.hourlyWage)) cleaning.push("Stundenlohn");
    if (isMissing(input.cleaningAssumptions.changesPerMonth)) cleaning.push("Wechsel pro Monat");
  }

  const costsMissing = derived.totalMonthlyCosts == null;
  const profit: string[] = [...revenue];
  if (costsMissing) profit.push("mindestens eine Kostenangabe");

  let breakEven: string | null = null;
  if (derived.breakEvenNights == null) {
    const names: string[] = [...price];
    if (costsMissing) names.push("mindestens eine Kostenangabe");
    breakEven =
      names.length > 0
        ? formatMissing(names)
        : "Nicht berechenbar: Der Deckungsbeitrag pro Nacht ist nicht positiv (Provision und Kurtaxe übersteigen den Nachtpreis).";
  }

  let payback: string | null = null;
  if (derived.paybackMonths == null) {
    const names: string[] = [];
    if (isMissing(input.startInvestment) || input.startInvestment! <= 0) names.push("Startinvestition");
    if (derived.monthlyProfit == null) names.push(...profit);
    payback =
      names.length > 0
        ? formatMissing(Array.from(new Set(names)))
        : "Nicht berechenbar: Der Monatsgewinn ist nicht positiv.";
  }

  const rent: string[] = [];
  if (isMissing(input.costs.coldRent)) rent.push("Kaltmiete");
  if (isMissing(input.areaSqm) || input.areaSqm! <= 0) rent.push("Gesamtfläche");
  const market: string[] = [...rent];
  if (isMissing(input.marketRentPerSqm) || input.marketRentPerSqm! <= 0) market.push("Marktpreis (größer 0)");

  const area: string[] = [...revenue];
  if (isMissing(input.areaSqm) || input.areaSqm! <= 0) area.push("Gesamtfläche");
  const room: string[] = [];
  if (isMissing(input.areaSqm)) room.push("Gesamtfläche");
  if (isMissing(input.bedrooms) || input.bedrooms! <= 0) room.push("Schlafräume");
  const bed: string[] = [];
  if (isMissing(input.areaSqm)) bed.push("Gesamtfläche");
  if (isMissing(input.beds) || input.beds! <= 0) bed.push("Betten");
  const bedsRoom: string[] = [];
  if (isMissing(input.beds)) bedsRoom.push("Betten");
  if (isMissing(input.bedrooms) || input.bedrooms! <= 0) bedsRoom.push("Schlafräume");

  const only = (value: number | null, names: string[]) =>
    value == null ? formatMissing(names) : null;

  return {
    effectiveNightPrice: only(derived.effectiveNightPrice, price),
    occupancyRate: only(
      derived.occupancyRate,
      isMissing(input.pricing.rentedDaysPerMonth) ? ["vermietete Tage"] : []
    ),
    monthlyRevenue: only(derived.monthlyRevenue, revenue),
    electricity: derived.electricityUsed ? null : formatMissing(electricity),
    cleaning: derived.cleaningUsed ? null : formatMissing(cleaning),
    totalMonthlyCosts: costsMissing ? "Nicht berechenbar: Noch keine Kosten erfasst." : null,
    monthlyProfit: only(derived.monthlyProfit, Array.from(new Set(profit))),
    breakEven,
    payback,
    rentPerSqm: only(derived.rentPerSqm, rent),
    marketDeviation: only(derived.marketDeviation, Array.from(new Set(market))),
    areaProductivity: only(derived.areaProductivityMonthly, Array.from(new Set(area))),
    roomProductivity: only(derived.roomProductivity, room),
    bedProductivity: only(derived.bedProductivity, bed),
    bedsPerRoom: only(derived.bedsPerRoom, bedsRoom),
  };
}
