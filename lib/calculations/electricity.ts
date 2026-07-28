import { MONTHS_PER_YEAR } from "@/lib/config/assumptions";
import { fmtEur, fmtNum } from "@/lib/format";

export interface ElectricityResult {
  monthlyKwh: number;
  annualKwh: number;
  annualCostNoSurcharge: number;
  annualCostWithSurcharge: number;
  monthlyCost: number;
  /** Vollständige, anzeigbare Herleitung. */
  lines: string[];
}

/**
 * Berechnet die Stromkosten transparent aus angenommenem Stromverbrauch
 * (kWh/qm pro Monat), Fläche, Strompreis und Aufschlag.
 *
 * Bewusst NICHT auf Basis des Energieausweis-Verbrauchs: Der Energieausweis
 * beschreibt den Heizenergiebedarf (Energieeffizienzklasse) und taugt nicht
 * als Grundlage für die Stromrechnung. Der Stromverbrauch ist eine eigene,
 * frei editierbare Annahme (Standard: 2,08 kWh/qm pro Monat).
 *
 * Gibt null zurück, wenn eine Eingabe fehlt oder ungültig (negativ) ist.
 */
export function calcElectricity(params: {
  consumptionKwhSqmMonth: number | null;
  areaSqm: number | null;
  pricePerKwh: number | null;
  surchargePct: number | null;
}): ElectricityResult | null {
  const { consumptionKwhSqmMonth, areaSqm, pricePerKwh, surchargePct } = params;
  if (
    consumptionKwhSqmMonth == null ||
    areaSqm == null ||
    pricePerKwh == null ||
    surchargePct == null
  ) {
    return null;
  }
  if (
    consumptionKwhSqmMonth < 0 ||
    areaSqm <= 0 ||
    pricePerKwh < 0 ||
    surchargePct < 0
  ) {
    return null;
  }

  const monthlyKwh = consumptionKwhSqmMonth * areaSqm;
  const annualKwh = monthlyKwh * MONTHS_PER_YEAR;
  const annualCostNoSurcharge = annualKwh * pricePerKwh;
  const annualCostWithSurcharge =
    annualCostNoSurcharge * (1 + surchargePct / 100);
  const monthlyCost = annualCostWithSurcharge / MONTHS_PER_YEAR;

  const lines = [
    `${fmtNum(consumptionKwhSqmMonth, 2)} kWh/qm pro Monat × ${fmtNum(areaSqm)} qm = ${fmtNum(monthlyKwh)} kWh Monatsverbrauch`,
    `${fmtNum(monthlyKwh)} kWh × ${MONTHS_PER_YEAR} Monate = ${fmtNum(annualKwh)} kWh Jahresverbrauch`,
    `${fmtNum(annualKwh)} kWh × ${fmtNum(pricePerKwh, 2)} €/kWh = ${fmtEur(annualCostNoSurcharge)} Stromkosten ohne Aufschlag`,
    `${fmtEur(annualCostNoSurcharge)} × ${fmtNum(1 + surchargePct / 100, 2)} = ${fmtEur(annualCostWithSurcharge)} Stromkosten inklusive ${fmtNum(surchargePct)} % Aufschlag`,
    `${fmtEur(annualCostWithSurcharge)} / ${MONTHS_PER_YEAR} = ${fmtEur(monthlyCost)} pro Monat`,
  ];

  return {
    monthlyKwh,
    annualKwh,
    annualCostNoSurcharge,
    annualCostWithSurcharge,
    monthlyCost,
    lines,
  };
}
