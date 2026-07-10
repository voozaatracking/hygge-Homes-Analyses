"use client";

import { useMemo, useState } from "react";
import type { EnergyClass, PropertyInput } from "@/lib/types/analysis";
import { ENERGY_CLASSES } from "@/lib/types/analysis";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import { validateProperty } from "@/lib/validation/rules";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import { newId } from "@/lib/utils";
import {
  CheckboxField,
  NumberField,
  RadioGroup,
  TextField,
} from "@/components/fields";
import {
  Button,
  Card,
  ConfirmDialog,
  Notice,
  SectionTitle,
  SourceBadge,
} from "@/components/ui";
import {
  CalculationBreakdown,
  MetricsCard,
} from "@/components/metrics-card";

export function PropertyForm({
  property,
  onChange,
  onRemove,
  onDuplicate,
}: {
  property: PropertyInput;
  onChange: (next: PropertyInput) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const derived = useMemo(() => deriveProperty(property), [property]);
  const errors = useMemo(() => validateProperty(property), [property]);

  const set = (updater: (draft: PropertyInput) => void) => {
    const next = structuredClone(property);
    updater(next);
    onChange(next);
  };

  const profitTone =
    derived.monthlyProfit == null
      ? "neutral"
      : derived.monthlyProfit >= 0
        ? "positive"
        : "negative";

  return (
    <Card className="space-y-8">
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          <TextField
            label="Objektname"
            value={property.name}
            onChange={(v) => set((d) => (d.name = v))}
            placeholder="z. B. Apartment Altstadt"
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

      {/* Grunddaten */}
      <div>
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
            value={property.address}
            onChange={(v) => set((d) => (d.address = v))}
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

      {/* Energie */}
      <div>
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

      {/* Preis und Auslastung */}
      <div>
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
              sub="vermietete Tage / 30"
            />
            <MetricsCard
              label="Mindestpreis pro Nacht bei 100 % Auslastung"
              value={fmtEur(derived.minPriceAtFullOccupancy)}
              sub="Umsatz pro Monat / 30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricsCard
              label="Umsatz pro Monat"
              value={fmtEur(derived.monthlyRevenue)}
              sub="effektiver Nachtpreis × vermietete Tage"
            />
            <MetricsCard
              label="Jahresumsatz"
              value={fmtEur(derived.annualRevenue)}
              sub="Umsatz pro Monat × 12"
            />
          </div>
        </div>
      </div>

      {/* Kosten */}
      <div>
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

        {/* Strom */}
        <div className="mt-6 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-ink">Strom</h4>
            {derived.electricityUsed ? (
              <span className="flex items-center gap-2 text-sm tabular">
                {fmtEur(derived.electricityUsed.amount)} / Monat
                <SourceBadge source={derived.electricityUsed.source} />
              </span>
            ) : (
              <span className="text-sm text-muted">
                noch nicht berechenbar
              </span>
            )}
          </div>
          <CheckboxField
            label="Stromkosten manuell eingeben (automatische Formel wird nicht verwendet)"
            checked={property.costs.useManualElectricity}
            onChange={(v) => set((d) => (d.costs.useManualElectricity = v))}
          />
          {property.costs.useManualElectricity ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                label="Stromkosten (manuell)"
                unit="€/Monat"
                value={property.costs.electricityManual}
                onChange={(v) => set((d) => (d.costs.electricityManual = v))}
                error={errors.electricityManual}
              />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                Automatisch berechnet aus Energieverbrauch, Gesamtfläche,
                Strompreis und Aufschlag. Strompreis und Aufschlag sind frei
                editierbare Annahmen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField
                  label="Strompreis"
                  unit="€/kWh"
                  value={property.electricityAssumptions.pricePerKwh}
                  onChange={(v) =>
                    set((d) => (d.electricityAssumptions.pricePerKwh = v))
                  }
                  error={errors.pricePerKwh}
                />
                <NumberField
                  label="Aufschlag"
                  unit="%"
                  value={property.electricityAssumptions.surchargePct}
                  onChange={(v) =>
                    set((d) => (d.electricityAssumptions.surchargePct = v))
                  }
                  error={errors.surchargePct}
                  help="Sicherheitsaufschlag auf die reinen Verbrauchskosten, z. B. für Grundgebühr und Preisschwankungen."
                />
              </div>
              {derived.electricityAuto ? (
                <CalculationBreakdown
                  summary="Herleitung der Stromkosten anzeigen"
                  lines={derived.electricityAuto.lines}
                />
              ) : (
                <Notice kind="info">
                  Für die automatische Berechnung fehlen noch: Energieverbrauch
                  oder Klasse, Gesamtfläche, Strompreis, Aufschlag.
                </Notice>
              )}
            </>
          )}
        </div>

        {/* Reinigung */}
        <div className="mt-4 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-ink">Reinigung</h4>
            {derived.cleaningUsed ? (
              <span className="flex items-center gap-2 text-sm tabular">
                {fmtEur(derived.cleaningUsed.amount)} / Monat
                <SourceBadge source={derived.cleaningUsed.source} />
              </span>
            ) : (
              <span className="text-sm text-muted">noch nicht berechenbar</span>
            )}
          </div>
          <CheckboxField
            label="Reinigungskosten manuell eingeben (automatische Formel wird nicht verwendet)"
            checked={property.costs.useManualCleaning}
            onChange={(v) => set((d) => (d.costs.useManualCleaning = v))}
          />
          {property.costs.useManualCleaning ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                label="Reinigungskosten (manuell)"
                unit="€/Monat"
                value={property.costs.cleaningManual}
                onChange={(v) => set((d) => (d.costs.cleaningManual = v))}
                error={errors.cleaningManual}
              />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                Automatisch berechnet aus Fläche, Minuten pro qm, Stundenlohn
                und Wechseln pro Monat. Alle drei Annahmen sind editierbar
                (Standard: 2 Min/qm, 22 €/Stunde, 4 Wechsel pro Monat).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberField
                  label="Reinigungszeit"
                  unit="Min/qm"
                  value={property.cleaningAssumptions.minutesPerSqm}
                  onChange={(v) =>
                    set((d) => (d.cleaningAssumptions.minutesPerSqm = v))
                  }
                  error={errors.minutesPerSqm}
                />
                <NumberField
                  label="Stundenlohn"
                  unit="€/Std."
                  value={property.cleaningAssumptions.hourlyWage}
                  onChange={(v) =>
                    set((d) => (d.cleaningAssumptions.hourlyWage = v))
                  }
                  error={errors.hourlyWage}
                />
                <NumberField
                  label="Reinigungen / Gästewechsel"
                  unit="pro Monat"
                  value={property.cleaningAssumptions.changesPerMonth}
                  onChange={(v) =>
                    set((d) => (d.cleaningAssumptions.changesPerMonth = v))
                  }
                  error={errors.changesPerMonth}
                />
              </div>
              {derived.cleaningAuto ? (
                <CalculationBreakdown
                  summary="Herleitung der Reinigungskosten anzeigen"
                  lines={derived.cleaningAuto.lines}
                />
              ) : (
                <Notice kind="info">
                  Für die automatische Berechnung fehlen noch: Fläche,
                  Reinigungszeit, Stundenlohn oder Wechsel pro Monat.
                </Notice>
              )}
            </>
          )}
        </div>

        {/* Summen */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricsCard
            label="Gesamtkosten pro Monat"
            value={fmtEur(derived.totalMonthlyCosts)}
            sub="Summe aller monatlichen Kosten"
          />
          <MetricsCard
            label="Gewinn pro Monat"
            value={fmtEur(derived.monthlyProfit)}
            sub="Umsatz pro Monat − Gesamtkosten pro Monat"
            tone={profitTone}
          />
          <MetricsCard
            label="Gewinn pro Jahr"
            value={fmtEur(derived.annualProfit)}
            sub="Gewinn pro Monat × 12"
            tone={profitTone}
          />
        </div>
        {derived.costLines.length > 0 ? (
          <CalculationBreakdown
            summary="Kostenaufstellung anzeigen"
            lines={derived.costLines.map(
              (line) =>
                `${line.label}: ${fmtEur(line.amount)} (${
                  line.source === "manual"
                    ? "manuell eingegeben"
                    : "automatisch berechnet"
                })`
            )}
          />
        ) : null}
      </div>

      {/* Marktpreis */}
      <div>
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
            sub="Kaltmiete / Gesamtfläche"
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
                : "Dafür werden Kaltmiete, Fläche und ein Marktpreis größer 0 benötigt."
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
      </div>

      {/* Weitere Kennzahlen */}
      <div>
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
            sub="Umsatz pro Monat / Fläche"
          />
          <MetricsCard
            label="Flächenproduktivität (Jahr)"
            value={
              derived.areaProductivityAnnual != null
                ? `${fmtNum(derived.areaProductivityAnnual, 2)} €/qm`
                : "–"
            }
            sub="Monatswert × 12"
          />
          <MetricsCard
            label="Raumproduktivität"
            value={
              derived.roomProductivity != null
                ? `${fmtNum(derived.roomProductivity, 1)} qm/Raum`
                : "–"
            }
            sub="Fläche / Schlafräume"
          />
          <MetricsCard
            label="Bettenproduktivität"
            value={
              derived.bedProductivity != null
                ? `${fmtNum(derived.bedProductivity, 1)} qm/Bett`
                : "–"
            }
            sub="Fläche / Betten"
          />
          <MetricsCard
            label="Betten pro Raum"
            value={
              derived.bedsPerRoom != null
                ? fmtNum(derived.bedsPerRoom, 2)
                : "–"
            }
            sub="Betten / Schlafräume"
          />
        </div>
      </div>

      {/* Bewertung */}
      <div>
        <SectionTitle hint="Gewichtete Summe aus fünf normierten Faktoren (Skala 0 bis 1). Normierung und Gewichte stammen aus der bestehenden Normierungstabelle.">
          Objektbewertung
        </SectionTitle>
        {derived.score.complete && derived.score.total != null ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricsCard
              label="Gesamtbewertung"
              value={fmtPct(derived.score.total)}
              sub={`Score ${fmtNum(derived.score.total, 3)} von 1,000`}
            />
            <MetricsCard
              label="Einordnung"
              value={derived.score.label ?? "–"}
              sub="schlecht unter 0,4 · moderat unter 0,8 · sehr gut ab 0,8"
              tone={
                derived.score.total >= 0.8
                  ? "positive"
                  : derived.score.total < 0.4
                    ? "negative"
                    : "neutral"
              }
            />
          </div>
        ) : (
          <Notice kind="warning">
            Bewertung unvollständig. Es fehlen:{" "}
            {derived.score.missing.join(", ")}.
          </Notice>
        )}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-line">
                <th className="py-2 pr-3 font-medium">Bewertungsfaktor</th>
                <th className="py-2 pr-3 font-medium">Kennwert</th>
                <th className="py-2 pr-3 font-medium">Normwert (0 bis 1)</th>
                <th className="py-2 pr-3 font-medium">Gewichtung</th>
                <th className="py-2 font-medium">Gewichteter Beitrag</th>
              </tr>
            </thead>
            <tbody>
              {derived.score.factors.map((f) => (
                <tr key={f.key} className="border-b border-line/60">
                  <td className="py-2 pr-3">{f.label}</td>
                  <td className="py-2 pr-3 tabular">
                    {f.raw != null ? fmtNum(f.raw, 2) : "fehlt"}
                  </td>
                  <td className="py-2 pr-3 tabular">
                    {f.norm != null ? fmtNum(f.norm, 2) : "–"}
                  </td>
                  <td className="py-2 pr-3 tabular">{fmtNum(f.weight, 2)}</td>
                  <td className="py-2 tabular">
                    {f.contribution != null ? fmtNum(f.contribution, 3) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Objekt entfernen?"
        message={`"${property.name || "Dieses Objekt"}" wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
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
