/**
 * Stabile Kennungen der Report-Sektionen. Werden in profiles.settings.report
 * gespeichert; Bezeichnungen dürfen sich ändern, Kennungen nicht.
 */
export const REPORT_SECTIONS = [
  { id: "basics", label: "Grunddaten" },
  { id: "revenue", label: "Umsatz" },
  { id: "costs", label: "Monatliche Kosten" },
  { id: "results", label: "Ergebnis und Wirtschaftlichkeit" },
  { id: "scenarios", label: "Szenarien" },
] as const;

export type ReportSectionId = (typeof REPORT_SECTIONS)[number]["id"];

export const ALL_REPORT_SECTION_IDS: ReportSectionId[] = REPORT_SECTIONS.map(
  (s) => s.id
);

export const DEFAULT_DISCLAIMER =
  "Alle Werte beruhen auf den eingegebenen Daten und dokumentierten Annahmen; keine Anlage- oder Rechtsberatung.";

/** Unbekannte Kennungen entfernen, Reihenfolge der Sektionen beibehalten. */
export function normalizeSectionIds(ids: readonly string[]): ReportSectionId[] {
  const set = new Set(ids);
  return ALL_REPORT_SECTION_IDS.filter((id) => set.has(id));
}
