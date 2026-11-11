"use client";

import type { SectionProps } from "@/components/property-form/types";
import { SectionTitle, Notice } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtNum } from "@/lib/format";
import {
  PRICING_BASE_SURCHARGE_EUR,
  PRICING_GAP_MAX_NIGHTS,
  PRICING_LAST_MINUTE_MAX_NIGHTS,
  PRICING_MARKUP_PCT,
  PRICING_MIN_STAY_NIGHTS,
} from "@/lib/config/assumptions";

/**
 * Reiter "Pricing-Tool": reine Empfehlungsansicht mit zwei berechneten
 * Preisen (lib/calculations/pricing.ts) und festen Einstellungsvorschlägen.
 * Nichts hiervon fließt in die Berechnung ein.
 */
export function PricingToolSection({ pricing, active }: SectionProps) {
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Diese Werte kannst du in dein Pricing-Tool übernehmen. Sie beeinflussen die Berechnung nicht.">
        Empfehlungen für dein Pricing-Tool
      </SectionTitle>

      {pricing.breakEven.price == null ? (
        <Notice kind="info">
          {pricing.breakEven.note ?? "Mindestpreis und Basispreis sind noch nicht berechenbar."}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricsCard
          label="Mindestpreis"
          value={fmtEur(pricing.minPrice, 0)}
          sub={`Break-even-Preis je Nacht zzgl. ${fmtNum(PRICING_MARKUP_PCT, 0)} %${
            pricing.breakEven.price != null
              ? ` (Break-even ${fmtEur(pricing.breakEven.price)} bei ${fmtNum(pricing.referenceDays, 0)} Nächten/Monat)`
              : ""
          }`}
        />
        <MetricsCard
          label="Basispreis"
          value={fmtEur(pricing.basePrice, 0)}
          sub={`Mindestpreis zzgl. ${fmtNum(PRICING_BASE_SURCHARGE_EUR, 0)} € je Nacht`}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Nachtpreis in der Einheit der Preiseingabe (je Unterkunft oder je Bett),
        auf volle Euro aufgerundet.
      </p>

      <div className="mt-6 border border-line rounded-xl p-4 bg-card-soft/40 space-y-2">
        <h4 className="text-sm font-medium text-ink">Empfohlene Einstellungen</h4>
        <ul className="text-sm text-ink list-disc pl-5 space-y-1">
          <li>Mindestaufenthalt: {fmtNum(PRICING_MIN_STAY_NIGHTS, 0)} Nächte</li>
          <li>
            Buchungslücken von 1 bis {fmtNum(PRICING_GAP_MAX_NIGHTS, 0)} Nächten:
            Buchung ab 1 Nacht zulassen
          </li>
          <li>
            Last-Minute (1 bis {fmtNum(PRICING_LAST_MINUTE_MAX_NIGHTS, 0)} Nächte vor
            Anreise): Buchung ab 1 Nacht zulassen
          </li>
        </ul>
      </div>
    </div>
  );
}
