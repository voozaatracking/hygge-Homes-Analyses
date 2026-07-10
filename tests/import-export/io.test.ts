import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildLocationsFromMatrix,
  buildPropertiesFromMatrix,
  OBJECT_IMPORT_FIELDS,
  LOCATION_IMPORT_FIELDS,
  readWorkbook,
  suggestMapping,
  unmappedColumns,
  type Matrix,
} from "@/lib/io/excel-import";
import {
  buildAnalysisFile,
  parseAnalysisFile,
} from "@/lib/io/json-file";
import { SCHEMA_VERSION } from "@/lib/config/assumptions";
import { emptyLocation, emptyProperty } from "@/lib/utils";

function matrixToXlsxBuffer(matrix: Matrix): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Objekte");
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("Excel-Import (Testfall 17)", () => {
  const matrix: Matrix = [
    [
      "Objektname",
      "Fläche",
      "Schlafzimmer",
      "Betten",
      "Energieverbrauch",
      "Nachtpreis",
      "Vermietete Tage",
      "Kaltmiete",
      "Interne Notiz",
    ],
    ["Apartment A", 65, 3, 5, 120, 120, 18, 700, "x"],
    ["Apartment B", "80,5", 4, 8, null, 140, 15, "1.150,00", "y"],
    ["Kaputt", -20, 2, 4, 120, 100, 40, 500, "z"],
  ];

  it("erkennt Spalten über Spaltennamen statt fester Zellpositionen", () => {
    const mapping = suggestMapping(matrix[0], OBJECT_IMPORT_FIELDS);
    expect(mapping["name"]).toBe(0);
    expect(mapping["areaSqm"]).toBe(1);
    expect(mapping["bedrooms"]).toBe(2);
    expect(mapping["beds"]).toBe(3);
    expect(mapping["energyConsumption"]).toBe(4);
    expect(mapping["nightPrice"]).toBe(5);
    expect(mapping["rentedDaysPerMonth"]).toBe(6);
    expect(mapping["coldRent"]).toBe(7);
  });

  it("meldet nicht zugeordnete Spalten", () => {
    const mapping = suggestMapping(matrix[0], OBJECT_IMPORT_FIELDS);
    expect(unmappedColumns(matrix[0], mapping)).toContain("interne notiz");
  });

  it("importiert gültige Zeilen inklusive deutscher Zahlenformate und meldet fehlerhafte Zeilen", () => {
    const mapping = suggestMapping(matrix[0], OBJECT_IMPORT_FIELDS);
    const { rows, errors } = buildPropertiesFromMatrix(matrix, mapping);
    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe("Apartment A");
    expect(rows[0].areaSqm).toBe(65);
    expect(rows[1].areaSqm).toBeCloseTo(80.5, 10);
    expect(rows[1].costs.coldRent).toBeCloseTo(1150, 10);
    // Zeile 4: negative Fläche und 40 vermietete Tage werden gemeldet
    // und nicht als scheinbar gültige Werte übernommen.
    const messages = errors.map((e) => `${e.rowNumber}: ${e.message}`).join(" | ");
    expect(errors.some((e) => e.rowNumber === 4)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(rows[2].areaSqm).toBeNull();
    expect(rows[2].pricing.rentedDaysPerMonth).toBeNull();
  });

  it("liest eine echte XLSX-Arbeitsmappe über readWorkbook", () => {
    const buffer = matrixToXlsxBuffer(matrix);
    const book = readWorkbook(buffer);
    expect(book.sheetNames).toContain("Objekte");
    const read = book.getMatrix("Objekte");
    expect(read[0][0]).toBe("Objektname");
    expect(read[1][1]).toBe(65);
  });

  it("importiert Standortzeilen mit Prozent- und Umsatzwerten", () => {
    const locMatrix: Matrix = [
      ["Stadt", "Auslastung", "Jahresumsatz", "Umsatz pro Nacht"],
      ["Ostsee", 62, 32000, 145],
    ];
    const mapping = suggestMapping(locMatrix[0], LOCATION_IMPORT_FIELDS);
    const { rows, errors } = buildLocationsFromMatrix(locMatrix, mapping);
    expect(errors.length).toBe(0);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Ostsee");
    expect(rows[0].occupancyPct).toBe(62);
    expect(rows[0].avgAnnualRevenue).toBe(32000);
  });
});

describe("JSON-Export und Re-Import (Testfall 18)", () => {
  it("exportiert und importiert eine Analyse ohne Datenverlust", () => {
    const p = emptyProperty("Roundtrip-Objekt");
    p.areaSqm = 65;
    p.energy.energyClass = "C";
    p.pricing = { mode: "perBed", nightPrice: 32, rentedDaysPerMonth: 15 };
    p.costs.useManualElectricity = true;
    p.costs.electricityManual = 210;
    const l = emptyLocation("Roundtrip-Standort");
    l.occupancyPct = 55;

    const file = buildAnalysisFile([p], [l], "object");
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.calcVersion.length).toBeGreaterThan(0);
    expect(file.exportedAt.length).toBeGreaterThan(0);
    expect(file.assumptions.daysPerMonth).toBe(30);

    const parsed = parseAnalysisFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    expect(parsed.data!.objects.length).toBe(1);
    expect(parsed.data!.objects[0]).toEqual(p);
    expect(parsed.data!.locations[0]).toEqual(l);
    expect(parsed.data!.analysisMode).toBe("object");
  });

  it("lehnt ungültige Dateien mit verständlicher Fehlermeldung ab", () => {
    expect(parseAnalysisFile("kein json").ok).toBe(false);
    const invalid = parseAnalysisFile(
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, objects: "falsch" })
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBeTruthy();
  });
});

describe("Schema-Migration (Testfall 19)", () => {
  it("lehnt Dateien ohne Schema-Version ab", () => {
    const result = parseAnalysisFile(JSON.stringify({ objects: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Schema-Version/);
  });

  it("lehnt neuere Schema-Versionen mit Hinweis ab", () => {
    const file = buildAnalysisFile([], [], "object");
    const newer = { ...file, schemaVersion: SCHEMA_VERSION + 1 };
    const result = parseAnalysisFile(JSON.stringify(newer));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Schema-Version/);
  });

  it("akzeptiert die aktuelle Schema-Version", () => {
    const file = buildAnalysisFile([], [], "location");
    const result = parseAnalysisFile(JSON.stringify(file));
    expect(result.ok).toBe(true);
  });
});
