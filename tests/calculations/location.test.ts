import { describe, expect, it } from "vitest";
import { deriveLocation } from "@/lib/calculations/location-calculations";
import { emptyLocation } from "@/lib/utils";

describe("Standortkennzahlen", () => {
  it("leitet vermietete Tage aus der Auslastungsquote ab und kennzeichnet die Herkunft", () => {
    const l = emptyLocation("Test");
    l.occupancyPct = 60;
    const d = deriveLocation(l);
    expect(d.occupancyRate!.source).toBe("manual");
    expect(d.occupancyRate!.value).toBeCloseTo(0.6, 10);
    expect(d.rentedDays!.source).toBe("derived");
    expect(d.rentedDays!.value).toBeCloseTo(18, 10);
  });

  it("leitet die Auslastungsquote aus vermieteten Tagen ab", () => {
    const l = emptyLocation("Test");
    l.rentedDaysPerMonth = 15;
    const d = deriveLocation(l);
    expect(d.occupancyRate!.source).toBe("derived");
    expect(d.occupancyRate!.value).toBeCloseTo(0.5, 10);
  });

  it("berechnet Monats- und Jahresumsatz aus dem Jahresumsatz", () => {
    const l = emptyLocation("Test");
    l.avgAnnualRevenue = 32000;
    const d = deriveLocation(l);
    expect(d.monthlyRevenue!.value).toBeCloseTo(32000 / 12, 6);
    expect(d.monthlyRevenue!.source).toBe("derived");
    expect(d.annualRevenue!.source).toBe("manual");
  });

  it("warnt bei widersprüchlichen Eingaben, ohne manuelle Werte zu überschreiben", () => {
    const l = emptyLocation("Test");
    l.occupancyPct = 90; // entspräche 27 Tagen
    l.rentedDaysPerMonth = 15; // manuell abweichend
    const d = deriveLocation(l);
    expect(d.warnings.length).toBeGreaterThan(0);
    expect(d.rentedDays!.value).toBe(15);
    expect(d.rentedDays!.source).toBe("manual");
  });

  it("warnt, wenn zwei Umsatzableitungen stark voneinander abweichen", () => {
    const l = emptyLocation("Test");
    l.avgAnnualRevenue = 32000; // rund 2.667 pro Monat
    l.avgRevenuePerNight = 200;
    l.rentedDaysPerMonth = 20; // 4.000 pro Monat, Abweichung > 10 %
    const d = deriveLocation(l);
    expect(d.monthlyRevenueFromNight!.value).toBeCloseTo(4000, 6);
    expect(d.warnings.some((w) => w.toLowerCase().includes("umsatz"))).toBe(
      true
    );
  });
});
