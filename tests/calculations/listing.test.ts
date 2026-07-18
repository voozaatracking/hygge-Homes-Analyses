import { describe, expect, it } from "vitest";
import type { ListingInput, LocationInput } from "@/lib/types/analysis";
import {
  deriveListing,
  deriveListingAnalysis,
} from "@/lib/calculations/listing-calculations";
import {
  emptyListing,
  emptyLocation,
  fillWeeklyPricesRight,
} from "@/lib/utils";

function listingWithPrices(
  name: string,
  price: number,
  overrides: Partial<ListingInput> = {}
): ListingInput {
  const listing = emptyListing(name);
  listing.weeklyPrices = listing.weeklyPrices.map(() => price);
  return { ...listing, ...overrides };
}

function locationWith(
  listings: ListingInput[],
  overrides: Partial<LocationInput> = {}
): LocationInput {
  const location = emptyLocation("Teststadt");
  location.occupancyPct = 50;
  location.changesPerWeek = 2;
  location.listings = listings;
  return { ...location, ...overrides };
}

describe("KW-Modell: Excel-Äquivalenz", () => {
  it("rechnet Umsatz pro Jahr wie die Excel: (Summe − Reinigung × 104) × Quote", () => {
    const analysis = deriveListingAnalysis(
      locationWith([listingWithPrices("A", 1000, { cleaningCost: 100 })])
    );
    const derived = analysis.rows[0].derived;
    // Summe = 52 × 1000 = 52.000; Reinigung/Jahr = 100 × 52 × 2 = 10.400
    expect(derived.weeklySum).toBe(52_000);
    expect(derived.cleaningPerYear).toBe(10_400);
    expect(derived.netListedYear).toBe(41_600);
    expect(derived.annualRevenue).toBeCloseTo(20_800, 6);
    expect(derived.monthlyRevenue).toBeCloseTo(20_800 / 12, 6);
    // Umsatz pro Nacht = Basis / 364, unabhängig von der Quote.
    expect(derived.revenuePerNight).toBeCloseTo(41_600 / 364, 6);
  });

  it("respektiert eine geänderte Annahme für Gästewechsel pro Woche", () => {
    const analysis = deriveListingAnalysis(
      locationWith([listingWithPrices("A", 1000, { cleaningCost: 100 })], {
        changesPerWeek: 1,
      })
    );
    expect(analysis.changesPerWeek).toBe(1);
    expect(analysis.rows[0].derived.cleaningPerYear).toBe(5_200);
  });

  it("fällt bei ungültigem Wechselwert auf den Standard 2 zurück", () => {
    const analysis = deriveListingAnalysis(
      locationWith([listingWithPrices("A", 1000)], { changesPerWeek: null })
    );
    expect(analysis.changesPerWeek).toBe(2);
  });

  it("leitet vermietete Tage pro Monat aus der Quote ab (Quote × 30)", () => {
    const analysis = deriveListingAnalysis(locationWith([]));
    expect(analysis.rentedDaysPerMonth).toBeCloseTo(15, 6);
  });
});

describe("KW-Modell: Reinigungskosten-Fallback", () => {
  it("verwendet den Durchschnitt der angegebenen Werte, gekennzeichnet als abgeleitet", () => {
    const withCost = listingWithPrices("A", 1000, { cleaningCost: 100 });
    const withOtherCost = listingWithPrices("B", 1000, { cleaningCost: 200 });
    const withoutCost = listingWithPrices("C", 1000);
    const analysis = deriveListingAnalysis(
      locationWith([withCost, withOtherCost, withoutCost])
    );

    const derivedC = analysis.rows[2].derived;
    expect(derivedC.cleaningUsed).toEqual({ amount: 150, source: "derived" });
    expect(analysis.rows[0].derived.cleaningUsed).toEqual({
      amount: 100,
      source: "manual",
    });
    expect(
      analysis.warnings.some((w) => w.includes("Durchschnitt"))
    ).toBe(true);
  });

  it("rechnet ohne jegliche Reinigungskosten mit 0 und warnt", () => {
    const derived = deriveListing(listingWithPrices("A", 1000), {
      occupancyRate: 0.5,
      changesPerWeek: 2,
      cleaningFallback: null,
    });
    expect(derived.cleaningUsed).toBeNull();
    expect(derived.netListedYear).toBe(52_000);
    expect(
      derived.warnings.some((w) => w.includes("ohne Reinigungskosten"))
    ).toBe(true);
  });
});

describe("KW-Modell: fehlende und unvollständige Eingaben", () => {
  it("liefert ohne Auslastungsquote keine Jahres- und Monatsumsätze, aber Umsatz pro Nacht", () => {
    const analysis = deriveListingAnalysis(
      locationWith([listingWithPrices("A", 1000, { cleaningCost: 100 })], {
        occupancyPct: null,
      })
    );
    const derived = analysis.rows[0].derived;
    expect(derived.annualRevenue).toBeNull();
    expect(derived.monthlyRevenue).toBeNull();
    expect(derived.revenuePerNight).toBeCloseTo(41_600 / 364, 6);
    expect(
      analysis.warnings.some((w) => w.includes("Auslastungsquote"))
    ).toBe(true);
  });

  it("zählt fehlende Kalenderwochen als 0 und warnt über die Lücken", () => {
    const listing = emptyListing("Teilweise");
    listing.weeklyPrices[0] = 700;
    listing.weeklyPrices[1] = 700;
    const derived = deriveListing(listing, {
      occupancyRate: 1,
      changesPerWeek: 2,
      cleaningFallback: null,
    });
    expect(derived.filledWeeks).toBe(2);
    expect(derived.weeklySum).toBe(1_400);
    expect(derived.warnings.some((w) => w.includes("2 von 52"))).toBe(true);
  });

  it("liefert für ein komplett leeres Inserat keine Kennzahlen", () => {
    const derived = deriveListing(emptyListing("Leer"), {
      occupancyRate: 0.5,
      changesPerWeek: 2,
      cleaningFallback: 100,
    });
    expect(derived.weeklySum).toBeNull();
    expect(derived.annualRevenue).toBeNull();
    expect(derived.revenuePerNight).toBeNull();
  });

  it("warnt, wenn die Reinigungskosten die Wochenpreise übersteigen", () => {
    const derived = deriveListing(
      listingWithPrices("Teuer geputzt", 10, { cleaningCost: 100 }),
      { occupancyRate: 0.5, changesPerWeek: 2, cleaningFallback: null }
    );
    expect(derived.netListedYear).toBeLessThan(0);
    expect(derived.warnings.some((w) => w.includes("übersteigen"))).toBe(true);
  });
});

describe("KW-Modell: Durchschnitt und Ein-/Ausschluss", () => {
  it("bezieht nur markierte Inserate in den Durchschnitt ein", () => {
    const a = listingWithPrices("A", 1000, { cleaningCost: 0 });
    const b = listingWithPrices("B", 2000, {
      cleaningCost: 0,
      includeInAggregate: false,
    });
    const analysis = deriveListingAnalysis(locationWith([a, b]));
    // Nur A zählt: 52.000 × 0,5 = 26.000
    expect(analysis.aggregate.count).toBe(1);
    expect(analysis.aggregate.avgAnnualRevenue).toBeCloseTo(26_000, 6);
    // Die ausgeschlossene Zeile wird trotzdem einzeln berechnet.
    expect(analysis.rows[1].derived.annualRevenue).toBeCloseTo(52_000, 6);
  });
});

describe("Auffüllen der Kalenderwochen", () => {
  it("füllt Lücken mit dem letzten davor eingetragenen Preis", () => {
    const prices: (number | null)[] = [null, 100, null, null, 200, null];
    expect(fillWeeklyPricesRight(prices)).toEqual([
      null,
      100,
      100,
      100,
      200,
      200,
    ]);
  });
});
