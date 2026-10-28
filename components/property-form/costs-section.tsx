"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField, SelectField, TextField } from "@/components/fields";
import { Button, SectionTitle } from "@/components/ui";
import { newId } from "@/lib/utils";
import type { TouristTaxMode } from "@/lib/types/analysis";

export function CostsSection({
  property,
  derived,
  errors,
  set,
}: SectionProps) {
  return (
    <>
        <SectionTitle hint="Alle Kosten sind monatliche Beträge in Euro. Leere Felder werden nicht mitgezählt.">
          Monatliche Kosten
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField
            label="Kaltmiete"
            unit="€/Monat"
            value={property.costs.coldRent}
            onChange={(v) => set((d) => (d.costs.coldRent = v))}
            error={errors.coldRent}
          />
          <NumberField
            label="Internet"
            unit="€/Monat"
            value={property.costs.internet}
            onChange={(v) => set((d) => (d.costs.internet = v))}
            error={errors.internet}
          />
          <NumberField
            label="Sonstige Nebenkosten inkl. Heizung"
            unit="€/Monat"
            value={property.costs.ancillary}
            onChange={(v) => set((d) => (d.costs.ancillary = v))}
            error={errors.ancillary}
          />
          <NumberField
            label="Netflix / Streaming"
            unit="€/Monat"
            value={property.costs.streaming}
            onChange={(v) => set((d) => (d.costs.streaming = v))}
            error={errors.streaming}
          />
          <NumberField
            label="GEZ-Gebühr"
            unit="€/Monat"
            value={property.costs.gez}
            onChange={(v) => set((d) => (d.costs.gez = v))}
            error={errors.gez}
          />
          <NumberField
            label="GEMA-Gebühr"
            unit="€/Monat"
            value={property.costs.gema}
            onChange={(v) => set((d) => (d.costs.gema = v))}
            error={errors.gema}
          />
          <NumberField
            label="Wäsche"
            unit="€/Monat"
            value={property.costs.laundry}
            onChange={(v) => set((d) => (d.costs.laundry = v))}
            error={errors.laundry}
          />
        </div>

        {/* Kurtaxe: Umschalter Euro oder Prozent, darunter das Feld des aktiven Modus.
            Beim Umschalten bleibt der Wert des anderen Modus erhalten. */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Kurtaxe / Tourismusabgabe (optional)"
            value={property.costs.touristTaxMode}
            onChange={(v) =>
              set((d) => (d.costs.touristTaxMode = v as TouristTaxMode))
            }
            options={[
              { value: "perPersonNight", label: "€/Person/Nacht" },
              { value: "percentOfPrice", label: "% vom Preis" },
            ]}
            help="Nur ausfüllen, wenn am Standort eine Abgabe erhoben wird. Es gilt nur der gewählte Modus; der Wert 0 bedeutet keine Abgabe."
          />
          {property.costs.touristTaxMode === "percentOfPrice" ? (
            <NumberField
              label="Kurtaxe in Prozent vom Übernachtungspreis"
              unit="%"
              value={property.costs.touristTaxPct}
              onChange={(v) => set((d) => (d.costs.touristTaxPct = v))}
              error={errors.touristTaxPct}
              help="Kostenzeile = Nachtpreis × Prozent × vermietete Nächte pro Monat, auf derselben Preisbasis wie die Plattformprovision."
              hint={derived.touristTax.note}
            />
          ) : (
            <NumberField
              label="Kurtaxe pro Person und Nacht"
              unit="€/Person/Nacht"
              value={property.costs.touristTaxPerPersonNight}
              onChange={(v) =>
                set((d) => (d.costs.touristTaxPerPersonNight = v))
              }
              error={errors.touristTaxPerPersonNight}
              help="Kostenzeile = Betrag × Betten × vermietete Nächte pro Monat."
              hint={derived.touristTax.note}
            />
          )}
        </div>

        {/* Weitere Kosten */}
        <div className="mt-4 space-y-2">
          {property.costs.extras.map((extra) => (
            <div key={extra.id} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px]">
                <TextField
                  label="Bezeichnung"
                  value={extra.label}
                  onChange={(v) =>
                    set((d) => {
                      const item = d.costs.extras.find((e) => e.id === extra.id);
                      if (item) item.label = v;
                    })
                  }
                  placeholder="z. B. Versicherung"
                />
              </div>
              <div className="w-40">
                <NumberField
                  label="Betrag"
                  unit="€/Monat"
                  value={extra.amount}
                  onChange={(v) =>
                    set((d) => {
                      const item = d.costs.extras.find((e) => e.id === extra.id);
                      if (item) item.amount = v;
                    })
                  }
                  error={errors[`extra-${extra.id}`]}
                />
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  set(
                    (d) =>
                      (d.costs.extras = d.costs.extras.filter(
                        (e) => e.id !== extra.id
                      ))
                  )
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              set((d) =>
                d.costs.extras.push({ id: newId(), label: "", amount: null })
              )
            }
          >
            Weitere Kosten hinzufügen
          </Button>
        </div>
    </>

  );
}
