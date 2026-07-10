import { describe, expect, it } from "vitest";
import {
  annualRevenue,
  effectiveNightPrice,
  minPriceAtFullOccupancy,
  monthlyRevenue,
  occupancyRate,
  pricePerBed,
} from "@/lib/calculations/property-calculations";

describe("Nachtpreis (Testfälle 1 und 2)", () => {
  it("verwendet bei 'Nachtpreis für die gesamte Unterkunft' den eingegebenen Preis", () => {
    expect(
      effectiveNightPrice({ mode: "perUnit", nightPrice: 120, beds: 4 })
    ).toBe(120);
  });

  it("rechnet bei 'Nachtpreis pro Bett' mit Preis pro Bett mal Anzahl Betten", () => {
    expect(
      effectiveNightPrice({ mode: "perBed", nightPrice: 45, beds: 4 })
    ).toBe(180);
  });

  it("liefert den Nachtpreis pro Bett als Unterkunftspreis geteilt durch Betten", () => {
    expect(pricePerBed(180, 4)).toBe(45);
    expect(pricePerBed(180, null)).toBeNull();
    expect(pricePerBed(180, 0)).toBeNull();
  });

  it("liefert null bei fehlendem Preis oder fehlenden Betten im Pro-Bett-Modus", () => {
    expect(
      effectiveNightPrice({ mode: "perBed", nightPrice: 45, beds: null })
    ).toBeNull();
    expect(
      effectiveNightPrice({ mode: "perUnit", nightPrice: null, beds: 4 })
    ).toBeNull();
    expect(
      effectiveNightPrice({ mode: "perUnit", nightPrice: -1, beds: 4 })
    ).toBeNull();
  });
});

describe("Auslastungsquote (Testfall 3)", () => {
  it("berechnet vermietete Tage geteilt durch 30", () => {
    expect(occupancyRate(15)).toBeCloseTo(0.5, 10);
    expect(occupancyRate(30)).toBe(1);
    expect(occupancyRate(0)).toBe(0);
  });

  it("lehnt negative Werte und mehr als 30 Tage ab", () => {
    expect(occupancyRate(-1)).toBeNull();
    expect(occupancyRate(31)).toBeNull();
    expect(occupancyRate(null)).toBeNull();
  });
});

describe("Umsatz (Testfälle 4 bis 6)", () => {
  it("Monatsumsatz = effektiver Nachtpreis mal vermietete Tage", () => {
    expect(monthlyRevenue(120, 18)).toBe(2160);
  });

  it("Jahresumsatz = Monatsumsatz mal 12", () => {
    expect(annualRevenue(2160)).toBe(25920);
    expect(annualRevenue(null)).toBeNull();
  });

  it("Mindestpreis bei 100 % Auslastung = Monatsumsatz geteilt durch 30", () => {
    expect(minPriceAtFullOccupancy(2160)).toBe(72);
    expect(minPriceAtFullOccupancy(null)).toBeNull();
  });

  it("liefert null bei ungültigen Tagen", () => {
    expect(monthlyRevenue(120, 31)).toBeNull();
    expect(monthlyRevenue(120, -1)).toBeNull();
    expect(monthlyRevenue(null, 18)).toBeNull();
  });
});
