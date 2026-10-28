import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyReport } from "@/components/property-report";
import { ReportHeader } from "@/components/report/report-header";
import { ReportFooter } from "@/components/report/report-footer";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { deriveScenarios } from "@/lib/calculations/scenarios";
import {
  defaultProfileSettings,
  parseProfileSettings,
  validateProfileSettings,
} from "@/lib/profile/settings";
import { ALL_REPORT_SECTION_IDS, DEFAULT_DISCLAIMER } from "@/lib/report/sections";
import { sampleProperties } from "@/lib/sample-data";

function render(
  options: {
    company?: Partial<ReturnType<typeof defaultProfileSettings>["company"]>;
    report?: Partial<ReturnType<typeof defaultProfileSettings>["report"]>;
    selectedSections?: string[];
  } = {}
) {
  const property = sampleProperties()[0];
  const settings = defaultProfileSettings();
  const company = { ...settings.company, ...options.company };
  const report = { ...settings.report, ...options.report };
  return renderToStaticMarkup(
    createElement(PropertyReport, {
      property,
      derived: deriveProperty(property),
      scenarios: deriveScenarios(property),
      company,
      report,
      selectedSections: options.selectedSections,
    })
  );
}

describe("Gebrandeter Report", () => {
  it("rendert mit leeren Firmendaten ohne Platzhalter und ohne Fehler", () => {
    const html = render();
    expect(html).toContain("Objektsteckbrief");
    expect(html).not.toContain("report-brand");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("report-footer-line\">" + " · ");
    // Fuß enthält Datum und Hinweistext, aber keine leere Kontaktzeile.
    expect(html).toContain("Erstellt am");
    expect(html).toContain(DEFAULT_DISCLAIMER);
    expect((html.match(/report-footer-line/g) ?? []).length).toBe(2);
    // Alle Sektionen vorhanden.
    for (const id of ALL_REPORT_SECTION_IDS) {
      expect(html).toContain(`data-section="${id}"`);
    }
  });

  it("zeigt Firmendaten, Logo und Farben, sobald vorhanden", () => {
    const html = render({
      company: {
        name: "Hygge Homes GmbH",
        street: "Am Sande 1",
        zip: "21335",
        city: "Lüneburg",
        phone: "04131 123",
        registerInfo: "HRB 1234",
        logoDataUrl: "data:image/png;base64,AAAA",
        primaryColor: "#112233",
      },
    });
    expect(html).toContain("Hygge Homes GmbH");
    expect(html).toContain("Am Sande 1, 21335 Lüneburg");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain("--report-primary:#112233");
    expect(html).not.toContain("--report-secondary");
    expect(html).toContain("HRB 1234");
  });

  it("blendet Sektionen über die temporäre Auswahl aus", () => {
    const html = render({ selectedSections: ["basics", "results"] });
    expect(html).toContain('data-section="basics"');
    expect(html).toContain('data-section="results"');
    expect(html).not.toContain('data-section="revenue"');
    expect(html).not.toContain('data-section="costs"');
    expect(html).not.toContain('data-section="scenarios"');
  });

  it("nutzt die Profilauswahl, wenn keine temporäre Auswahl übergeben wird", () => {
    const html = render({ report: { selectedSections: ["costs"] as never } });
    expect(html).toContain('data-section="costs"');
    expect(html).not.toContain('data-section="basics"');
  });

  it("respektiert die Kopf- und Fußschalter", () => {
    const html = render({
      company: { logoDataUrl: "data:image/png;base64,AAAA", phone: "1" },
      report: { showLogo: false, showDate: false, showDisclaimer: false, showCompanyFooter: false },
    });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Stand ");
    expect(html).not.toContain("report-footer");
  });
});

describe("Kopf und Fuß als eigenständige Komponenten", () => {
  it("lassen sich mit eigenem Titel wiederverwenden", () => {
    const settings = defaultProfileSettings();
    const header = renderToStaticMarkup(
      createElement(ReportHeader, {
        company: settings.company,
        report: settings.report,
        title: "Lüneburg",
        subtitle: "Standortsteckbrief",
        lines: ["", null, "Quelle: AirDNA"],
      })
    );
    expect(header).toContain("Lüneburg");
    expect(header).toContain("Standortsteckbrief");
    expect(header).toContain("Quelle: AirDNA");
    const footer = renderToStaticMarkup(
      createElement(ReportFooter, {
        company: settings.company,
        report: { ...settings.report, showDate: false, showDisclaimer: false },
      })
    );
    expect(footer).toBe("");
  });
});

describe("Report-Einstellungen (Schema)", () => {
  it("liefert Defaults mit allen Sektionen", () => {
    const r = parseProfileSettings({}).report;
    expect(r.selectedSections).toEqual(ALL_REPORT_SECTION_IDS);
    expect(r.showLogo).toBe(true);
    expect(r.showCompanyFooter).toBe(true);
    expect(r.showDate).toBe(true);
    expect(r.showDisclaimer).toBe(true);
    expect(r.disclaimerText).toBe(DEFAULT_DISCLAIMER);
  });

  it("entfernt unbekannte Sektionskennungen und behält die Reihenfolge", () => {
    const r = parseProfileSettings({
      report: { selectedSections: ["scenarios", "unbekannt", "basics"] },
    }).report;
    expect(r.selectedSections).toEqual(["basics", "scenarios"]);
  });

  it("lehnt falsche Typen ab", () => {
    expect(validateProfileSettings({ report: { showLogo: "ja" } }).ok).toBe(false);
    expect(validateProfileSettings({ report: { selectedSections: "alle" } }).ok).toBe(false);
    expect(validateProfileSettings({ report: { disclaimerText: "x".repeat(2001) } }).ok).toBe(false);
  });
});
