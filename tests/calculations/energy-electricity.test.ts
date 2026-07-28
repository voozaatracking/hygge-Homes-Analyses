import { describe, expect, it } from "vitest";
import { calcElectricity } from "@/lib/calculations/electricity";
import {
  consumptionFromClass,
  effectiveEnergy,
  energyClassFromConsumption,
} from "@/lib/calculations/energy";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";

describe("Stromkosten (Testfall 7)", () => {
  it("berechnet das Beispiel 2,08 kWh/qm pro Monat auf 65 qm exakt nach", () => {
    const result = calcElectricity({
      consumptionKwhSqmMonth: 2.08,
      areaSqm: 65,
      pricePerKwh: 0.35,
      surchargePct: 30,
    });
    expect(result).not.toBeNull();
    expect(result!.monthlyKwh).toBeCloseTo(135.2, 6);
    expect(result!.annualKwh).toBeCloseTo(1622.4, 6);
    expect(result!.annualCostNoSurcharge).toBeCloseTo(567.84, 6);
    expect(result!.annualCostWithSurcharge).toBeCloseTo(738.192, 6);
    expect(result!.monthlyCost).toBeCloseTo(61.516, 6);
    expect(result!.lines.length).toBeGreaterThan(0);
  });

  it("ist unabhängig vom Energieausweis-Verbrauch (Heizenergie)", () => {
    const sparsam = emptyProperty("Klasse A");
    sparsam.areaSqm = 65;
    sparsam.energy.consumption = 40;
    const verschwenderisch = emptyProperty("Klasse H");
    verschwenderisch.areaSqm = 65;
    verschwenderisch.energy.consumption = 250;
    const a = deriveProperty(sparsam);
    const h = deriveProperty(verschwenderisch);
    expect(a.electricityUsed!.amount).toBeCloseTo(
      h.electricityUsed!.amount,
      6
    );
  });

  it("liefert null bei fehlenden oder negativen Eingaben", () => {
    expect(
      calcElectricity({
        consumptionKwhSqmMonth: null,
        areaSqm: 65,
        pricePerKwh: 0.35,
        surchargePct: 30,
      })
    ).toBeNull();
    expect(
      calcElectricity({
        consumptionKwhSqmMonth: 2.08,
        areaSqm: 65,
        pricePerKwh: -0.1,
        surchargePct: 30,
      })
    ).toBeNull();
  });

  it("verwendet manuelle Stromkosten nur bei aktiviertem Override und kennzeichnet die Quelle", () => {
    const auto = emptyProperty("Auto");
    auto.areaSqm = 65;
    const derivedAuto = deriveProperty(auto);
    expect(derivedAuto.electricityUsed).not.toBeNull();
    expect(derivedAuto.electricityUsed!.source).toBe("derived");
    expect(derivedAuto.electricityUsed!.amount).toBeCloseTo(61.516, 6);

    const manual = emptyProperty("Manuell");
    manual.areaSqm = 65;
    manual.costs.useManualElectricity = true;
    manual.costs.electricityManual = 200;
    const derivedManual = deriveProperty(manual);
    expect(derivedManual.electricityUsed).not.toBeNull();
    expect(derivedManual.electricityUsed!.source).toBe("manual");
    expect(derivedManual.electricityUsed!.amount).toBe(200);
  });
});

describe("Energieklasse aus Verbrauch (Testfall 8)", () => {
  it("ordnet Verbrauchswerte den Klassen der Normierungstabelle zu", () => {
    expect(energyClassFromConsumption(30)).toBe("A+");
    expect(energyClassFromConsumption(31)).toBe("A");
    expect(energyClassFromConsumption(95)).toBe("C");
    expect(energyClassFromConsumption(120)).toBe("D");
    expect(energyClassFromConsumption(231)).toBe("H");
    expect(energyClassFromConsumption(250)).toBe("H");
  });

  it("behandelt Werte unterhalb der ersten Schwelle als beste Klasse (dokumentierte Annahme)", () => {
    expect(energyClassFromConsumption(0)).toBe("A+");
  });
});

describe("Verbrauchsschätzung aus Klasse (Testfall 9)", () => {
  it("nutzt den Mittelwert aus unterer und nächster Schwelle, bei C über den Doppelbereich", () => {
    const c = consumptionFromClass("C");
    expect(c).not.toBeNull();
    expect(c!.value).toBe(91);
    expect(c!.rangeMin).toBe(71);
    expect(c!.rangeMax).toBe(111);
    expect(c!.isEstimate).toBe(true);

    const aPlus = consumptionFromClass("A+");
    expect(aPlus!.value).toBeCloseTo(15.5005, 6);
  });

  it("verwendet für H den konfigurierten repräsentativen Mindestwert ohne Obergrenze", () => {
    const h = consumptionFromClass("H");
    expect(h!.value).toBe(231);
    expect(h!.rangeMax).toBeNull();
  });

  it("warnt bei widersprüchlichen Eingaben, ohne einen Wert zu überschreiben", () => {
    const result = effectiveEnergy({ consumption: 120, energyClass: "A" });
    expect(result.conflict).not.toBeNull();
    expect(result.consumption).toBe(120);
    expect(result.energyClass).toBe("A");
  });

  it("leitet fehlende Angaben automatisch ab und kennzeichnet die Quelle", () => {
    const fromConsumption = effectiveEnergy({
      consumption: 120,
      energyClass: null,
    });
    expect(fromConsumption.energyClass).toBe("D");
    expect(fromConsumption.energyClassSource).toBe("derived");

    const fromClass = effectiveEnergy({ consumption: null, energyClass: "C" });
    expect(fromClass.consumption).toBe(91);
    expect(fromClass.consumptionSource).toBe("derived");
    expect(fromClass.derived?.isEstimate).toBe(true);
  });
});
