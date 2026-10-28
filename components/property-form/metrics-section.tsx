"use client";

import type { SectionProps } from "@/components/property-form/types";
import { SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtNum } from "@/lib/format";

export function MetricsSection({
  derived,
  missing,
  active,
  }: SectionProps) {
  // Weitere Kennzahlen
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Produktivitätskennzahlen der Unterkunft. Monats- und Jahreswerte sind entsprechend gekennzeichnet.">
        Weitere Kennzahlen
      </SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricsCard
          label="Flächenproduktivität (Monat)"
          value={
            derived.areaProductivityMonthly != null
              ? `${fmtNum(derived.areaProductivityMonthly, 2)} €/qm`
              : "–"
          }
          sub={missing.areaProductivity ?? "Umsatz pro Monat / Fläche"}
        />
        <MetricsCard
          label="Flächenproduktivität (Jahr)"
          value={
            derived.areaProductivityAnnual != null
              ? `${fmtNum(derived.areaProductivityAnnual, 2)} €/qm`
              : "–"
          }
          sub={missing.areaProductivity ?? "Monatswert × 12"}
        />
        <MetricsCard
          label="Raumproduktivität"
          value={
            derived.roomProductivity != null
              ? `${fmtNum(derived.roomProductivity, 1)} qm/Raum`
              : "–"
          }
          sub={missing.roomProductivity ?? "Fläche / Schlafräume"}
        />
        <MetricsCard
          label="Bettenproduktivität"
          value={
            derived.bedProductivity != null
              ? `${fmtNum(derived.bedProductivity, 1)} qm/Bett`
              : "–"
          }
          sub={missing.bedProductivity ?? "Fläche / Betten"}
        />
        <MetricsCard
          label="Betten pro Raum"
          value={
            derived.bedsPerRoom != null
              ? fmtNum(derived.bedsPerRoom, 2)
              : "–"
          }
          sub={missing.bedsPerRoom ?? "Betten / Schlafräume"}
        />
      </div>
    </div>

  );
}
