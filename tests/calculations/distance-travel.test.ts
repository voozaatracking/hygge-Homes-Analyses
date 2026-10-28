import { describe, expect, it } from "vitest";
import { estimatedRouteKm, haversineKm, isLatLng } from "@/lib/geo/distance";
import { DETOUR_FACTOR } from "@/lib/config/assumptions";
import {
  deriveProperty,
  type DeriveContext,
} from "@/lib/calculations/property-calculations";
import { emptyProperty } from "@/lib/utils";

// Lüneburg (Am Sande) und Hamburg (Rathausmarkt): Luftlinie rund 44 km.
const LUENEBURG = { lat: 53.2464, lng: 10.4115 };
const HAMBURG = { lat: 53.5503, lng: 9.9920 };
const HQ: DeriveContext = { hq: LUENEBURG };

function base(context = HQ) {
  const p = emptyProperty("Objekt");
  p.pricing.nightPrice = 100;
  p.pricing.rentedDaysPerMonth = 20;
  p.costs.coldRent = 1000;
  p.address = { text: "Hamburg", ...HAMBURG };
  return { p, context };
}

describe("Entfernung (Haversine und Umwegfaktor)", () => {
  it("berechnet bekannte Koordinatenpaare", () => {
    expect(haversineKm(LUENEBURG, LUENEBURG)).toBe(0);
    const km = haversineKm(LUENEBURG, HAMBURG);
    expect(km).toBeGreaterThan(43);
    expect(km).toBeLessThan(46);
    // Berlin (Brandenburger Tor) nach München (Marienplatz): rund 504 km Luftlinie.
    const berlinMuenchen = haversineKm(
      { lat: 52.5163, lng: 13.3777 },
      { lat: 48.1374, lng: 11.5755 }
    );
    expect(berlinMuenchen).toBeGreaterThan(500);
    expect(berlinMuenchen).toBeLessThan(508);
    // Symmetrie.
    expect(haversineKm(HAMBURG, LUENEBURG)).toBeCloseTo(km, 9);
  });

  it("multipliziert die Luftlinie mit dem Umwegfaktor 1,3", () => {
    expect(DETOUR_FACTOR).toBe(1.3);
    expect(estimatedRouteKm(LUENEBURG, HAMBURG)).toBeCloseTo(
      haversineKm(LUENEBURG, HAMBURG) * 1.3,
      9
    );
  });

  it("erkennt vollständige und plausible Koordinaten", () => {
    expect(isLatLng({ lat: 53, lng: 10 })).toBe(true);
    expect(isLatLng({ lat: null, lng: 10 })).toBe(false);
    expect(isLatLng({ lat: 95, lng: 10 })).toBe(false);
    expect(isLatLng(null)).toBe(false);
  });
});

describe("derived.distance", () => {
  it("berechnet die Entfernung zum Firmensitz auch ohne aktivierte Fahrtkosten", () => {
    const { p, context } = base();
    const d = deriveProperty(p, context);
    expect(d.distance.source).toBe("hq");
    expect(d.distance.km).toBeCloseTo(estimatedRouteKm(LUENEBURG, HAMBURG), 9);
    expect(d.distance.note).toBeNull();
    expect(d.travel.amount).toBeNull();
  });

  it("gibt Hinweise, wenn eine Seite fehlt", () => {
    const { p } = base();
    const ohneHq = deriveProperty(p, { hq: null });
    expect(ohneHq.distance.km).toBeNull();
    expect(ohneHq.distance.note).toBe(
      "Entfernung nicht berechenbar: Koordinaten des Firmensitzes (im Profil ermitteln) fehlen."
    );

    const ohneObjekt = base();
    ohneObjekt.p.address = { text: "Irgendwo", lat: null, lng: null };
    const d = deriveProperty(ohneObjekt.p, HQ);
    expect(d.distance.note).toBe("Entfernung nicht berechenbar: Koordinaten des Objekts fehlen.");

    // Ohne Kontext (Standardaufruf) bleibt das Objekt rechenbar.
    expect(deriveProperty(ohneObjekt.p).distance.km).toBeNull();
  });

  it("nutzt bei aktivierten Fahrtkosten mit eigener Adresse den Ausgangspunkt", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    p.travel.originMode = "custom";
    p.travel.customOrigin = { text: "Berlin", lat: 52.5163, lng: 13.3777 };
    const d = deriveProperty(p, context);
    expect(d.distance.source).toBe("custom");
    expect(d.distance.km).toBeCloseTo(
      estimatedRouteKm({ lat: 52.5163, lng: 13.3777 }, HAMBURG),
      9
    );
  });
});

describe("Fahrtkosten Reinigung", () => {
  it("Kilometerpauschale: Strecke × 2 × Satz × Fahrten, Default der Fahrten aus der Reinigung", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    p.travel.ratePerKm = 0.3;
    // tripsPerMonth leer → changesPerMonth (Default 4)
    const d = deriveProperty(p, context);
    const km = estimatedRouteKm(LUENEBURG, HAMBURG);
    expect(d.travel.tripsPerMonth).toBe(4);
    expect(d.travel.amount).toBeCloseTo(km * 2 * 0.3 * 4, 9);
    const line = d.costLines.find((l) => l.label === "Fahrtkosten Reinigung");
    expect(line?.amount).toBeCloseTo(km * 2 * 0.3 * 4, 9);
    expect(line?.source).toBe("derived");
  });

  it("respektiert eingegebene Fahrten pro Monat", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    p.travel.ratePerKm = 0.3;
    p.travel.tripsPerMonth = 10;
    const d = deriveProperty(p, context);
    expect(d.travel.tripsPerMonth).toBe(10);
    expect(d.travel.amount).toBeCloseTo(estimatedRouteKm(LUENEBURG, HAMBURG) * 2 * 0.3 * 10, 9);
  });

  it("Fixpreis je Fahrt gilt für Hin und zurück und braucht keine Koordinaten", () => {
    const { p } = base();
    p.address = { text: "ohne Koordinaten", lat: null, lng: null };
    p.travel.enabled = true;
    p.travel.costMode = "perTrip";
    p.travel.pricePerTrip = 25;
    p.travel.tripsPerMonth = 6;
    const d = deriveProperty(p, { hq: null });
    expect(d.travel.amount).toBe(150);
    expect(d.travel.note).toBeNull();
  });

  it("Wert 0 bedeutet keine Kostenzeile", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    p.travel.ratePerKm = 0;
    const d0 = deriveProperty(p, context);
    expect(d0.travel.amount).toBeNull();
    expect(d0.travel.note).toBeNull();
    expect(d0.costLines.find((l) => l.label === "Fahrtkosten Reinigung")).toBeUndefined();

    p.travel.ratePerKm = 0.3;
    p.travel.tripsPerMonth = 0;
    expect(deriveProperty(p, context).travel.amount).toBeNull();

    p.travel.costMode = "perTrip";
    p.travel.pricePerTrip = 0;
    p.travel.tripsPerMonth = 4;
    expect(deriveProperty(p, context).travel.amount).toBeNull();
  });

  it("gibt Hinweise, wenn Koordinaten, Satz oder Fahrten fehlen", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    expect(deriveProperty(p, context).travel.note).toBe(
      "Fahrtkosten werden nicht berücksichtigt: Kilometerpauschale fehlt."
    );
    p.travel.ratePerKm = 0.3;
    expect(deriveProperty(p, { hq: null }).travel.note).toBe(
      "Fahrtkosten werden nicht berücksichtigt: Koordinaten des Objekts oder des Firmensitzes fehlen."
    );
    p.cleaningAssumptions.changesPerMonth = null;
    expect(deriveProperty(p, context).travel.note).toBe(
      "Fahrtkosten werden nicht berücksichtigt: Fahrten pro Monat fehlen."
    );
    p.travel.costMode = "perTrip";
    p.travel.tripsPerMonth = 4;
    expect(deriveProperty(p, context).travel.note).toBe(
      "Fahrtkosten werden nicht berücksichtigt: Preis je Fahrt fehlt."
    );
    // Deaktiviert: kein Hinweis.
    p.travel.enabled = false;
    expect(deriveProperty(p, context).travel.note).toBeNull();
  });

  it("zählt Fahrtkosten als Fixkosten im Break-even", () => {
    const { p, context } = base();
    p.travel.enabled = true;
    p.travel.costMode = "perTrip";
    p.travel.pricePerTrip = 50;
    p.travel.tripsPerMonth = 4;
    const d = deriveProperty(p, context);
    // Fixkosten 1000 + 200, Deckungsbeitrag 100 × (1 − 0,15) = 85
    expect(d.fixedMonthlyCosts).toBeCloseTo(1200, 6);
    expect(d.variableMonthlyCosts).toBeCloseTo(300, 6);
    expect(d.breakEvenNights).toBeCloseTo(1200 / 85, 6);
  });
});
