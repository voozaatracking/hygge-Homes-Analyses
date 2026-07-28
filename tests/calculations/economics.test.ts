import { describe, expect, it } from "vitest";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { deriveScenarios } from "@/lib/calculations/scenarios";
import { emptyProperty } from "@/lib/utils";

function baseProperty() {
  const p = emptyProperty("Testobjekt");
  p.pricing.nightPrice = 100;
  p.pricing.rentedDaysPerMonth = 20;
  return p;
}

describe("Plattformprovision", () => {
  it("zieht die Standardprovision von 15 % als Kostenzeile vom Umsatz ab", () => {
    const p = baseProperty();
    const d = deriveProperty(p);
    expect(d.monthlyRevenue).toBe(2000);
    const line = d.costLines.find((l) =>
      l.label.startsWith("Plattformprovision")
    );
    expect(line).toBeDefined();
    expect(line!.amount).toBeCloseTo(300, 6);
    expect(line!.source).toBe("derived");
    expect(d.monthlyProfit).toBeCloseTo(1700, 6);
  });

  it("erzeugt bei 0 % eine Nullzeile und ohne Umsatz keine Zeile", () => {
    const zero = baseProperty();
    zero.revenueAssumptions.platformCommissionPct = 0;
    const dZero = deriveProperty(zero);
    const lineZero = dZero.costLines.find((l) =>
      l.label.startsWith("Plattformprovision")
    );
    expect(lineZero!.amount).toBe(0);

    const noRevenue = emptyProperty("Ohne Umsatz");
    const dNo = deriveProperty(noRevenue);
    expect(
      dNo.costLines.find((l) => l.label.startsWith("Plattformprovision"))
    ).toBeUndefined();
  });
});

describe("Kurtaxe / Tourismusabgabe", () => {
  it("berechnet Betrag × Betten × vermietete Nächte, nur wenn ausgefüllt", () => {
    const p = baseProperty();
    p.beds = 4;
    p.costs.touristTaxPerPersonNight = 3;
    const d = deriveProperty(p);
    const line = d.costLines.find((l) => l.label.startsWith("Kurtaxe"));
    expect(line).toBeDefined();
    expect(line!.amount).toBeCloseTo(3 * 4 * 20, 6);

    const without = baseProperty();
    without.beds = 4;
    const dWithout = deriveProperty(without);
    expect(
      dWithout.costLines.find((l) => l.label.startsWith("Kurtaxe"))
    ).toBeUndefined();
  });
});

describe("Break-even-Auslastung", () => {
  it("teilt Fixkosten durch den Deckungsbeitrag pro Nacht (nach Provision)", () => {
    const p = baseProperty();
    p.costs.coldRent = 1000;
    const d = deriveProperty(p);
    // Fixkosten 1000, Deckungsbeitrag = 100 × (1 − 0,15) = 85
    expect(d.fixedMonthlyCosts).toBeCloseTo(1000, 6);
    expect(d.breakEvenNights).toBeCloseTo(1000 / 85, 6);
    expect(d.breakEvenOccupancyPct).toBeCloseTo(((1000 / 85) / 30) * 100, 6);
  });

  it("zieht die Kurtaxe pro Nacht vom Deckungsbeitrag ab", () => {
    const p = baseProperty();
    p.costs.coldRent = 1000;
    p.beds = 4;
    p.costs.touristTaxPerPersonNight = 3;
    const d = deriveProperty(p);
    // Deckungsbeitrag = 85 − 3 × 4 = 73
    expect(d.breakEvenNights).toBeCloseTo(1000 / 73, 6);
  });

  it("liefert null bei fehlendem Deckungsbeitrag", () => {
    const p = baseProperty();
    p.costs.coldRent = 1000;
    p.revenueAssumptions.platformCommissionPct = 100;
    const d = deriveProperty(p);
    expect(d.breakEvenNights).toBeNull();
  });
});

describe("Amortisation", () => {
  it("teilt die Startinvestition durch den Monatsgewinn", () => {
    const p = baseProperty();
    p.startInvestment = 8500;
    const d = deriveProperty(p);
    // Gewinn = 2000 − 300 Provision = 1700
    expect(d.paybackMonths).toBeCloseTo(5, 6);
  });

  it("liefert null ohne Investition oder bei negativem Gewinn", () => {
    const noInvest = baseProperty();
    expect(deriveProperty(noInvest).paybackMonths).toBeNull();

    const loss = baseProperty();
    loss.startInvestment = 8500;
    loss.costs.coldRent = 5000;
    expect(deriveProperty(loss).paybackMonths).toBeNull();
  });
});

describe("Szenarien", () => {
  it("skaliert Auslastung und Preis, Provision skaliert automatisch mit", () => {
    const p = baseProperty();
    const scenarios = deriveScenarios(p);
    expect(scenarios).not.toBeNull();
    const [pess, base, opt] = scenarios!;

    expect(base.monthlyRevenue).toBe(2000);
    expect(base.monthlyProfit).toBeCloseTo(1700, 6);

    // Pessimistisch: 20 × 0,8 = 16 Nächte, 100 × 0,9 = 90 € → 1440 € Umsatz
    expect(pess.rentedDaysPerMonth).toBeCloseTo(16, 6);
    expect(pess.monthlyRevenue).toBeCloseTo(1440, 6);
    expect(pess.monthlyProfit).toBeCloseTo(1440 * 0.85, 6);

    // Optimistisch: 24 Nächte, 110 € → 2640 € Umsatz
    expect(opt.monthlyRevenue).toBeCloseTo(2640, 6);
  });

  it("begrenzt vermietete Nächte auf 30 und liefert null ohne Eingaben", () => {
    const p = baseProperty();
    p.pricing.rentedDaysPerMonth = 28;
    const scenarios = deriveScenarios(p);
    const opt = scenarios!.find((s) => s.key === "optimistic")!;
    expect(opt.rentedDaysPerMonth).toBe(30);

    const empty = emptyProperty("Leer");
    expect(deriveScenarios(empty)).toBeNull();
  });
});
