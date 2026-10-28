import { describe, expect, it } from "vitest";
import {
  defaultProfileSettings,
  parseProfileSettings,
  PROFILE_SETTINGS_VERSION,
  validateProfileSettings,
} from "@/lib/profile/settings";
import {
  CLEANING_DEFAULTS,
  ELECTRICITY_DEFAULTS,
  LISTING_DEFAULTS,
  REVENUE_DEFAULTS,
} from "@/lib/config/assumptions";
import { emptyLocation, emptyProperty } from "@/lib/utils";

describe("Profil-Einstellungen (Schema)", () => {
  it("ergibt aus einem leeren Objekt vollständige Defaults", () => {
    const s = parseProfileSettings({});
    expect(s.schemaVersion).toBe(PROFILE_SETTINGS_VERSION);
    expect(s.defaults.electricity).toEqual({
      pricePerKwh: ELECTRICITY_DEFAULTS.pricePerKwh,
      surchargePct: ELECTRICITY_DEFAULTS.surchargePct,
    });
    expect(s.defaults.cleaning).toEqual({ ...CLEANING_DEFAULTS });
    expect(s.defaults.revenue).toEqual({ ...REVENUE_DEFAULTS });
    expect(s.defaults.touristTax).toEqual({
      mode: "perPersonNight",
      pct: null,
      perPersonNight: null,
    });
    expect(s.defaults.listing.changesPerWeek).toBe(LISTING_DEFAULTS.changesPerWeek);
    expect(s.company).toEqual({
      name: "",
      street: "",
      zip: "",
      city: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      registerInfo: "",
      logoDataUrl: null,
      primaryColor: null,
      secondaryColor: null,
    });
    expect(s.hq).toEqual({ address: "", lat: null, lng: null });
    expect(s.report.selectedSections).toHaveLength(5);
    expect(parseProfileSettings(null)).toEqual(defaultProfileSettings());
  });

  it("füllt fehlende Teilfelder auf und ignoriert unbekannte", () => {
    const s = parseProfileSettings({
      defaults: { cleaning: { hourlyWage: 25 } },
      company: { name: "Hygge Homes", unbekannt: 1 },
      zukunft: { x: true },
    });
    expect(s.defaults.cleaning.hourlyWage).toBe(25);
    expect(s.defaults.cleaning.minutesPerSqm).toBe(CLEANING_DEFAULTS.minutesPerSqm);
    expect(s.company.name).toBe("Hygge Homes");
    expect(s.company.city).toBe("");
    expect("zukunft" in s).toBe(false);
    expect("unbekannt" in s.company).toBe(false);
  });

  it("lehnt falsche Typen bei strenger Prüfung ab und fällt tolerant auf Defaults zurück", () => {
    const bad = { defaults: { cleaning: { hourlyWage: "teuer" } } };
    const strict = validateProfileSettings(bad);
    expect(strict.ok).toBe(false);
    if (!strict.ok) expect(strict.error).toMatch(/defaults\.cleaning\.hourlyWage/);
    expect(parseProfileSettings(bad)).toEqual(defaultProfileSettings());
  });

  it("prüft Logo-Format und -Größe sowie Farben", () => {
    const png = `data:image/png;base64,${"A".repeat(400)}`;
    expect(validateProfileSettings({ company: { logoDataUrl: png } }).ok).toBe(true);
    expect(
      validateProfileSettings({ company: { logoDataUrl: "data:image/gif;base64,AAAA" } }).ok
    ).toBe(false);
    const tooBig = `data:image/png;base64,${"A".repeat(Math.ceil((301 * 1024 * 4) / 3) + 4)}`;
    expect(validateProfileSettings({ company: { logoDataUrl: tooBig } }).ok).toBe(false);
    expect(validateProfileSettings({ company: { primaryColor: "#A1B2C3" } }).ok).toBe(true);
    expect(validateProfileSettings({ company: { primaryColor: "rot" } }).ok).toBe(false);
    expect(validateProfileSettings({ hq: { lat: "nord" } }).ok).toBe(false);
  });
});

describe("Neue Objekte mit Profil-Defaults", () => {
  it("übernimmt die Standardannahmen des Profils", () => {
    const s = parseProfileSettings({
      defaults: {
        electricity: { pricePerKwh: 0.4, surchargePct: 20 },
        cleaning: { minutesPerSqm: 3, hourlyWage: 25, changesPerMonth: 6 },
        revenue: { platformCommissionPct: 12 },
        touristTax: { mode: "percentOfPrice", pct: 5, perPersonNight: null },
        listing: { changesPerWeek: 3 },
      },
    });
    const p = emptyProperty("Neu", s.defaults);
    expect(p.electricityAssumptions).toEqual({
      pricePerKwh: 0.4,
      surchargePct: 20,
      consumptionKwhSqmMonth: ELECTRICITY_DEFAULTS.consumptionKwhSqmMonth,
    });
    expect(p.cleaningAssumptions).toEqual({ minutesPerSqm: 3, hourlyWage: 25, changesPerMonth: 6 });
    expect(p.revenueAssumptions.platformCommissionPct).toBe(12);
    expect(p.costs.touristTaxMode).toBe("percentOfPrice");
    expect(p.costs.touristTaxPct).toBe(5);
    expect(emptyLocation("Ort", s.defaults).changesPerWeek).toBe(3);
  });

  it("verhält sich ohne Profil wie bisher", () => {
    const p = emptyProperty("Neu");
    expect(p.electricityAssumptions).toEqual({ ...ELECTRICITY_DEFAULTS });
    expect(p.cleaningAssumptions).toEqual({ ...CLEANING_DEFAULTS });
    expect(p.revenueAssumptions).toEqual({ ...REVENUE_DEFAULTS });
    expect(p.costs.touristTaxMode).toBe("perPersonNight");
    expect(emptyLocation("Ort").changesPerWeek).toBe(LISTING_DEFAULTS.changesPerWeek);
  });
});
