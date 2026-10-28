"use client";

import { useEffect, useState } from "react";
import type { PropertyInput } from "@/lib/types/analysis";
import type { DerivedProperty } from "@/lib/calculations/property-calculations";
import type { ScenarioResult } from "@/lib/calculations/scenarios";
import type { CompanySettings, ReportSettings } from "@/lib/profile/settings";
import { REPORT_SECTIONS } from "@/lib/report/sections";
import { PropertyReport } from "@/components/property-report";
import { Button } from "@/components/ui";

/**
 * Report-Ansicht: Vorschau des Steckbriefs mit temporärer Sektionsauswahl
 * für diesen Ausdruck (ändert das Profil nicht) und "Als PDF speichern"
 * über window.print(). Der Dateiname kommt aus document.title
 * (Objektname und Datum), für die Dauer des Drucks gesetzt.
 */
export function ReportPreview({
  property,
  derived,
  scenarios,
  company,
  report,
  onClose,
}: {
  property: PropertyInput;
  derived: DerivedProperty;
  scenarios: ScenarioResult[] | null;
  company: CompanySettings;
  report: ReportSettings;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(() => [
    ...report.selectedSections,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  const print = () => {
    const previous = document.title;
    const date = new Date().toISOString().slice(0, 10);
    const name = (property.name || "Objekt").replace(/[\\/:*?"<>|]+/g, "-").trim();
    document.title = `${name} – Objektsteckbrief ${date}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <div
      className="report-preview fixed inset-0 z-50 bg-ink/40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Report-Vorschau"
    >
      <div className="report-controls sticky top-0 z-10 bg-card border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-display text-sm tracking-[0.12em] uppercase text-ink">
            Report
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {REPORT_SECTIONS.map((section) => (
              <label key={section.id} className="flex items-center gap-1.5 text-ink">
                <input
                  type="checkbox"
                  checked={selected.includes(section.id)}
                  onChange={() => toggle(section.id)}
                  className="accent-[var(--taupe)]"
                />
                {section.label}
              </label>
            ))}
          </div>
          <span className="text-xs text-muted">
            Abwahl gilt nur für diesen Ausdruck; dauerhaft im Profil.
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="primary" onClick={print}>
              Als PDF speichern
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="report-sheet bg-white shadow-lg rounded-md">
          <PropertyReport
            property={property}
            derived={derived}
            scenarios={scenarios}
            company={company}
            report={report}
            selectedSections={selected}
          />
        </div>
      </div>
    </div>
  );
}
