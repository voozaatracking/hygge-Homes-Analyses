"use client";

import type { SectionProps } from "@/components/property-form/types";
import { AddressGeocodeField } from "@/components/property-form/address-geocode-field";
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
        <div className="sm:col-span-2 lg:col-span-3">
          <AddressGeocodeField
            label="Standort / Adresse (optional)"
            value={property.address}
            onChange={(next) => set((d) => (d.address = next))}
            placeholder="Straße Hausnummer, PLZ Ort"
            help="Mit Koordinaten wird die Entfernung zum Firmensitz berechnet (Tab Kosten). Koordinaten werden nur serverseitig ermittelt und gelten für den eingegebenen Text."
          />
        </div>
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
