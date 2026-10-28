"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField, RadioGroup } from "@/components/fields";
import { SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtPct } from "@/lib/format";

export function PricingSection({
  property,
  derived,
  errors,
  set,
  missing,
  active,
  }: SectionProps) {
  // Preis und Auslastung
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Standardlogik: 30 Tage pro Monat, 12 Monate pro Jahr.">
        Nachtpreis und Auslastung
      </SectionTitle>
      <div className="space-y-4">
        <RadioGroup
          legend="Worauf bezieht sich der eingegebene Nachtpreis?"
          value={property.pricing.mode}
          onChange={(v) =>
            set((d) => (d.pricing.mode = v as "perUnit" | "perBed"))
          }
          options={[
            {
              value: "perUnit",
              label: "Nachtpreis für die gesamte Unterkunft",
            },
            { value: "perBed", label: "Nachtpreis pro Bett" },
          ]}
          help="Bei 'pro Bett' gilt intern: effektiver Nachtpreis der Unterkunft = Preis pro Bett × Anzahl Betten."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label={
              property.pricing.mode === "perBed"
                ? "Nachtpreis pro Bett"
                : "Nachtpreis für die gesamte Unterkunft"
            }
            unit="€"
            value={property.pricing.nightPrice}
            onChange={(v) => set((d) => (d.pricing.nightPrice = v))}
            error={errors.nightPrice}
          />
          <NumberField
            label="Auslastung: vermietete Tage pro Monat"
            unit="Tage"
            value={property.pricing.rentedDaysPerMonth}
            onChange={(v) => set((d) => (d.pricing.rentedDaysPerMonth = v))}
            error={errors.rentedDaysPerMonth}
            help="0 bis 30 Tage. Die Auslastungsquote wird daraus berechnet: Tage / 30."
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            label="Effektiver Nachtpreis der Unterkunft"
            value={fmtEur(derived.effectiveNightPrice)}
            sub={missing.effectiveNightPrice ?? undefined}
            source={
              derived.effectiveNightPrice == null
                ? undefined
                : property.pricing.mode === "perBed"
                  ? "derived"
                  : "manual"
            }
          />
          <MetricsCard
            label="Nachtpreis pro Bett"
            value={fmtEur(derived.pricePerBed)}
            source={
              derived.pricePerBed == null
                ? undefined
                : property.pricing.mode === "perBed"
                  ? "manual"
                  : "derived"
            }
          />
          <MetricsCard
            label="Auslastungsquote"
            value={fmtPct(derived.occupancyRate)}
            sub={missing.occupancyRate ?? "vermietete Tage / 30"}
          />
          <MetricsCard
            label="Mindestpreis pro Nacht bei 100 % Auslastung"
            value={fmtEur(derived.minPriceAtFullOccupancy)}
            sub={missing.monthlyRevenue ?? "Umsatz pro Monat / 30"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricsCard
            label="Umsatz pro Monat"
            value={fmtEur(derived.monthlyRevenue)}
            sub={missing.monthlyRevenue ?? "effektiver Nachtpreis × vermietete Tage"}
          />
          <MetricsCard
            label="Jahresumsatz"
            value={fmtEur(derived.annualRevenue)}
            sub={missing.monthlyRevenue ?? "Umsatz pro Monat × 12"}
          />
        </div>
      </div>
    </div>

  );
}
