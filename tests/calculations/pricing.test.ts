import { describe, expect, it } from "vitest";
import { breakEvenNightPrice, derivePricing } from "@/lib/calculations/pricing";
import { deriveProperty, type DeriveContext } from "@/lib/calculations/property-calculations";
import { PRICING_DEFAULTS } from "@/lib/config/assumptions";
import { emptyProperty } from "@/lib/utils";

const HQ: DeriveContext = { hq: { lat: 53.2464, lng: 10.4115 }, hqAddress: "Lüneburg" };

function base() {
  const p = emptyProperty("Objekt");
  p.pricing.nightPrice = 120;
  p.pricing.rentedDaysPerMonth = 18;
  p.areaSqm = 60;
  p.beds = 4;
  p.costs.coldRent = 900;
  p.costs.internet = 30;
  return p;
}

/** Gegenprobe: Mit dem Break-even-Preis ist der Monatsgewinn 0. */
function checkZeroProfit(p: ReturnType<typeof base>, days: number, context = HQ) {
  const be = breakEvenNightPrice(p, context, days);
  expect(be.note).toBeNull();
  expect(be.price).not.toBeNull();
  const clone = structuredClone(p);
  clone.pricing.nightPrice = be.price!;
  clone.pricing.rentedDaysPerMonth = days;
  expect(deriveProperty(clone, context).monthlyProfit).toBeCloseTo(0, 6);
  return be.price!;
}

describe("Break-even-Nachtpreis (Gegenprobe Gewinn = 0)", () => {
  it("Kurtaxe in Euro pro Person und Nacht, geplante und volle Auslastung", () => {
    const p = base();
    p.costs.touristTaxPerPersonNight = 2.5;
    const planned = checkZeroProfit(p, 18);
    const full = checkZeroProfit(p, 30);
    expect(full).toBeLessThan(planned);
  });

  it("Kurtaxe in Prozent vom Preis (preisabhängig) bleibt korrekt berücksichtigt", () => {
    const p = base();
    p.costs.touristTaxMode = "percentOfPrice";
    p.costs.touristTaxPct = 5;
    const withTax = checkZeroProfit(p, 18);
    p.costs.touristTaxPct = 0;
    const without = checkZeroProfit(p, 18);
    // Preisabhängige Abgabe erhöht den Break-even-Preis um 1/(1-c-t)-Faktor.
    expect(withTax).toBeGreaterThan(without);
    expect(withTax).toBeCloseTo(without * (1 - 0.15) / (1 - 0.15 - 0.05), 6);
  });

  it("mit und ohne Fahrtkosten (Fixkosten)", () => {
    const p = base();
    p.address = { text: "Hamburg", lat: 53.55, lng: 9.99 };
    const without = checkZeroProfit(p, 18);
    p.travel.enabled = true;
    p.travel.costMode = "perTrip";
    p.travel.pricePerTrip = 40;
    p.travel.tripsPerMonth = 4;
    const withTravel = checkZeroProfit(p, 18);
    // 160 € Fixkosten mehr, verteilt auf 18 Nächte nach Provision (15 %).
    expect(withTravel - without).toBeCloseTo(160 / 18 / 0.85, 6);
    checkZeroProfit(p, 30);
  });

  it("Preis pro Bett: Ergebnis in der Einheit der Preiseingabe", () => {
    const p = base();
    p.pricing.mode = "perBed";
    p.pricing.nightPrice = 30;
    const perBed = checkZeroProfit(p, 18);
    p.pricing.mode = "perUnit";
    const perUnit = checkZeroProfit(p, 18);
    expect(perBed * 4).toBeCloseTo(perUnit, 6);
  });
});

describe("Pricing-Tool-Felder beeinflussen die Berechnung nicht", () => {
  it("liefert identische Kennzahlen mit und ohne Pricing-Tool-Werte", () => {
    const p = base();
    const before = deriveProperty(p, HQ);
    p.pricingTool = {
      referenceDays: 25,
      markupPct: 30,
      ownMinPrice: 50,
      basePrice: 99,
      minStayWeekday: 2,
      minStayWeekend: 3,
      gapMaxNights: 4,
      gapMinStay: 2,
      lastMinuteDays: 1,
      lastMinuteMinStay: 1,
    };
    const after = deriveProperty(p, HQ);
    expect(after.monthlyRevenue).toBe(before.monthlyRevenue);
    expect(after.totalMonthlyCosts).toBe(before.totalMonthlyCosts);
    expect(after.monthlyProfit).toBe(before.monthlyProfit);
    expect(after.breakEvenNights).toBe(before.breakEvenNights);
    expect(after.score).toEqual(before.score);
  });
});

describe("Mindestpreis", () => {
  it("ist Break-even-Preis × (1 + Aufschlag), Standard 10 %, mit beiden Bezugswerten", () => {
    const p = base();
    const r = derivePricing(p, HQ);
    expect(r.markupPct).toBe(PRICING_DEFAULTS.markupPct);
    expect(r.referenceDays).toBe(18);
    expect(r.minPricePlanned).toBeCloseTo(r.breakEvenPlanned.price! * 1.1, 9);
    expect(r.minPriceFull).toBeCloseTo(r.breakEvenFull.price! * 1.1, 9);
    const custom = derivePricing(p, HQ, { markupPct: 25, referenceDays: 24 });
    expect(custom.referenceDays).toBe(24);
    expect(custom.minPricePlanned).toBeCloseTo(custom.breakEvenPlanned.price! * 1.25, 9);
  });

  it("gibt Hinweise statt NaN bei fehlenden Eingaben, Division durch 0 und 100 % Abgaben", () => {
    const p = base();
    p.pricing.rentedDaysPerMonth = null;
    let r = derivePricing(p, HQ);
    expect(r.minPricePlanned).toBeNull();
    expect(r.breakEvenPlanned.note).toBe("Nicht berechenbar: vermietete Tage fehlt.");
    // Volle Auslastung bleibt berechenbar.
    expect(r.minPriceFull).not.toBeNull();

    r = derivePricing(p, HQ, { referenceDays: 0 });
    expect(r.breakEvenPlanned.note).toMatch(/zwischen 1 und 30/);

    const noFixed = emptyProperty("nur Provision");
    noFixed.pricing.rentedDaysPerMonth = 10;
    r = derivePricing(noFixed, HQ);
    // Nur preisabhängige Kosten (Provision): Break-even-Preis ist 0, kein Fehler.
    expect(r.breakEvenPlanned.price).toBe(0);
    expect(r.minPricePlanned).toBe(0);

    const noCosts = emptyProperty("leer");
    noCosts.pricing.rentedDaysPerMonth = 10;
    noCosts.revenueAssumptions.platformCommissionPct = null;
    r = derivePricing(noCosts, HQ);
    // Ohne jede Kostenangabe ist kein Gewinn ableitbar: Hinweis statt 0.
    expect(r.breakEvenPlanned.price).toBeNull();
    expect(r.breakEvenPlanned.note).toMatch(/Kosten/);

    const full = base();
    full.revenueAssumptions.platformCommissionPct = 100;
    r = derivePricing(full, HQ);
    expect(r.breakEvenPlanned.price).toBeNull();
    expect(r.breakEvenPlanned.note).toMatch(/100 %/);
    expect(Number.isNaN(r.minPricePlanned as number)).toBe(false);

    const perBed = base();
    perBed.pricing.mode = "perBed";
    perBed.beds = null;
    expect(derivePricing(perBed, HQ).breakEvenPlanned.note).toBe("Nicht berechenbar: Betten fehlt.");
  });
});
