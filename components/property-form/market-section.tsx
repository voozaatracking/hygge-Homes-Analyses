"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField } from "@/components/fields";
import { SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";

export function MarketSection({
  property,
  derived,
  errors,
  missing,
  set,
  active,
}: SectionProps) {
  // Marktpreis
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Der Vergleichswert wird manuell recherchiert und eingegeben. Es findet keine automatische Datenübernahme statt.">
        Marktpreis
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Durchschnittlicher Markt-Mietpreis"
          unit="€/qm"
          value={property.marketRentPerSqm}
          onChange={(v) => set((d) => (d.marketRentPerSqm = v))}
          error={errors.marketRentPerSqm}
          hint={
            <a
              href="https://www.immobilienscout24.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-taupe hover:text-ink"
            >
              Marktpreis auf ImmoScout recherchieren
            </a>
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MetricsCard
          label="Miete pro qm"
          value={fmtEur(derived.rentPerSqm)}
          sub={missing.rentPerSqm ?? "Kaltmiete / Gesamtfläche"}
        />
        <MetricsCard
          label="Mietpreis-Abweichung zum Markt"
          value={
            derived.marketDeviation != null
              ? fmtPct(derived.marketDeviation)
              : "nicht berechenbar"
          }
          sub={
            derived.marketDeviation != null
              ? "(Miete pro qm − Marktpreis) / Marktpreis"
              : (missing.marketDeviation ?? "Dafür werden Kaltmiete, Fläche und ein Marktpreis größer 0 benötigt.")
          }
          tone={
            derived.marketDeviation == null
              ? "neutral"
              : derived.marketDeviation <= 0
                ? "positive"
                : "negative"
          }
        />
      </div>

      {/* Investition */}
      <div className="mt-6">
        <SectionTitle hint="Einmalige Kosten vor dem Start. Grundlage der Amortisationsrechnung im Ergebnis-Tab.">
          Investition
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <NumberField
            label="Startinvestition (einmalig)"
            unit="€"
            value={property.startInvestment}
            onChange={(v) => set((d) => (d.startInvestment = v))}
            error={errors.startInvestment}
            help="Einrichtung, Kaution, Erstausstattung."
          />
          <MetricsCard
            label="Amortisation"
            value={
              derived.paybackMonths != null
                ? `${fmtNum(derived.paybackMonths, 1)} Monate`
                : "nicht berechenbar"
            }
            sub={
              derived.paybackMonths != null
                ? "Startinvestition / Gewinn pro Monat"
                : (missing.payback ?? "Dafür werden eine Startinvestition und ein positiver Monatsgewinn benötigt.")
            }
          />
        </div>
      </div>
    </div>

  );
}
