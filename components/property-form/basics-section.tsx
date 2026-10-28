"use client";

import type { SectionProps } from "@/components/property-form/types";
import { NumberField, TextField } from "@/components/fields";
import { SectionTitle } from "@/components/ui";

export function BasicsSection({
  property,
  errors,
  set,
  active,
}: SectionProps) {
  // Grunddaten
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Basisangaben zur Unterkunft. Fläche, Schlafräume und Betten sind Pflichtwerte für die Bewertung.">
        Grunddaten
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <TextField
          label="Link zum Inserat oder Exposé (optional)"
          value={property.listingUrl}
          onChange={(v) => set((d) => (d.listingUrl = v))}
          type="url"
          placeholder="https://"
        />
        <TextField
          label="Standort / Adresse (optional)"
          value={property.address.text}
          onChange={(v) =>
            set((d) => {
              // Koordinaten gelten nur für den Text, zu dem sie ermittelt wurden.
              if (v !== d.address.text) {
                d.address.lat = null;
                d.address.lng = null;
              }
              d.address.text = v;
            })
          }
          help="Mit Koordinaten (Tab Kosten, „Koordinaten ermitteln“) wird die Entfernung zum Firmensitz berechnet."
          placeholder="Stadt, Straße"
        />
        <NumberField
          label="Gesamtfläche"
          unit="qm"
          value={property.areaSqm}
          onChange={(v) => set((d) => (d.areaSqm = v))}
          error={errors.areaSqm}
        />
        <NumberField
          label="Anzahl der Schlafräume"
          value={property.bedrooms}
          onChange={(v) => set((d) => (d.bedrooms = v))}
          error={errors.bedrooms}
        />
        <NumberField
          label="Anzahl der Schlafplätze / Betten"
          value={property.beds}
          onChange={(v) => set((d) => (d.beds = v))}
          error={errors.beds}
        />
      </div>
    </div>

  );
}
