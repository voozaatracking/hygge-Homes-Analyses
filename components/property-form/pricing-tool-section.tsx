"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField } from "@/components/fields";
import { SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtNum } from "@/lib/format";
import { PRICING_DEFAULTS } from "@/lib/config/assumptions";

/**
 * Reiter "Pricing-Tool": Merkwerte zum Übertragen in ein externes Pricing-Tool.
 * Sie beeinflussen Umsatz, Kosten, Gewinn, Szenarien und Bewertung nicht;
 * einzige Berechnung ist der Mindestpreis aus lib/calculations/pricing.ts.
 */
export function PricingToolSection({
  property,
  errors,
  set,
  pricing,
  active,
}: SectionProps) {
  const t = property.pricingTool;
  const ownBelowBreakEven =
    t.ownMinPrice != null &&
    pricing.breakEvenPlanned.price != null &&
    t.ownMinPrice < pricing.breakEvenPlanned.price;

  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Diese Werte dienen als Vorlage für dein Pricing-Tool und beeinflussen die Berechnung nicht.">
        Annahmen für das Pricing-Tool
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Bezugsauslastung für den Mindestpreis"
          unit="Nächte/Monat"
          value={t.referenceDays}
          onChange={(v) => set((d) => (d.pricingTool.referenceDays = v))}
          error={errors["pricingTool-referenceDays"]}
          placeholder={
            property.pricing.rentedDaysPerMonth != null
              ? `geplant: ${fmtNum(property.pricing.rentedDaysPerMonth, 0)}`
              : undefined
          }
          help="Leer lassen, um die geplante Auslastung des Objekts (vermietete Tage pro Monat) zu verwenden."
        />
        <NumberField
          label="Aufschlag auf den Break-even-Preis"
          unit="%"
          value={t.markupPct}
          onChange={(v) => set((d) => (d.pricingTool.markupPct = v))}
          error={errors["pricingTool-markupPct"]}
          placeholder={`Standard: ${fmtNum(PRICING_DEFAULTS.markupPct, 0)}`}
          help="Standardwert aus dem Profil; leer bedeutet Standard."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricsCard
          label="Mindestpreis laut Berechnung, bei geplanter Auslastung"
          value={fmtEur(pricing.minPricePlanned)}
          sub={
            pricing.breakEvenPlanned.price != null
              ? `Break-even-Preis ${fmtEur(pricing.breakEvenPlanned.price)} zzgl. ${fmtNum(pricing.markupPct, 0)} % bei ${fmtNum(pricing.referenceDays, 0)} Nächten/Monat`
              : (pricing.breakEvenPlanned.note ?? undefined)
          }
        />
        <MetricsCard
          label="Mindestpreis laut Berechnung, bei voller Auslastung"
          value={fmtEur(pricing.minPriceFull)}
          sub={
            pricing.breakEvenFull.price != null
              ? `Break-even-Preis ${fmtEur(pricing.breakEvenFull.price)} zzgl. ${fmtNum(pricing.markupPct, 0)} % bei 30 Nächten/Monat`
              : (pricing.breakEvenFull.note ?? undefined)
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Mindestpreis, eigener Wert (optional)"
          unit="€"
          value={t.ownMinPrice}
          onChange={(v) => set((d) => (d.pricingTool.ownMinPrice = v))}
          error={errors["pricingTool-ownMinPrice"]}
          hint={
            ownBelowBreakEven
              ? `Liegt unter dem Break-even-Preis bei geplanter Auslastung (${fmtEur(pricing.breakEvenPlanned.price)}).`
              : null
          }
        />
        <NumberField
          label="Basispreis"
          unit="€"
          value={t.basePrice}
          onChange={(v) => set((d) => (d.pricingTool.basePrice = v))}
          error={errors["pricingTool-basePrice"]}
          placeholder={
            property.pricing.nightPrice != null
              ? `Nachtpreis: ${fmtNum(property.pricing.nightPrice, 2)}`
              : undefined
          }
          help="Leer lassen, um den Nachtpreis des Objekts als Orientierung zu nutzen."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Mindestaufenthalt unter der Woche"
          unit="Nächte"
          value={t.minStayWeekday}
          onChange={(v) => set((d) => (d.pricingTool.minStayWeekday = v))}
          error={errors["pricingTool-minStayWeekday"]}
        />
        <NumberField
          label="Mindestaufenthalt am Wochenende"
          unit="Nächte"
          value={t.minStayWeekend}
          onChange={(v) => set((d) => (d.pricingTool.minStayWeekend = v))}
          error={errors["pricingTool-minStayWeekend"]}
        />
      </div>

      <div className="mt-6 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
        <h4 className="text-sm font-medium text-ink">Buchungslücken</h4>
        <p className="text-xs text-muted">
          Kürzere freie Zeiträume zwischen zwei Buchungen können mit einem
          eigenen Mindestaufenthalt freigegeben werden. Bei 1 ist eine einzelne
          Nacht buchbar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Lücken bis"
            unit="Nächte"
            value={t.gapMaxNights}
            onChange={(v) => set((d) => (d.pricingTool.gapMaxNights = v))}
            error={errors["pricingTool-gapMaxNights"]}
            placeholder={`Standard: ${fmtNum(PRICING_DEFAULTS.gapMaxNights, 0)}`}
          />
          <NumberField
            label="Mindestaufenthalt in Lücken"
            unit="Nächte"
            value={t.gapMinStay}
            onChange={(v) => set((d) => (d.pricingTool.gapMinStay = v))}
            error={errors["pricingTool-gapMinStay"]}
            placeholder={`Standard: ${fmtNum(PRICING_DEFAULTS.gapMinStay, 0)}`}
          />
        </div>
      </div>

      <div className="mt-4 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
        <h4 className="text-sm font-medium text-ink">Last-Minute</h4>
        <p className="text-xs text-muted">
          Kurz vor Anreise gilt ein eigener Mindestaufenthalt. Bei 1 ist eine
          einzelne Nacht buchbar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Ab"
            unit="Tage vor Anreise"
            value={t.lastMinuteDays}
            onChange={(v) => set((d) => (d.pricingTool.lastMinuteDays = v))}
            error={errors["pricingTool-lastMinuteDays"]}
            placeholder={`Standard: ${fmtNum(PRICING_DEFAULTS.lastMinuteDays, 0)}`}
          />
          <NumberField
            label="Mindestaufenthalt Last-Minute"
            unit="Nächte"
            value={t.lastMinuteMinStay}
            onChange={(v) => set((d) => (d.pricingTool.lastMinuteMinStay = v))}
            error={errors["pricingTool-lastMinuteMinStay"]}
            placeholder={`Standard: ${fmtNum(PRICING_DEFAULTS.lastMinuteMinStay, 0)}`}
          />
        </div>
      </div>
    </div>
  );
}
