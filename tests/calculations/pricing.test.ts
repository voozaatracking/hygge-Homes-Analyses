import { describe, expect, it } from "vitest";
import { breakEvenNightPrice, ceilEuro, derivePricing } from "@/lib/calculations/pricing";
import { deriveProperty, type DeriveContext } from "@/lib/calculations/property-calculations";
import {
  PRICING_BASE_SURCHARGE_EUR,
  PRICING_MARKUP_PCT,
} from "@/lib/config/assumptions";
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

describe("Mindestpreis und Basispreis", () => {
  it("rundet Mindestpreis und Basispreis auf volle Euro auf, Basispreis aus dem ungerundeten Mindestpreis", () => {
    const p = base();
    const r = derivePricing(p, HQ);
    expect(r.referenceDays).toBe(18);
    const minRaw = r.breakEven.price! * (1 + PRICING_MARKUP_PCT / 100);
    expect(r.minPrice).toBe(Math.ceil(minRaw - 1e-9));
    expect(r.basePrice).toBe(Math.ceil(minRaw + PRICING_BASE_SURCHARGE_EUR - 1e-9));
    expect(Number.isInteger(r.minPrice!)).toBe(true);
    expect(Number.isInteger(r.basePrice!)).toBe(true);
    // Basispreis liegt mindestens 40 € über dem Mindestpreis minus Rundung.
    expect(r.basePrice! - r.minPrice!).toBeGreaterThanOrEqual(PRICING_BASE_SURCHARGE_EUR - 1);
    expect(r.basePrice! - r.minPrice!).toBeLessThanOrEqual(PRICING_BASE_SURCHARGE_EUR);
  });

  it("ceilEuro rundet auf und ignoriert Gleitkommarauschen", () => {
    expect(ceilEuro(99.01)).toBe(100);
    expect(ceilEuro(100)).toBe(100);
    expect(ceilEuro(100.0000000001)).toBe(100);
    expect(ceilEuro(0)).toBe(0);
  });

  it("ist für Kurtaxe in beiden Modi konsistent mit dem Break-even-Preis", () => {
    const euro = base();
    euro.costs.touristTaxPerPersonNight = 2;
    const rEuro = derivePricing(euro, HQ);
    expect(rEuro.minPrice).toBe(ceilEuro(rEuro.breakEven.price! * 1.1));

    const pct = base();
    pct.costs.touristTaxMode = "percentOfPrice";
    pct.costs.touristTaxPct = 5;
    const rPct = derivePricing(pct, HQ);
    expect(rPct.minPrice).toBe(ceilEuro(rPct.breakEven.price! * 1.1));
    expect(rPct.breakEven.price!).toBeGreaterThan(base().costs.coldRent! / 18 / 0.85);
  });

  it("gibt Hinweise statt NaN ohne Nächte, ohne Kosten oder bei 100 % Abgaben", () => {
    const p = base();
    p.pricing.rentedDaysPerMonth = null;
    let r = derivePricing(p, HQ);
    expect(r.minPrice).toBeNull();
    expect(r.basePrice).toBeNull();
    expect(r.breakEven.note).toBe("Nicht berechenbar: vermietete Tage fehlt.");

    p.pricing.rentedDaysPerMonth = 0;
    expect(derivePricing(p, HQ).breakEven.note).toMatch(/zwischen 1 und 30/);

    const noFixed = emptyProperty("nur Provision");
    noFixed.pricing.rentedDaysPerMonth = 10;
    r = derivePricing(noFixed, HQ);
    // Nur preisabhängige Kosten: Break-even-Preis 0, Mindestpreis 0, Basispreis 40.
    expect(r.breakEven.price).toBe(0);
    expect(r.minPrice).toBe(0);
    expect(r.basePrice).toBe(PRICING_BASE_SURCHARGE_EUR);

    const noCosts = emptyProperty("leer");
    noCosts.pricing.rentedDaysPerMonth = 10;
    noCosts.revenueAssumptions.platformCommissionPct = null;
    r = derivePricing(noCosts, HQ);
    expect(r.breakEven.price).toBeNull();
    expect(r.breakEven.note).toMatch(/Kosten/);

    const full = base();
    full.revenueAssumptions.platformCommissionPct = 100;
    r = derivePricing(full, HQ);
    expect(r.minPrice).toBeNull();
    expect(r.breakEven.note).toMatch(/100 %/);

    const perBed = base();
    perBed.pricing.mode = "perBed";
    perBed.beds = null;
    expect(derivePricing(perBed, HQ).breakEven.note).toBe("Nicht berechenbar: Betten fehlt.");
  });

  it("verändert die Kennzahlen des Objekts nicht", () => {
    const p = base();
    const before = JSON.stringify(deriveProperty(p, HQ));
    derivePricing(p, HQ);
    expect(JSON.stringify(deriveProperty(p, HQ))).toBe(before);
    expect(p.pricing.nightPrice).toBe(120);
  });
});
