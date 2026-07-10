import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import { DAYS_PER_MONTH } from "@/lib/config/assumptions";

export type FieldErrors = Record<string, string>;

const isSet = (v: number | null): v is number =>
  v != null && !Number.isNaN(v);

/**
 * Validiert die Eingaben eines Objekts. Fehlende (leere) Werte sind kein Fehler,
 * ungültige Werte schon. Fehlende Pflichtwerte werden separat über die
 * Bewertungs- und Berechnungslogik als "unvollständig" behandelt.
 */
export function validateProperty(input: PropertyInput): FieldErrors {
  const errors: FieldErrors = {};

  if (isSet(input.areaSqm) && input.areaSqm <= 0) {
    errors.areaSqm = "Die Fläche muss größer als 0 sein.";
  }
  if (isSet(input.bedrooms) && input.bedrooms <= 0) {
    errors.bedrooms = "Die Anzahl der Schlafräume muss größer als 0 sein.";
  }
  if (isSet(input.beds) && input.beds <= 0) {
    errors.beds = "Die Anzahl der Betten muss größer als 0 sein.";
  }
  if (isSet(input.energy.consumption) && input.energy.consumption < 0) {
    errors.energyConsumption = "Der Energieverbrauch darf nicht negativ sein.";
  }
  if (isSet(input.pricing.nightPrice) && input.pricing.nightPrice < 0) {
    errors.nightPrice = "Der Nachtpreis darf nicht negativ sein.";
  }
  if (isSet(input.pricing.rentedDaysPerMonth)) {
    const d = input.pricing.rentedDaysPerMonth;
    if (d < 0 || d > DAYS_PER_MONTH) {
      errors.rentedDaysPerMonth = `Die vermieteten Tage müssen zwischen 0 und ${DAYS_PER_MONTH} liegen (Auslastung 0 % bis 100 %).`;
    }
  }

  const nonNegativeCosts: [keyof PropertyInput["costs"], string][] = [
    ["coldRent", "Kaltmiete"],
    ["internet", "Internet"],
    ["ancillary", "Sonstige Nebenkosten"],
    ["streaming", "Netflix / Streaming"],
    ["gez", "GEZ-Gebühr"],
    ["gema", "GEMA-Gebühr"],
    ["laundry", "Wäsche"],
    ["electricityManual", "Stromkosten (manuell)"],
    ["cleaningManual", "Reinigungskosten (manuell)"],
  ];
  for (const [key, label] of nonNegativeCosts) {
    const v = input.costs[key];
    if (typeof v === "number" && v < 0) {
      errors[key] = `${label} darf nicht negativ sein.`;
    }
  }
  input.costs.extras.forEach((extra) => {
    if (isSet(extra.amount) && extra.amount < 0) {
      errors[`extra-${extra.id}`] = "Kosten dürfen nicht negativ sein.";
    }
  });

  if (isSet(input.electricityAssumptions.pricePerKwh) && input.electricityAssumptions.pricePerKwh < 0) {
    errors.pricePerKwh = "Der Strompreis darf nicht negativ sein.";
  }
  if (isSet(input.electricityAssumptions.surchargePct) && input.electricityAssumptions.surchargePct < 0) {
    errors.surchargePct = "Der Aufschlag darf nicht negativ sein.";
  }
  if (isSet(input.cleaningAssumptions.minutesPerSqm) && input.cleaningAssumptions.minutesPerSqm <= 0) {
    errors.minutesPerSqm = "Die Reinigungszeit muss größer als 0 sein.";
  }
  if (isSet(input.cleaningAssumptions.hourlyWage) && input.cleaningAssumptions.hourlyWage < 0) {
    errors.hourlyWage = "Der Stundenlohn darf nicht negativ sein.";
  }
  if (isSet(input.cleaningAssumptions.changesPerMonth) && input.cleaningAssumptions.changesPerMonth < 0) {
    errors.changesPerMonth = "Die Anzahl der Reinigungen darf nicht negativ sein.";
  }
  if (isSet(input.marketRentPerSqm) && input.marketRentPerSqm <= 0) {
    errors.marketRentPerSqm =
      "Der Marktpreis muss größer als 0 sein, damit eine Abweichung berechnet werden kann.";
  }

  return errors;
}

export function validateLocation(input: LocationInput): FieldErrors {
  const errors: FieldErrors = {};

  if (isSet(input.occupancyPct) && (input.occupancyPct < 0 || input.occupancyPct > 100)) {
    errors.occupancyPct = "Die Auslastungsquote muss zwischen 0 % und 100 % liegen.";
  }
  if (
    isSet(input.rentedDaysPerMonth) &&
    (input.rentedDaysPerMonth < 0 || input.rentedDaysPerMonth > DAYS_PER_MONTH)
  ) {
    errors.rentedDaysPerMonth = `Die vermieteten Tage müssen zwischen 0 und ${DAYS_PER_MONTH} liegen.`;
  }
  const nonNegative: [keyof LocationInput, string][] = [
    ["avgAnnualRevenue", "Der durchschnittliche Jahresumsatz"],
    ["avgRevenuePerNight", "Der Umsatz pro vermieteter Nacht"],
    ["avgCleaningCost", "Die durchschnittlichen Reinigungskosten"],
    ["extraPersonCost", "Die Mehrkosten pro zusätzlicher Person"],
  ];
  for (const [key, label] of nonNegative) {
    const v = input[key];
    if (typeof v === "number" && v < 0) {
      errors[key] = `${label} darf nicht negativ sein.`;
    }
  }
  return errors;
}
