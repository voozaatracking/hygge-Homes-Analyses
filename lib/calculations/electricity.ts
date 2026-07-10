import { MONTHS_PER_YEAR } from "@/lib/config/assumptions";
import { fmtEur, fmtNum } from "@/lib/format";

export interface ElectricityResult {
  annualKwh: number;
  annualCostNoSurcharge: number;
  annualCostWithSurcharge: number;
  monthlyCost: number;
  /** Vollständige, anzeigbare Herleitung. */
  lines: string[];
}

/**
 * Berechnet die Stromkosten transparent aus Verbrauch, Fläche, Strompreis und Aufschlag.
 * Gibt null zurück, wenn eine Eingabe fehlt oder ungültig (negativ) ist.
 */
export function calcElectricity(params: {
  consumptionKwhSqmYear: number | null;
  areaSqm: number | null;
  pricePerKwh: number | null;
  surchargePct: number | null;
}): ElectricityResult | null {
  const { consumptionKwhSqmYear, areaSqm, pricePerKwh, surchargePct } = params;
  if (
    consumptionKwhSqmYear == null ||
    areaSqm == null ||
    pricePerKwh == null ||
    surchargePct == null
  ) {
    return null;
  }
  if (
    consumptionKwhSqmYear < 0 ||
    areaSqm <= 0 ||
    pricePerKwh < 0 ||
    surchargePct < 0
  ) {
    return null;
  }

  const annualKwh = consumptionKwhSqmYear * areaSqm;
  const annualCostNoSurcharge = annualKwh * pricePerKwh;
  const annualCostWithSurcharge =
    annualCostNoSurcharge * (1 + surchargePct / 100);
  const monthlyCost = annualCostWithSurcharge / MONTHS_PER_YEAR;

  const lines = [
    `${fmtNum(consumptionKwhSqmYear)} kWh/qm × ${fmtNum(areaSqm)} qm = ${fmtNum(annualKwh)} kWh Jahresverbrauch`,
    `${fmtNum(annualKwh)} kWh × ${fmtNum(pricePerKwh, 2)} €/kWh = ${fmtEur(annualCostNoSurcharge)} Stromkosten ohne Aufschlag`,
    `${fmtEur(annualCostNoSurcharge)} × ${fmtNum(1 + surchargePct / 100, 2)} = ${fmtEur(annualCostWithSurcharge)} Stromkosten inklusive ${fmtNum(surchargePct)} % Aufschlag`,
    `${fmtEur(annualCostWithSurcharge)} / ${MONTHS_PER_YEAR} = ${fmtEur(monthlyCost)} pro Monat`,
  ];

  return {
    annualKwh,
    annualCostNoSurcharge,
    annualCostWithSurcharge,
    monthlyCost,
    lines,
  };
}
