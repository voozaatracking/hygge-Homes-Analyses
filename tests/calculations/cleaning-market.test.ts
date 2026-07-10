import { describe, expect, it } from "vitest";
import { calcCleaning } from "@/lib/calculations/cleaning";
import {
  deriveProperty,
  marketDeviation,
  rentPerSqm,
  safeDiv,
} from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";

describe("Reinigungskosten (Testfälle 10 und 11)", () => {
  it("berechnet das dokumentierte Standardbeispiel 65 qm nach", () => {
    const result = calcCleaning({
      areaSqm: 65,
      minutesPerSqm: 2,
      hourlyWage: 22,
      changesPerMonth: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.minutesPerChange).toBe(130);
    expect(result!.hoursPerChange).toBeCloseTo(130 / 60, 10);
    expect(result!.costPerCleaning).toBeCloseTo(47.6667, 3);
    expect(result!.monthlyCost).toBeCloseTo(190.6667, 3);
    expect(result!.lines.length).toBeGreaterThan(0);
  });

  it("rechnet mit benutzerdefinierten Annahmen", () => {
    const result = calcCleaning({
      areaSqm: 50,
      minutesPerSqm: 3,
      hourlyWage: 30,
      changesPerMonth: 2,
    });
    expect(result!.minutesPerChange).toBe(150);
    expect(result!.costPerCleaning).toBeCloseTo(75, 10);
    expect(result!.monthlyCost).toBeCloseTo(150, 10);
  });

  it("liefert null bei ungültigen Annahmen", () => {
    expect(
      calcCleaning({
        areaSqm: 65,
        minutesPerSqm: 0,
        hourlyWage: 22,
        changesPerMonth: 4,
      })
    ).toBeNull();
    expect(
      calcCleaning({
        areaSqm: null,
        minutesPerSqm: 2,
        hourlyWage: 22,
        changesPerMonth: 4,
      })
    ).toBeNull();
  });

  it("verwendet manuelle Reinigungskosten nur bei aktiviertem Override", () => {
    const p = emptyProperty("Test");
    p.areaSqm = 65;
    p.costs.useManualCleaning = true;
    p.costs.cleaningManual = 120;
    const derived = deriveProperty(p);
    expect(derived.cleaningUsed!.source).toBe("manual");
    expect(derived.cleaningUsed!.amount).toBe(120);
  });
});

describe("Marktpreis (Testfälle 12 und 13)", () => {
  it("berechnet die relative Abweichung zum Markt-Mietpreis", () => {
    expect(marketDeviation(12, 10)).toBeCloseTo(0.2, 10);
    expect(marketDeviation(8, 10)).toBeCloseTo(-0.2, 10);
  });

  it("verhindert Division durch null und liefert stattdessen null", () => {
    expect(marketDeviation(12, 0)).toBeNull();
    expect(marketDeviation(12, null)).toBeNull();
    expect(rentPerSqm(700, 0)).toBeNull();
    expect(rentPerSqm(700, null)).toBeNull();
    expect(safeDiv(10, 0)).toBeNull();
    expect(safeDiv(null, 5)).toBeNull();
  });

  it("berechnet Miete pro qm aus Kaltmiete und Fläche", () => {
    expect(rentPerSqm(715, 65)).toBeCloseTo(11, 10);
  });
});
