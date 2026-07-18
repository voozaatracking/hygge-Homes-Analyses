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
  });

  it("rechnet ohne jegliche Reinigungskosten mit 0", () => {
    const derived = deriveListing(listingWithPrices("A", 1000), {
      occupancyRate: 0.5,
      changesPerWeek: 2,
      cleaningFallback: null,
    });
    expect(derived.cleaningUsed).toBeNull();
    expect(derived.netListedYear).toBe(52_000);
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
    // Bewusst keine Warnung mehr: Das Umsatzmodell ist derzeit ausgeblendet.
    expect(analysis.warnings).toHaveLength(0);
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

  it("berechnet auch negative Basiswerte ohne Absturz", () => {
    const derived = deriveListing(
      listingWithPrices("Teuer geputzt", 10, { cleaningCost: 100 }),
      { occupancyRate: 0.5, changesPerWeek: 2, cleaningFallback: null }
    );
    expect(derived.netListedYear).toBeLessThan(0);
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

describe("Preisniveau-Kennzahlen (aktuelle Auswertung)", () => {
  it("berechnet Ø Wochenpreis, Preisniveau pro Jahr und Preis pro Nacht", () => {
    const listing = emptyListing("Teiljahr");
    listing.weeklyPrices[0] = 700;
    listing.weeklyPrices[1] = 900;
    const derived = deriveListing(listing, {
      occupancyRate: null,
      changesPerWeek: 2,
      cleaningFallback: null,
    });
    expect(derived.avgWeeklyPrice).toBeCloseTo(800, 6);
    expect(derived.yearPriceLevel).toBe(1_600);
    expect(derived.pricePerNight).toBeCloseTo(800 / 7, 6);
  });

  it("liefert für ein leeres Inserat keine Preiskennzahlen", () => {
    const derived = deriveListing(emptyListing("Leer"), {
      occupancyRate: null,
      changesPerWeek: 2,
      cleaningFallback: null,
    });
    expect(derived.avgWeeklyPrice).toBeNull();
    expect(derived.yearPriceLevel).toBeNull();
    expect(derived.pricePerNight).toBeNull();
  });

  it("mittelt das Preisniveau nur über einbezogene Inserate", () => {
    const a = listingWithPrices("A", 1000);
    const b = listingWithPrices("B", 2000, { includeInAggregate: false });
    const analysis = deriveListingAnalysis(locationWith([a, b]));
    expect(analysis.aggregate.avgWeeklyPrice).toBeCloseTo(1000, 6);
    expect(analysis.aggregate.avgYearPriceLevel).toBeCloseTo(52_000, 6);
    expect(analysis.aggregate.avgPricePerNight).toBeCloseTo(1000 / 7, 6);
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
