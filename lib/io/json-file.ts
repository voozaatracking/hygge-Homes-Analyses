import { z } from "zod";
import type {
  AnalysisFile,
  AnalysisMode,
  LocationInput,
  PropertyInput,
} from "@/lib/types/analysis";
import {
  assumptionsSnapshot,
  CALC_VERSION,
  SCHEMA_VERSION,
} from "@/lib/config/assumptions";
import { ENERGY_CLASSES } from "@/lib/types/analysis";

const nullableNumber = z.number().nullable();

const costItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: nullableNumber,
});

const propertySchema = z.object({
  id: z.string(),
  name: z.string(),
  listingUrl: z.string().default(""),
  address: z.string().default(""),
  areaSqm: nullableNumber,
  bedrooms: nullableNumber,
  beds: nullableNumber,
  energy: z.object({
    consumption: nullableNumber,
    energyClass: z
      .enum(ENERGY_CLASSES as [string, ...string[]])
      .nullable(),
  }),
  pricing: z.object({
    mode: z.enum(["perUnit", "perBed"]),
    nightPrice: nullableNumber,
    rentedDaysPerMonth: nullableNumber,
  }),
  costs: z.object({
    coldRent: nullableNumber,
    internet: nullableNumber,
    ancillary: nullableNumber,
    streaming: nullableNumber,
    gez: nullableNumber,
    gema: nullableNumber,
    laundry: nullableNumber,
    electricityManual: nullableNumber,
    useManualElectricity: z.boolean(),
    cleaningManual: nullableNumber,
    useManualCleaning: z.boolean(),
    extras: z.array(costItemSchema),
  }),
  electricityAssumptions: z.object({
    pricePerKwh: nullableNumber,
    surchargePct: nullableNumber,
  }),
  cleaningAssumptions: z.object({
    minutesPerSqm: nullableNumber,
    hourlyWage: nullableNumber,
    changesPerMonth: nullableNumber,
  }),
  marketRentPerSqm: nullableNumber,
  highlighted: z.boolean().default(false),
});

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataSource: z.string().default(""),
  collectedAt: z.string().default(""),
  occupancyPct: nullableNumber,
  rentedDaysPerMonth: nullableNumber,
  avgAnnualRevenue: nullableNumber,
  avgRevenuePerNight: nullableNumber,
  avgCleaningCost: nullableNumber,
  extraPersonCost: nullableNumber,
  sourceUrl: z.string().default(""),
  notes: z.string().default(""),
  highlighted: z.boolean().default(false),
});

const analysisFileSchema = z.object({
  schemaVersion: z.number(),
  calcVersion: z.string(),
  exportedAt: z.string(),
  analysisMode: z.enum(["object", "location"]),
  objects: z.array(propertySchema),
  locations: z.array(locationSchema),
  assumptions: z.record(z.string(), z.unknown()),
});

/** Baut die vollständige, versionierte Export-Datei. */
export function buildAnalysisFile(
  objects: PropertyInput[],
  locations: LocationInput[],
  analysisMode: AnalysisMode
): AnalysisFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    calcVersion: CALC_VERSION,
    exportedAt: new Date().toISOString(),
    analysisMode,
    objects,
    locations,
    assumptions: assumptionsSnapshot(),
  };
}

export interface ParseResult {
  ok: boolean;
  data?: AnalysisFile;
  error?: string;
}

/**
 * Migriert ältere Schema-Versionen auf die aktuelle Version.
 * Version 1 ist die erste Version, ältere Dateien existieren nicht.
 * Neuere Versionen werden mit verständlicher Meldung abgelehnt.
 */
function migrate(raw: { schemaVersion?: unknown }): {
  ok: boolean;
  data?: unknown;
  error?: string;
} {
  const version = raw.schemaVersion;
  if (typeof version !== "number") {
    return {
      ok: false,
      error:
        "Die Datei enthält keine gültige Schema-Version und kann nicht importiert werden.",
    };
  }
  if (version === SCHEMA_VERSION) return { ok: true, data: raw };
  if (version < SCHEMA_VERSION) {
    // Platz für künftige Migrationen (z. B. Version 1 → 2).
    return { ok: true, data: raw };
  }
  return {
    ok: false,
    error: `Die Datei verwendet Schema-Version ${version}, diese Anwendung unterstützt maximal Version ${SCHEMA_VERSION}. Bitte die Anwendung aktualisieren.`,
  };
}

/** Parst und validiert eine JSON-Analyse-Datei. Ungültige Dateien werden abgelehnt. */
export function parseAnalysisFile(jsonText: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: "Die Datei ist kein gültiges JSON und kann nicht gelesen werden.",
    };
  }
  if (typeof raw !== "object" || raw == null) {
    return { ok: false, error: "Die Datei hat kein gültiges Analyse-Format." };
  }

  const migrated = migrate(raw as { schemaVersion?: unknown });
  if (!migrated.ok) return { ok: false, error: migrated.error };

  const parsed = analysisFileSchema.safeParse(migrated.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Die Datei entspricht nicht dem erwarteten Analyse-Format (${first?.path.join(".") || "Struktur"}: ${first?.message || "ungültig"}).`,
    };
  }
  // Zod validiert assumptions nur generisch (informativer Snapshot),
  // daher die doppelte Assertion auf den konkreten Dateityp.
  return { ok: true, data: parsed.data as unknown as AnalysisFile };
}
