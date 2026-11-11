"use client";

import Link from "next/link";
import type { PropertyInput } from "@/lib/types/analysis";
import { useAnalysis } from "@/components/providers";
import { PropertyForm } from "@/components/property-form";
import { StickyKpiBar } from "@/components/sticky-kpi-bar";

/**
 * Detailansicht eines Objekts: Zurück-Link, Objektname, das bestehende
 * Formular (mit Kennzahlenleiste und Reitern inklusive "Pricing-Tool") und
 * die fixierte Kennzahlenleiste für dieses Objekt. Keine Vergleichsfunktionen.
 */
export function ObjectDetail({
  object,
  onBack,
}: {
  object: PropertyInput;
  /** Zurück zur Übersicht (nach dem Entfernen). */
  onBack: () => void;
}) {
  const { dispatch } = useAnalysis();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/object-analysis"
          className="text-sm underline underline-offset-2 text-taupe hover:text-ink"
        >
          ← Zurück zur Übersicht
        </Link>
        <h2 className="font-display text-xl tracking-wide text-ink truncate">
          {object.name.trim() || "Ohne Namen"}
        </h2>
      </div>

      <PropertyForm
        property={object}
        onChange={(next) => dispatch({ type: "updateObject", object: next })}
        onRemove={() => {
          dispatch({ type: "removeObject", id: object.id });
          onBack();
        }}
        onDuplicate={() => dispatch({ type: "duplicateObject", id: object.id })}
      />

      {/* Platzhalter, damit die fixierte Leiste keine Inhalte verdeckt. */}
      <div aria-hidden="true" className="h-28" />
      <StickyKpiBar properties={[object]} activeId={object.id} onSelect={() => {}} />
    </div>
  );
}
