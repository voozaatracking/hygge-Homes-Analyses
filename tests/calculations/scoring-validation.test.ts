import { describe, expect, it } from "vitest";
import { scoreProperty } from "@/lib/calculations/scoring";
import { stepLookup } from "@/lib/calculations/steps";
import {
  NORM_RAUMPRODUKTIVITAET,
  scoreLabel,
} from "@/lib/config/normalization-tables";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { validateProperty } from "@/lib/validation/rules";
import { emptyProperty, sortRows } from "@/lib/utils";

describe("Objektbewertung (Testfall 14)", () => {
  it("berechnet einen bekannten Beispielvektor als gewichtete Summe", () => {
    // Miete 10 €/qm -> 0,7; Raum 25 qm/Raum -> 1,0; Fläche 40 €/qm -> 0,6;
    // Betten/Raum 2 -> 1,0; Energie 120 kWh -> 0,5
    // 0,7*0,25 + 1,0*0,35 + 0,6*0,20 + 1,0*0,10 + 0,5*0,10 = 0,795
    const result = scoreProperty({
      rentPerSqm: 10,
      roomProductivity: 25,
      areaProductivity: 40,
      bedsPerRoom: 2,
      energyConsumption: 120,
    });
    expect(result.complete).toBe(true);
    expect(result.total).toBeCloseTo(0.795, 6);
    expect(result.label).toBe("moderat");
    const weightSum = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(weightSum).toBeCloseTo(1, 10);
    const contributionSum = result.factors.reduce(
      (s, f) => s + (f.contribution ?? 0),
      0
    );
    expect(contributionSum).toBeCloseTo(result.total!, 10);
  });

  it("ordnet die verbale Einordnung gemäß den Bändern zu", () => {
    expect(scoreLabel(0.39)).toBe("schlecht");
    expect(scoreLabel(0.4)).toBe("moderat");
    expect(scoreLabel(0.79)).toBe("moderat");
    expect(scoreLabel(0.8)).toBe("sehr gut");
    expect(scoreLabel(1)).toBe("sehr gut");
  });

  it("bildet die nicht monotone Raumproduktivität korrekt ab (steigend, Spitze bei 25, fallend)", () => {
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 15)).toBe(0);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 20)).toBe(0.5);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 24.9)).toBe(0.9);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 25)).toBe(1);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 30)).toBe(0.5);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 40)).toBe(0);
    expect(stepLookup(NORM_RAUMPRODUKTIVITAET, 120)).toBe(0);
  });
});

describe("Fehlende und negative Eingaben (Testfälle 15 und 16)", () => {
  it("zeigt bei fehlenden Pflichtwerten keine scheinbar vollständige Bewertung", () => {
    const result = scoreProperty({
      rentPerSqm: 10,
      roomProductivity: null,
      areaProductivity: 40,
      bedsPerRoom: 2,
      energyConsumption: null,
    });
    expect(result.complete).toBe(false);
    expect(result.total).toBeNull();
    expect(result.label).toBeNull();
    expect(result.missing).toContain("Raumproduktivität");
    expect(result.missing).toContain("Energieverbrauch");
  });

  it("liefert für ein leeres Objekt eine unvollständige Bewertung statt Ergebnissen", () => {
    const derived = deriveProperty(emptyProperty("Leer"));
    expect(derived.score.complete).toBe(false);
    expect(derived.monthlyRevenue).toBeNull();
    expect(derived.monthlyProfit).toBeNull();
  });

  it("lehnt negative Eingaben in der Validierung ab", () => {
    const p = emptyProperty("Negativ");
    p.areaSqm = -10;
    p.beds = 0;
    p.pricing.nightPrice = -5;
    p.pricing.rentedDaysPerMonth = 31;
    p.costs.coldRent = -1;
    p.electricityAssumptions.pricePerKwh = -0.1;
    const errors = validateProperty(p);
    expect(errors["areaSqm"]).toBeTruthy();
    expect(errors["beds"]).toBeTruthy();
    expect(errors["nightPrice"]).toBeTruthy();
    expect(errors["rentedDaysPerMonth"]).toBeTruthy();
    expect(errors["coldRent"]).toBeTruthy();
    expect(errors["pricePerKwh"]).toBeTruthy();
  });
});

describe("Sortierung und Vergleich mehrerer Objekte (Testfall 20)", () => {
  it("sortiert nach Kennzahlen in beide Richtungen, null-Werte immer am Ende", () => {
    const rows = [
      { name: "A", profit: 500 as number | null },
      { name: "B", profit: null as number | null },
      { name: "C", profit: 1200 as number | null },
      { name: "D", profit: -100 as number | null },
    ];
    const desc = sortRows(rows, (r) => r.profit, "desc").map((r) => r.name);
    expect(desc).toEqual(["C", "A", "D", "B"]);
    const asc = sortRows(rows, (r) => r.profit, "asc").map((r) => r.name);
    expect(asc).toEqual(["D", "A", "C", "B"]);
  });

  it("vergleicht mehrere abgeleitete Objekte nach Bewertung", () => {
    const good = emptyProperty("Gut");
    good.areaSqm = 75;
    good.bedrooms = 3;
    good.beds = 6;
    good.energy.consumption = 40;
    good.pricing = { mode: "perUnit", nightPrice: 150, rentedDaysPerMonth: 25 };
    good.costs.coldRent = 600;

    const weak = emptyProperty("Schwach");
    weak.areaSqm = 80;
    weak.bedrooms = 2;
    weak.beds = 2;
    weak.energy.consumption = 200;
    weak.pricing = { mode: "perUnit", nightPrice: 60, rentedDaysPerMonth: 10 };
    weak.costs.coldRent = 1400;

    const rows = [weak, good].map((input) => ({
      input,
      derived: deriveProperty(input),
    }));
    const sorted = sortRows(rows, (r) => r.derived.score.total, "desc");
    expect(sorted[0].input.name).toBe("Gut");
    expect(sorted[0].derived.score.total).toBeGreaterThan(
      sorted[1].derived.score.total ?? 0
    );
  });
});
