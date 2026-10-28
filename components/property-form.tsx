"use client";

import { useMemo, useState } from "react";
import type { PropertyInput } from "@/lib/types/analysis";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { deriveScenarios } from "@/lib/calculations/scenarios";
import { ReportPreview } from "@/components/report-preview";
import { useAnalysis } from "@/components/providers";
import { validateProperty } from "@/lib/validation/rules";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import { TextField } from "@/components/fields";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import type { ProfitTone } from "@/components/property-form/types";
import { defaultProfileSettings } from "@/lib/profile/settings";

/** Ohne geladenes Profil (z. B. lokal ohne Supabase) gelten die Defaults. */
const defaultProfile = { settings: defaultProfileSettings() };
import { BasicsSection } from "@/components/property-form/basics-section";
import { EnergySection } from "@/components/property-form/energy-section";
import { PricingSection } from "@/components/property-form/pricing-section";
import { CostsSection } from "@/components/property-form/costs-section";
import { CostAssumptionsSection } from "@/components/property-form/cost-assumptions-section";
import { ResultsSection } from "@/components/property-form/results-section";
import { MarketSection } from "@/components/property-form/market-section";
import { MetricsSection } from "@/components/property-form/metrics-section";
import { ScoreSection } from "@/components/property-form/score-section";

const TABS = [
  { key: "basics", label: "Grunddaten & Energie" },
  { key: "pricing", label: "Preis & Auslastung" },
  { key: "costs", label: "Kosten" },
  { key: "market", label: "Markt & Investition" },
  { key: "results", label: "Ergebnis" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PropertyForm({
  property,
  onChange,
  onRemove,
  onDuplicate,
}: {
  property: PropertyInput;
  onChange: (next: PropertyInput) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("basics");
  const { deriveContext, profile } = useAnalysis();
  const derived = useMemo(
    () => deriveProperty(property, deriveContext),
    [property, deriveContext]
  );
  const scenarios = useMemo(
    () => deriveScenarios(property, deriveContext),
    [property, deriveContext]
  );
  const errors = useMemo(() => validateProperty(property), [property]);

  const set = (updater: (draft: PropertyInput) => void) => {
    const next = structuredClone(property);
    updater(next);
    onChange(next);
  };

  const profitTone: ProfitTone =
    derived.monthlyProfit == null
      ? "neutral"
      : derived.monthlyProfit >= 0
        ? "positive"
        : "negative";

  // Gemeinsame Props der Sektionen; `active` setzt der Wrapper je Tab.
  const section = { property, derived, errors, set, scenarios, profitTone, active: false };

  return (
    <Card className="space-y-8">
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          <TextField
            label="Objektname"
            value={property.name}
            onChange={(v) => set((d) => (d.name = v))}
            placeholder="z. B. Apartment Altstadt"
          />
        </div>
        <div className="flex gap-2 pt-6">
          <Button variant="ghost" onClick={() => setReportOpen(true)}>
            Report / PDF
          </Button>
          <Button variant="ghost" onClick={onDuplicate}>
            Duplizieren
          </Button>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            Entfernen
          </Button>
        </div>
      </div>
      {reportOpen ? (
        <ReportPreview
          property={property}
          derived={derived}
          scenarios={scenarios}
          company={(profile ?? defaultProfile).settings.company}
          report={(profile ?? defaultProfile).settings.report}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      {/* Kennzahlen-Leiste: immer sichtbar, füllt sich mit den Eingaben */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricsCard
          label="Umsatz / Monat"
          value={fmtEur(derived.monthlyRevenue)}
        />
        <MetricsCard
          label="Kosten / Monat"
          value={fmtEur(derived.totalMonthlyCosts)}
        />
        <MetricsCard
          label="Gewinn / Monat"
          value={fmtEur(derived.monthlyProfit)}
          tone={profitTone}
        />
        <MetricsCard
          label="Break-even"
          value={
            derived.breakEvenNights != null
              ? `${fmtNum(derived.breakEvenNights, 1)} Nächte`
              : "–"
          }
          tone={
            derived.breakEvenNights == null
              ? "neutral"
              : derived.breakEvenNights > 30
                ? "negative"
                : "positive"
          }
        />
        <MetricsCard
          label="Bewertung"
          value={
            derived.score.complete && derived.score.total != null
              ? (derived.score.label ?? fmtPct(derived.score.total))
              : "unvollständig"
          }
          tone={
            derived.score.complete && derived.score.total != null
              ? derived.score.total >= 0.8
                ? "positive"
                : derived.score.total < 0.4
                  ? "negative"
                  : "neutral"
              : "neutral"
          }
        />
      </div>

      {/* Tab-Navigation für die Eingabe-Kategorien */}
      <div
        className="flex flex-wrap gap-2 border-b border-line pb-3"
        role="tablist"
        aria-label="Eingabe-Kategorien"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              activeTab === tab.key
                ? "bg-ink text-white border-ink"
                : "bg-card text-muted border-line hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <BasicsSection {...section} active={activeTab === "basics"} />
      <EnergySection {...section} active={activeTab === "basics"} />
      <PricingSection {...section} active={activeTab === "pricing"} />

      {/* Kosten */}
      <div className={activeTab === "costs" ? undefined : "hidden"}>
        <CostsSection {...section} active={activeTab === "costs"} />
        <CostAssumptionsSection {...section} active={activeTab === "costs"} />
      </div>

      <ResultsSection {...section} active={activeTab === "results"} />
      <MarketSection {...section} active={activeTab === "market"} />
      <MetricsSection {...section} active={activeTab === "results"} />
      <ScoreSection {...section} active={activeTab === "results"} />

      <ConfirmDialog
        open={confirmRemove}
        title="Objekt entfernen?"
        message={`"${property.name || "Dieses Objekt"}" wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Entfernen"
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
