import { describe, expect, it } from "vitest";
import { describeMissing, formatMissing } from "@/lib/calculations/missing";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";
import { sampleProperties } from "@/lib/sample-data";

const notes = (mutate?: (p: ReturnType<typeof emptyProperty>) => void) => {
  const p = emptyProperty("Test");
  mutate?.(p);
  return describeMissing(p, deriveProperty(p));
};

describe("Hinweise für fehlende Eingaben", () => {
  it("formatiert einen oder mehrere fehlende Werte", () => {
    expect(formatMissing([])).toBeNull();
    expect(formatMissing(["Nachtpreis"])).toBe("Nicht berechenbar: Nachtpreis fehlt.");
    expect(formatMissing(["Nachtpreis", "vermietete Tage"])).toBe(
      "Nicht berechenbar: Nachtpreis und vermietete Tage fehlen."
    );
    expect(formatMissing(["A", "B", "C"])).toBe("Nicht berechenbar: A, B und C fehlen.");
  });

  it("nennt bei einem leeren Objekt die fehlenden Eingaben jeder Kennzahl", () => {
    const n = notes();
    expect(n.effectiveNightPrice).toBe("Nicht berechenbar: Nachtpreis fehlt.");
    expect(n.occupancyRate).toBe("Nicht berechenbar: vermietete Tage fehlt.");
    expect(n.monthlyRevenue).toBe("Nicht berechenbar: Nachtpreis und vermietete Tage fehlen.");
    expect(n.electricity).toBe("Nicht berechenbar: Gesamtfläche fehlt.");
    expect(n.cleaning).toBe("Nicht berechenbar: Gesamtfläche fehlt.");
    expect(n.totalMonthlyCosts).toBe("Nicht berechenbar: Noch keine Kosten erfasst.");
    expect(n.monthlyProfit).toBe(
      "Nicht berechenbar: Nachtpreis, vermietete Tage und mindestens eine Kostenangabe fehlen."
    );
    expect(n.breakEven).toBe("Nicht berechenbar: Nachtpreis und mindestens eine Kostenangabe fehlen.");
    expect(n.payback).toContain("Startinvestition");
    expect(n.rentPerSqm).toBe("Nicht berechenbar: Kaltmiete und Gesamtfläche fehlen.");
    expect(n.marketDeviation).toBe(
      "Nicht berechenbar: Kaltmiete, Gesamtfläche und Marktpreis (größer 0) fehlen."
    );
    expect(n.roomProductivity).toBe("Nicht berechenbar: Gesamtfläche und Schlafräume fehlen.");
    expect(n.bedProductivity).toBe("Nicht berechenbar: Gesamtfläche und Betten fehlen.");
    expect(n.bedsPerRoom).toBe("Nicht berechenbar: Betten und Schlafräume fehlen.");
  });

  it("berücksichtigt Preis pro Bett und manuelle Kosten", () => {
    const n = notes((p) => {
      p.pricing.mode = "perBed";
      p.pricing.nightPrice = 30;
      p.costs.useManualElectricity = true;
      p.costs.useManualCleaning = true;
    });
    expect(n.effectiveNightPrice).toBe("Nicht berechenbar: Betten fehlt.");
    expect(n.electricity).toBe("Nicht berechenbar: Stromkosten (manuell) fehlt.");
    expect(n.cleaning).toBe("Nicht berechenbar: Reinigungskosten (manuell) fehlt.");
  });

  it("erklärt nicht positive Deckungsbeiträge und Gewinne statt fehlender Eingaben", () => {
    const n = notes((p) => {
      p.pricing.nightPrice = 100;
      p.pricing.rentedDaysPerMonth = 20;
      p.costs.coldRent = 5000;
      p.revenueAssumptions.platformCommissionPct = 100;
      p.startInvestment = 10_000;
    });
    expect(n.breakEven).toMatch(/Deckungsbeitrag pro Nacht ist nicht positiv/);
    expect(n.payback).toBe("Nicht berechenbar: Der Monatsgewinn ist nicht positiv.");
  });

  it("liefert für ein vollständiges Objekt keine Hinweise", () => {
    const p = sampleProperties()[0];
    p.startInvestment = 10_000;
    const n = describeMissing(p, deriveProperty(p));
    for (const [key, value] of Object.entries(n)) {
      expect(value, key).toBeNull();
    }
  });
});
