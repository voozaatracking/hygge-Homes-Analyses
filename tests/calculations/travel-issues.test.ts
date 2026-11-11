import { describe, expect, it } from "vitest";
import { describeTravelIssues } from "@/lib/calculations/missing";
import type { DeriveContext } from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";

const HQ: DeriveContext = { hq: { lat: 53.2464, lng: 10.4115 }, hqAddress: "Am Sande 1, Lüneburg" };
const NO_HQ: DeriveContext = { hq: null, hqAddress: null };
const HQ_WITHOUT_COORDS: DeriveContext = { hq: null, hqAddress: "Am Sande 1, Lüneburg" };

function complete() {
  const p = emptyProperty("Objekt");
  p.address = { text: "Hamburg", lat: 53.55, lng: 9.99 };
  return p;
}

const codes = (p: ReturnType<typeof emptyProperty>, c: DeriveContext) =>
  describeTravelIssues(p, c).map((i) => i.code);

describe("Ursachen für fehlende Entfernung und Fahrtkosten", () => {
  it("meldet nichts, wenn alles vorliegt", () => {
    const p = complete();
    p.travel.enabled = true;
    p.travel.ratePerKm = 0.3;
    expect(codes(p, HQ)).toEqual([]);
  });

  it("Objektadresse fehlt bzw. Koordinaten fehlen", () => {
    const p = emptyProperty("Objekt");
    expect(describeTravelIssues(p, HQ)).toEqual([
      { code: "objectAddressMissing", text: "Objektadresse fehlt. Bitte unter Grunddaten eintragen." },
    ]);
    p.address = { text: "Hamburg", lat: null, lng: null };
    expect(codes(p, HQ)).toEqual(["objectCoordsMissing"]);
    expect(describeTravelIssues(p, HQ)[0].text).toContain("Koordinaten ermitteln");
  });

  it("Firmensitz fehlt bzw. Koordinaten des Firmensitzes fehlen, mit Link zum Profil", () => {
    const p = complete();
    const missing = describeTravelIssues(p, NO_HQ);
    expect(missing).toEqual([
      { code: "hqMissing", text: "Firmensitz fehlt. Bitte im Profil eintragen.", href: "/profil" },
    ]);
    const noCoords = describeTravelIssues(p, HQ_WITHOUT_COORDS);
    expect(noCoords.map((i) => i.code)).toEqual(["hqCoordsMissing"]);
    expect(noCoords[0].href).toBe("/profil");
    expect(noCoords[0].text).toContain("Koordinaten ermitteln");
  });

  it("eigene Ausgangsadresse: Adresse oder Koordinaten fehlen, am Feld angezeigt", () => {
    const p = complete();
    p.travel.enabled = true;
    p.travel.originMode = "custom";
    p.travel.ratePerKm = 0.3;
    const missing = describeTravelIssues(p, NO_HQ);
    expect(missing.map((i) => i.code)).toEqual(["customAddressMissing"]);
    expect(missing[0].atOriginField).toBe(true);
    // Firmensitz ist bei eigener Adresse nicht relevant.
    expect(missing.some((i) => i.code === "hqMissing")).toBe(false);

    p.travel.customOrigin = { text: "Berlin", lat: null, lng: null };
    expect(codes(p, NO_HQ)).toEqual(["customCoordsMissing"]);
  });

  it("Kilometersatz, Fixpreis und Fahrten fehlen nur bei aktivierten Fahrtkosten", () => {
    const p = complete();
    expect(codes(p, HQ)).toEqual([]);
    p.travel.enabled = true;
    expect(codes(p, HQ)).toEqual(["rateMissing"]);
    p.travel.costMode = "perTrip";
    expect(codes(p, HQ)).toEqual(["priceMissing"]);
    p.travel.pricePerTrip = 20;
    p.cleaningAssumptions.changesPerMonth = null;
    expect(codes(p, HQ)).toEqual(["tripsMissing"]);
    p.travel.tripsPerMonth = 3;
    expect(codes(p, HQ)).toEqual([]);
  });

  it("nennt mehrere Ursachen kombiniert in fester Reihenfolge", () => {
    const p = emptyProperty("Objekt");
    p.travel.enabled = true;
    p.cleaningAssumptions.changesPerMonth = null;
    expect(codes(p, NO_HQ)).toEqual([
      "objectAddressMissing",
      "hqMissing",
      "rateMissing",
      "tripsMissing",
    ]);
  });
});
