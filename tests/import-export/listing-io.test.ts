import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildAnalysisFile, parseAnalysisFile } from "@/lib/io/json-file";
import { parseListingWorkbook } from "@/lib/io/listing-excel-import";
import { emptyListing, emptyLocation } from "@/lib/utils";
import { WEEKS_PER_YEAR } from "@/lib/config/assumptions";

describe("JSON-Datei: Inserate und Migration", () => {
  it("erhält Inserate beim Export und erneuten Import (Roundtrip)", () => {
    const location = emptyLocation("Roundtrip-Stadt");
    const listing = emptyListing("Inserat 1");
    listing.weeklyPrices[0] = 1110;
    listing.cleaningCost = 130;
    location.listings = [listing];
    location.changesPerWeek = 3;

    const file = buildAnalysisFile([], [location], "location");
    const parsed = parseAnalysisFile(JSON.stringify(file));

    expect(parsed.ok).toBe(true);
    const restored = parsed.data!.locations[0];
    expect(restored.changesPerWeek).toBe(3);
    expect(restored.listings).toHaveLength(1);
    expect(restored.listings[0].weeklyPrices).toHaveLength(WEEKS_PER_YEAR);
    expect(restored.listings[0].weeklyPrices[0]).toBe(1110);
    expect(restored.listings[0].cleaningCost).toBe(130);
  });

  it("migriert Schema-Version 1 (ohne Inserate) mit Standardwerten", () => {
    const v1 = {
      schemaVersion: 1,
      calcVersion: "1.0.0",
      exportedAt: "2025-01-01T00:00:00.000Z",
      analysisMode: "location",
      objects: [],
      locations: [
        {
          id: "alt-1",
          name: "Alte Datei",
          dataSource: "",
          collectedAt: "2025-01-01",
          occupancyPct: 62,
          rentedDaysPerMonth: null,
          avgAnnualRevenue: null,
          avgRevenuePerNight: null,
          avgCleaningCost: null,
          extraPersonCost: null,
          sourceUrl: "",
          notes: "",
          highlighted: false,
        },
      ],
      assumptions: {},
    };

    const parsed = parseAnalysisFile(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    const location = parsed.data!.locations[0];
    expect(location.listings).toEqual([]);
    expect(location.changesPerWeek).toBe(2);
  });

  it("normalisiert abweichende Wochenpreis-Längen auf 52 Einträge", () => {
    const location = emptyLocation("Normalisierung");
    const listing = emptyListing("Kurz");
    location.listings = [listing];
    const file = buildAnalysisFile([], [location], "location");
    const raw = JSON.parse(JSON.stringify(file));
    raw.locations[0].listings[0].weeklyPrices = [100, 200];

    const parsed = parseAnalysisFile(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    const prices = parsed.data!.locations[0].listings[0].weeklyPrices;
    expect(prices).toHaveLength(WEEKS_PER_YEAR);
    expect(prices[0]).toBe(100);
    expect(prices[1]).toBe(200);
    expect(prices[2]).toBeNull();
  });
});

describe("Excel-Import der Standortanalyse", () => {
  function buildWorkbookBuffer(withDashboard = true): ArrayBuffer {
    const header = [
      "Name des Inserats",
      "Booking Inserat",
      "Bewertung",
      "Personen",
      "Reinigungskosten",
      "Mehrkosten p.P.",
      ...Array.from({ length: WEEKS_PER_YEAR }, (_, i) => `KW ${i + 1}`),
    ];
    const rowA = [
      "",
      "Salí Homes Weinblick (Beispiel)",
      9,
      6,
      130,
      10,
      ...Array.from({ length: WEEKS_PER_YEAR }, () => 1110),
    ];
    const rowB = [
      "Zweites Inserat",
      "https://www.booking.com/hotel/beispiel.html",
      "",
      4,
      "",
      "",
      ...Array.from({ length: WEEKS_PER_YEAR }, (_, i) =>
        i < 10 ? 970 : ""
      ),
    ];
    const daten = XLSX.utils.aoa_to_sheet([
      ["Bönnigheim"],
      [],
      header,
      rowA,
      rowB,
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, daten, "Daten");
    if (withDashboard) {
      const dashboard = XLSX.utils.aoa_to_sheet([[]]);
      dashboard["C7"] = { t: "n", v: 0.62 };
      dashboard["!ref"] = "A1:C7";
      XLSX.utils.book_append_sheet(book, dashboard, "Dashboard");
    }
    return XLSX.write(book, { type: "array", bookType: "xlsx" });
  }

  it("liest Stadt, Inserate, Wochenpreise und die Dashboard-Quote", () => {
    const result = parseListingWorkbook(buildWorkbookBuffer());

    expect(result.ok).toBe(true);
    expect(result.cityName).toBe("Bönnigheim");
    expect(result.occupancyPct).toBeCloseTo(62, 6);
    expect(result.listings).toHaveLength(2);

    const first = result.listings![0];
    // Der Inseratstitel steht in der Praxis oft in der Booking-Spalte.
    expect(first.name).toContain("Salí Homes");
    expect(first.bookingUrl).toBe("");
    expect(first.rating).toBe(9);
    expect(first.persons).toBe(6);
    expect(first.cleaningCost).toBe(130);
    expect(first.extraCostPerPerson).toBe(10);
    expect(first.weeklyPrices).toHaveLength(WEEKS_PER_YEAR);
    expect(first.weeklyPrices[0]).toBe(1110);
    expect(first.weeklyPrices[51]).toBe(1110);

    const second = result.listings![1];
    expect(second.name).toBe("Zweites Inserat");
    expect(second.bookingUrl).toContain("booking.com");
    expect(second.weeklyPrices[9]).toBe(970);
    expect(second.weeklyPrices[10]).toBeNull();
  });

  it("meldet einen verständlichen Fehler bei fremdem Format", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["Irgendwas", "Anderes"]]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Tabelle1");
    const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });

    const result = parseListingWorkbook(buffer);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Name des Inserats");
  });
});
