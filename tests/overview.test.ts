import { describe, expect, it } from "vitest";
import { findObject, NO_ADDRESS_TEXT, tileSummary } from "@/lib/overview";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";
import { sampleProperties } from "@/lib/sample-data";

describe("Kachelwerte der Objektübersicht", () => {
  it("zeigt Gewinn pro Monat aus dem moderaten Szenario (eingegebene Werte)", () => {
    const p = sampleProperties()[0];
    const tile = tileSummary(p);
    expect(tile.name).toBe(p.name);
    expect(tile.address).toBe("Lüneburg, Altstadt");
    expect(tile.hasAddress).toBe(true);
    expect(tile.monthlyProfit).toBeCloseTo(deriveProperty(p).monthlyProfit!, 6);
    expect(tile.label).toBe("Gewinn pro Monat");
    expect(tile.tone).toBe("positive");
  });

  it("zeigt Verlust pro Monat bei negativem Gewinn", () => {
    const p = emptyProperty("Teuer");
    p.pricing.nightPrice = 50;
    p.pricing.rentedDaysPerMonth = 10;
    p.costs.coldRent = 2000;
    const tile = tileSummary(p);
    expect(tile.monthlyProfit).toBeLessThan(0);
    expect(tile.label).toBe("Verlust pro Monat");
    expect(tile.tone).toBe("negative");
  });

  it("meldet nicht berechenbar und fehlende Adresse", () => {
    const tile = tileSummary(emptyProperty(""));
    expect(tile.name).toBe("Ohne Namen");
    expect(tile.address).toBe(NO_ADDRESS_TEXT);
    expect(tile.hasAddress).toBe(false);
    expect(tile.monthlyProfit).toBeNull();
    expect(tile.label).toBe("Noch nicht berechenbar");
    expect(tile.tone).toBe("neutral");
  });

  it("verändert das Objekt und seine Kennzahlen nicht", () => {
    const p = sampleProperties()[1];
    const before = JSON.stringify(deriveProperty(p));
    tileSummary(p);
    expect(JSON.stringify(deriveProperty(p))).toBe(before);
  });
});

describe("Objekt zur Kennung aus der URL", () => {
  const objects = sampleProperties();
  it("findet bekannte Kennungen", () => {
    expect(findObject(objects, objects[1].id)?.name).toBe(objects[1].name);
  });
  it("liefert null bei unbekannter, leerer oder fehlender Kennung", () => {
    expect(findObject(objects, "gibt-es-nicht")).toBeNull();
    expect(findObject(objects, "")).toBeNull();
    expect(findObject(objects, null)).toBeNull();
    expect(findObject([], objects[0].id)).toBeNull();
  });
});
