"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField } from "@/components/fields";
import { Notice, SectionTitle, SourceBadge } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import type { EnergyClass } from "@/lib/types/analysis";
import { ENERGY_CLASSES } from "@/lib/types/analysis";

export function EnergySection({
  property,
  derived,
  errors,
  set,
  active,
}: SectionProps) {
  // Energie
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Verbrauch oder Klasse eingeben. Der jeweils fehlende Wert wird automatisch abgeleitet und als solcher gekennzeichnet.">
        Energie
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label="Energieverbrauch"
          unit="kWh/qm p.a."
          value={property.energy.consumption}
          onChange={(v) => set((d) => (d.energy.consumption = v))}
          error={errors.energyConsumption}
          help="Endenergieverbrauch pro Quadratmeter und Jahr, z. B. aus dem Energieausweis."
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink" htmlFor={`class-${property.id}`}>
            Energieeffizienzklasse
          </label>
          <select
            id={`class-${property.id}`}
            value={property.energy.energyClass ?? ""}
            onChange={(e) =>
              set(
                (d) =>
                  (d.energy.energyClass = (e.target.value || null) as
                    | EnergyClass
                    | null)
              )
            }
            className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-taupe"
          >
            <option value="">Keine Angabe</option>
            {ENERGY_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {derived.energy.conflict ? (
          <Notice kind="warning">{derived.energy.conflict}</Notice>
        ) : null}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
          <span className="flex items-center gap-2">
            Verbrauch für die Berechnung:{" "}
            <strong className="tabular">
              {derived.energy.consumption != null
                ? `${fmtNum(derived.energy.consumption, derived.energy.derived ? 1 : 0)} kWh/qm p.a.`
                : "nicht verfügbar"}
            </strong>
            <SourceBadge source={derived.energy.consumptionSource} />
          </span>
          <span className="flex items-center gap-2">
            Klasse:{" "}
            <strong>{derived.energy.energyClass ?? "nicht verfügbar"}</strong>
            <SourceBadge source={derived.energy.energyClassSource} />
          </span>
        </div>
        {derived.energy.derived ? (
          <p className="text-xs text-muted">
            Schätzwert aus der Klasse abgeleitet (Mittelwert der
            Tabellenschwellen). Bereich:{" "}
            {fmtNum(derived.energy.derived.rangeMin, 0)} bis{" "}
            {derived.energy.derived.rangeMax != null
              ? `${fmtNum(derived.energy.derived.rangeMax, 0)} kWh/qm p.a.`
              : "offen (Klasse H, Annahme: mindestens 231 kWh/qm p.a.)"}
            . Der echte Verbrauch kann abweichen.
          </p>
        ) : null}
      </div>
    </div>

  );
}
