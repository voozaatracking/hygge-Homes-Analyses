"use client";

import { useMemo, useState } from "react";
import type { PropertyInput } from "@/lib/types/analysis";
import {
  deriveProperty,
  type DerivedProperty,
} from "@/lib/calculations/property-calculations";
import { fmtEur, fmtNum } from "@/lib/format";

type Tone = "neutral" | "positive" | "negative";

interface KpiItem {
  label: string;
  value: string;
  tone: Tone;
}

const toneClass: Record<Tone, string> = {
  neutral: "text-ink",
  positive: "text-sage",
  negative: "text-brick",
};

function signTone(value: number | null): Tone {
  if (value == null) return "neutral";
  return value >= 0 ? "positive" : "negative";
}

/** Kennzahlen der Leiste, in fester Reihenfolge. Einheiten wie im Formular. */
function buildItems(d: DerivedProperty): KpiItem[] {
  return [
    {
      label: "Flächenproduktivität (Monat)",
      value:
        d.areaProductivityMonthly != null
          ? `${fmtNum(d.areaProductivityMonthly, 2)} €/qm`
          : "–",
      tone: "neutral",
    },
    {
      label: "Flächenproduktivität (Jahr)",
      value:
        d.areaProductivityAnnual != null
          ? `${fmtNum(d.areaProductivityAnnual, 2)} €/qm`
          : "–",
      tone: "neutral",
    },
    {
      label: "Raumproduktivität",
      value:
        d.roomProductivity != null
          ? `${fmtNum(d.roomProductivity, 1)} qm/Raum`
          : "–",
      tone: "neutral",
    },
    {
      label: "Bettenproduktivität",
      value:
        d.bedProductivity != null
          ? `${fmtNum(d.bedProductivity, 1)} qm/Bett`
          : "–",
      tone: "neutral",
    },
    {
      label: "Gesamtkosten (Monat)",
      value: fmtEur(d.totalMonthlyCosts),
      tone: "neutral",
    },
    {
      label: "Gewinn (Monat)",
      value: fmtEur(d.monthlyProfit),
      tone: signTone(d.monthlyProfit),
    },
    {
      label: "Gewinn (Jahr)",
      value: fmtEur(d.annualProfit),
      tone: signTone(d.annualProfit),
    },
  ];
}

/**
 * Immer sichtbare Kennzahlen-Leiste am unteren Bildschirmrand.
 * Zeigt die Live-Kennzahlen des aktiven Objekts und aktualisiert sich
 * bei jeder Eingabe sofort. Das aktive Objekt folgt dem Fokus im
 * jeweiligen Formular und kann zusätzlich über die Auswahl in der
 * Leiste umgeschaltet werden.
 */
export function StickyKpiBar({
  properties,
  activeId,
  onSelect,
}: {
  properties: PropertyInput[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const active =
    properties.find((p) => p.id === activeId) ?? properties[0] ?? null;
  const derived = useMemo(
    () => (active ? deriveProperty(active) : null),
    [active]
  );

  if (!active || !derived) return null;

  const items = buildItems(derived);
  const profitTone = signTone(derived.monthlyProfit);

  return (
    <div
      role="region"
      aria-label="Live-Kennzahlen des ausgewählten Objekts"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-sm shadow-[0_-6px_20px_rgba(59,55,51,0.10)]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.12em] text-muted whitespace-nowrap">
              Live-Kennzahlen
            </span>
            {properties.length > 1 ? (
              <select
                value={active.id}
                onChange={(e) => onSelect(e.target.value)}
                aria-label="Objekt für die Kennzahlen-Leiste wählen"
                className="min-w-0 max-w-[13rem] sm:max-w-[20rem] bg-card border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink focus:border-taupe"
              >
                {properties.map((p, index) => (
                  <option key={p.id} value={p.id}>
                    {p.name.trim() || `Objekt ${index + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-ink truncate">
                {active.name.trim() || "Unbenanntes Objekt"}
              </span>
            )}
            {collapsed ? (
              <span className="hidden md:inline text-sm text-muted whitespace-nowrap">
                Gewinn (Monat):{" "}
                <span className={`tabular font-medium ${toneClass[profitTone]}`}>
                  {fmtEur(derived.monthlyProfit)}
                </span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
            className="shrink-0 text-xs text-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-card-soft transition-colors"
          >
            {collapsed ? "Ausklappen" : "Einklappen"}
          </button>
        </div>

        {!collapsed ? (
          <div className="mt-2 flex items-stretch gap-x-6 overflow-x-auto pb-1">
            {items.map((item) => (
              <div key={item.label} className="shrink-0">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted whitespace-nowrap">
                  {item.label}
                </p>
                <p
                  className={`text-sm font-medium tabular whitespace-nowrap ${toneClass[item.tone]}`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
