"use client";

import { useEffect, useMemo, useState } from "react";
import type { PropertyInput } from "@/lib/types/analysis";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { deriveScenarios } from "@/lib/calculations/scenarios";
import { PropertyReport } from "@/components/property-report";
import { validateProperty } from "@/lib/validation/rules";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import { TextField } from "@/components/fields";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import type { ProfitTone } from "@/components/property-form/types";
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
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("basics");
  const derived = useMemo(() => deriveProperty(property), [property]);
  const scenarios = useMemo(() => deriveScenarios(property), [property]);
  const errors = useMemo(() => validateProperty(property), [property]);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const timer = window.setTimeout(() => window.print(), 60);
    return () => {
      window.removeEventListener("afterprint", done);
      window.clearTimeout(timer);
    };
  }, [printing]);

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
          <Button variant="ghost" onClick={() => setPrinting(true)}>
            Als PDF exportieren
          </Button>
          <Button variant="ghost" onClick={onDuplicate}>
            Duplizieren
          </Button>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            Entfernen
          </Button>
        </div>
      </div>
      {printing ? (
        <PropertyReport
          property={property}
          derived={derived}
          scenarios={scenarios}
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
