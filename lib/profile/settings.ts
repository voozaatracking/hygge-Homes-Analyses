import { z } from "zod";
import {
  CLEANING_DEFAULTS,
  ELECTRICITY_DEFAULTS,
  LISTING_DEFAULTS,
  REVENUE_DEFAULTS,
} from "@/lib/config/assumptions";
import { TOURIST_TAX_MODES } from "@/lib/types/analysis";
import {
  ALL_REPORT_SECTION_IDS,
  DEFAULT_DISCLAIMER,
  normalizeSectionIds,
} from "@/lib/report/sections";

/**
 * profiles.settings: versioniertes JSON nach dem Muster der Analyse-Datei.
 * Jedes Feld hat einen Default, unbekannte Felder werden ignoriert. Dadurch
 * brauchen spätere Erweiterungen keine Datenbank-Migration; nur Rolle, Plan,
 * Gültigkeit und aktiv bleiben echte Spalten.
 */
export const PROFILE_SETTINGS_VERSION = 1;

/** Logo als Data-URL: PNG, JPEG oder SVG, maximal 300 KB (dekodiert). */
export const LOGO_MAX_BYTES = 300 * 1024;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|svg\+xml);base64,([A-Za-z0-9+/]+=*)$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const nullableNumber = z.number().finite().nullable();
const text = z.string().max(500).default("");

const logoSchema = z
  .string()
  .nullable()
  .default(null)
  .refine(
    (value) => {
      if (value == null) return true;
      const match = LOGO_DATA_URL.exec(value);
      if (!match) return false;
      const base64 = match[2];
      const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
      const bytes = (base64.length * 3) / 4 - padding;
      return bytes <= LOGO_MAX_BYTES;
    },
    { message: "Das Logo muss PNG, JPEG oder SVG sein und darf höchstens 300 KB groß sein." }
  );

const colorSchema = z
  .string()
  .nullable()
  .default(null)
  .refine((value) => value == null || HEX_COLOR.test(value), {
    message: "Farben im Format #RRGGBB angeben.",
  });

/** Standardannahmen für neue Objekte; Startwerte identisch mit lib/config/assumptions.ts. */
export const defaultsSchema = z
  .object({
    electricity: z
      .object({
        pricePerKwh: nullableNumber.default(ELECTRICITY_DEFAULTS.pricePerKwh),
        surchargePct: nullableNumber.default(ELECTRICITY_DEFAULTS.surchargePct),
      })
      .prefault({}),
    cleaning: z
      .object({
        minutesPerSqm: nullableNumber.default(CLEANING_DEFAULTS.minutesPerSqm),
        hourlyWage: nullableNumber.default(CLEANING_DEFAULTS.hourlyWage),
        changesPerMonth: nullableNumber.default(CLEANING_DEFAULTS.changesPerMonth),
      })
      .prefault({}),
    revenue: z
      .object({
        platformCommissionPct: nullableNumber.default(
          REVENUE_DEFAULTS.platformCommissionPct
        ),
      })
      .prefault({}),
    touristTax: z
      .object({
        mode: z
          .enum(TOURIST_TAX_MODES as [string, ...string[]])
          .default("perPersonNight"),
        pct: nullableNumber.default(null),
        perPersonNight: nullableNumber.default(null),
      })
      .prefault({}),
    listing: z
      .object({
        changesPerWeek: nullableNumber.default(LISTING_DEFAULTS.changesPerWeek),
      })
      .prefault({}),
  })
  .prefault({});

export const companySchema = z
  .object({
    name: text,
    street: text,
    zip: text,
    city: text,
    country: text,
    phone: text,
    email: text,
    website: text,
    /** Freitext, z. B. HRB-Nummer oder USt-ID. */
    registerInfo: text,
    logoDataUrl: logoSchema,
    primaryColor: colorSchema,
    secondaryColor: colorSchema,
  })
  .prefault({});

export const hqSchema = z
  .object({
    address: text,
    lat: nullableNumber.default(null),
    lng: nullableNumber.default(null),
  })
  .prefault({});

/** Report-Einstellungen: Sektionsauswahl, Kopf- und Fußbestandteile, Hinweistext. */
export const reportSchema = z
  .object({
    /** Kennungen aus lib/report/sections.ts; unbekannte werden entfernt. */
    selectedSections: z
      .array(z.string())
      .default([...ALL_REPORT_SECTION_IDS])
      .transform((ids) => normalizeSectionIds(ids)),
    showLogo: z.boolean().default(true),
    showCompanyFooter: z.boolean().default(true),
    showDate: z.boolean().default(true),
    showDisclaimer: z.boolean().default(true),
    disclaimerText: z.string().max(2000).default(DEFAULT_DISCLAIMER),
  })
  .prefault({});

export const profileSettingsSchema = z.object({
  schemaVersion: z.number().int().default(PROFILE_SETTINGS_VERSION),
  defaults: defaultsSchema,
  company: companySchema,
  hq: hqSchema,
  report: reportSchema,
});

export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type ProfileDefaults = ProfileSettings["defaults"];
export type CompanySettings = ProfileSettings["company"];
export type ReportSettings = ProfileSettings["report"];

/** Vollständige Defaults (leeres Objekt durch das Schema). */
export function defaultProfileSettings(): ProfileSettings {
  return profileSettingsSchema.parse({});
}

/**
 * Tolerantes Parsen für gespeicherte Werte: Fehlende Felder werden mit
 * Defaults gefüllt, unbekannte ignoriert; ein insgesamt ungültiger Wert
 * ergibt die Defaults statt eines Fehlers.
 */
export function parseProfileSettings(raw: unknown): ProfileSettings {
  const result = profileSettingsSchema.safeParse(raw ?? {});
  return result.success ? result.data : defaultProfileSettings();
}

/** Strenges Parsen für Eingaben (PUT /api/profile): liefert Fehler statt Defaults. */
export function validateProfileSettings(
  raw: unknown
): { ok: true; data: ProfileSettings } | { ok: false; error: string } {
  const result = profileSettingsSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  const path = issue?.path.join(".") || "settings";
  return { ok: false, error: `Ungültige Einstellung bei "${path}": ${issue?.message ?? "unbekannter Fehler"}.` };
}
