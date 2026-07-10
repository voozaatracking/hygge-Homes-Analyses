"use client";

import { useMemo, useState } from "react";
import type { LocationInput } from "@/lib/types/analysis";
import { deriveLocation } from "@/lib/calculations/location-calculations";
import { validateLocation } from "@/lib/validation/rules";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import {
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/fields";
import { Button, Card, ConfirmDialog, Notice, SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";

/**
 * Eingabekarte für einen Standort. Alle Werte sind manuelle Eingaben aus einer
 * dokumentierten Datenquelle (z. B. AirDNA). Es findet kein automatischer
 * Marktdaten-Abruf statt.
 */
export function LocationForm({
  location,
  onChange,
  onRemove,
  onDuplicate,
}: {
  location: LocationInput;
  onChange: (next: LocationInput) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const errors = useMemo(() => validateLocation(location), [location]);
  const derived = useMemo(() => deriveLocation(location), [location]);

  const set = <K extends keyof LocationInput>(key: K, value: LocationInput[K]) =>
    onChange({ ...location, [key]: value });

  return (
    <Card className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grow max-w-md">
          <TextField
            label="Stadt / Region"
            value={location.name}
            onChange={(v) => set("name", v)}
            placeholder="z. B. Lüneburg"
          />
        </div>
        <div className="flex gap-2 pt-6">
          <Button variant="ghost" onClick={onDuplicate}>
            Duplizieren
          </Button>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            Entfernen
          </Button>
        </div>
      </div>

      <div>
        <SectionTitle hint="Datenquelle und Datum bleiben sichtbar, damit später nachvollziehbar ist, woher die Annahmen stammen.">
          Datenherkunft
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Datenquelle"
            value={location.dataSource}
            onChange={(v) => set("dataSource", v)}
            placeholder="z. B. AirDNA"
            help="Woher stammen die Zahlen? Ohne Schnittstelle ist jede Eingabe eine manuell recherchierte oder importierte Quelle."
          />
          <TextField
            label="Datum der Datenerhebung"
            type="date"
            value={location.collectedAt}
            onChange={(v) => set("collectedAt", v)}
          />
          <TextField
            label="Quellenlink (optional)"
            type="url"
            value={location.sourceUrl}
            onChange={(v) => set("sourceUrl", v)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div>
        <SectionTitle hint="Es genügt eine der beiden Angaben. Die jeweils andere wird automatisch berechnet und entsprechend gekennzeichnet.">
          Auslastung
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Auslastungsquote"
            unit="%"
            value={location.occupancyPct}
            onChange={(v) => set("occupancyPct", v)}
            error={errors.occupancyPct}
            help="Anteil der vermieteten Nächte, 0 bis 100 %."
          />
          <NumberField
            label="Vermietete Tage pro Monat (optional)"
            unit="Tage"
            value={location.rentedDaysPerMonth}
            onChange={(v) => set("rentedDaysPerMonth", v)}
            error={errors.rentedDaysPerMonth}
            help="Rechenbasis sind 30 Tage pro Monat."
          />
        </div>
      </div>

      <div>
        <SectionTitle hint="Alle Beträge in Euro. Durchschnittswerte der Quelle, keine eigenen Objektdaten.">
          Umsatz und Kosten
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Ø Jahresumsatz"
            unit="€"
            value={location.avgAnnualRevenue}
            onChange={(v) => set("avgAnnualRevenue", v)}
            error={errors.avgAnnualRevenue}
          />
          <NumberField
            label="Ø Umsatz pro vermieteter Nacht"
            unit="€"
            value={location.avgRevenuePerNight}
            onChange={(v) => set("avgRevenuePerNight", v)}
            error={errors.avgRevenuePerNight}
          />
          <NumberField
            label="Ø Reinigungskosten"
            unit="€"
            value={location.avgCleaningCost}
            onChange={(v) => set("avgCleaningCost", v)}
            error={errors.avgCleaningCost}
            help="Durchschnittliche Reinigungskosten pro Aufenthalt laut Quelle."
          />
          <NumberField
            label="Ø Mehrkosten pro zusätzlicher Person"
            unit="€"
            value={location.extraPersonCost}
            onChange={(v) => set("extraPersonCost", v)}
            error={errors.extraPersonCost}
          />
        </div>
      </div>

      {derived.warnings.length > 0 ? (
        <div className="space-y-2">
          {derived.warnings.map((w, i) => (
            <Notice key={i} kind="warning">
              {w}
            </Notice>
          ))}
        </div>
      ) : null}

      <div>
        <SectionTitle hint="Jeder Wert ist als manuell eingegeben oder automatisch berechnet gekennzeichnet.">
          Abgeleitete Kennzahlen
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricsCard
            label="Auslastungsquote"
            value={
              derived.occupancyRate ? fmtPct(derived.occupancyRate.value) : "–"
            }
            source={derived.occupancyRate?.source ?? "unavailable"}
            sub={derived.occupancyRate?.note ?? undefined}
          />
          <MetricsCard
            label="Vermietete Tage pro Monat"
            value={
              derived.rentedDays
                ? `${fmtNum(derived.rentedDays.value, 1)} Tage`
                : "–"
            }
            source={derived.rentedDays?.source ?? "unavailable"}
            sub={derived.rentedDays?.note ?? undefined}
          />
          <MetricsCard
            label="Ø Monatsumsatz"
            value={
              derived.monthlyRevenue ? fmtEur(derived.monthlyRevenue.value) : "–"
            }
            source={derived.monthlyRevenue?.source ?? "unavailable"}
            sub={derived.monthlyRevenue?.note ?? undefined}
          />
          <MetricsCard
            label="Geschätzter Monatsumsatz aus Nachtumsatz"
            value={
              derived.monthlyRevenueFromNight
                ? fmtEur(derived.monthlyRevenueFromNight.value)
                : "–"
            }
            source={derived.monthlyRevenueFromNight?.source ?? "unavailable"}
            sub={derived.monthlyRevenueFromNight?.note ?? undefined}
          />
          <MetricsCard
            label="Ø Jahresumsatz"
            value={
              derived.annualRevenue ? fmtEur(derived.annualRevenue.value) : "–"
            }
            source={derived.annualRevenue?.source ?? "unavailable"}
          />
          <MetricsCard
            label="Ø Umsatz pro Nacht"
            value={
              derived.revenuePerNight
                ? fmtEur(derived.revenuePerNight.value)
                : "–"
            }
            source={derived.revenuePerNight?.source ?? "unavailable"}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Notizen</SectionTitle>
        <TextAreaField
          label="Notizen (optional)"
          value={location.notes}
          onChange={(v) => set("notes", v)}
          placeholder="z. B. Saisonalität, Besonderheiten der Quelle, Vergleichszeitraum"
        />
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Standort entfernen?"
        message={`Der Standort "${location.name || "ohne Namen"}" wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Entfernen"
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
