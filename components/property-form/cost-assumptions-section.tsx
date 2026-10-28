"use client";

import type { SectionProps } from "@/components/property-form/types";
import { AddressGeocodeField } from "@/components/property-form/address-geocode-field";
import { CheckboxField, NumberField, RadioGroup, SelectField } from "@/components/fields";
import { Notice, SourceBadge } from "@/components/ui";
import { CalculationBreakdown, MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtNum } from "@/lib/format";

export function CostAssumptionsSection({
  property,
  derived,
  errors,
  set,
  profitTone,
}: SectionProps) {
  return (
    <>
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
                Automatisch berechnet aus angenommenem Stromverbrauch,
                Gesamtfläche, Strompreis und Aufschlag. Alle drei Annahmen sind
                frei editierbar. Der Energieausweis-Verbrauch (Heizenergie)
                fließt hier bewusst nicht ein.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField
                  label="Stromverbrauch"
                  unit="kWh/qm pro Monat"
                  value={property.electricityAssumptions.consumptionKwhSqmMonth}
                  onChange={(v) =>
                    set(
                      (d) =>
                        (d.electricityAssumptions.consumptionKwhSqmMonth = v)
                    )
                  }
                  error={errors.consumptionKwhSqmMonth}
                  help="Annahme für den reinen Stromverbrauch, Standard 2,08 kWh/qm pro Monat. Nicht der Energieausweis-Wert, dieser beschreibt den Heizenergiebedarf."
                />
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
                  Für die automatische Berechnung fehlen noch: Stromverbrauch,
                  Gesamtfläche, Strompreis oder Aufschlag.
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

        {/* Entfernung und Fahrtkosten für die Reinigung */}
      <div className="mt-4 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-ink">Entfernung und Fahrtkosten</h4>
          {derived.travel.amount != null ? (
            <span className="flex items-center gap-2 text-sm tabular">
              {fmtEur(derived.travel.amount)} / Monat
              <SourceBadge source="derived" />
            </span>
          ) : property.travel.enabled ? (
            <span className="text-sm text-muted">noch nicht berechenbar</span>
          ) : null}
        </div>
        <AddressGeocodeField
          label="Adresse des Objekts"
          value={property.address}
          onChange={(next) => set((d) => (d.address = next))}
          placeholder="Straße Hausnummer, PLZ Ort"
          help="Dieselbe Adresse wie unter Grunddaten. Koordinaten werden nur serverseitig ermittelt und mit dem Adresstext gespeichert."
        />
        <p className="text-sm text-ink">
          {derived.distance.source === "hq" ? (
            derived.distance.km != null ? (
              <>
                Entfernung zum Firmensitz:{" "}
                <strong className="tabular">{fmtNum(derived.distance.km, 1)} km</strong>{" "}
                <span className="text-muted">(geschätzt aus Luftlinie)</span>
              </>
            ) : (
              <span className="text-muted">{derived.distance.note}</span>
            )
          ) : derived.distance.km != null ? (
            <>
              Entfernung zum Ausgangspunkt:{" "}
              <strong className="tabular">{fmtNum(derived.distance.km, 1)} km</strong>{" "}
              <span className="text-muted">(geschätzt aus Luftlinie)</span>
            </>
          ) : (
            <span className="text-muted">{derived.distance.note}</span>
          )}
        </p>
        <CheckboxField
          label="Fahrtkosten für Reinigung einrechnen (Fixkosten, je Fahrt Hin und zurück)"
          checked={property.travel.enabled}
          onChange={(v) => set((d) => (d.travel.enabled = v))}
        />
        {property.travel.enabled ? (
          <div className="space-y-3">
            <RadioGroup
              legend="Ausgangspunkt"
              value={property.travel.originMode}
              onChange={(v) =>
                set((d) => (d.travel.originMode = v as "hq" | "custom"))
              }
              options={[
                { value: "hq", label: "Firmensitz (Adresse aus dem Profil)" },
                { value: "custom", label: "Andere Adresse" },
              ]}
            />
            {property.travel.originMode === "custom" ? (
              <AddressGeocodeField
                label="Ausgangsadresse"
                value={property.travel.customOrigin}
                onChange={(next) => set((d) => (d.travel.customOrigin = next))}
                placeholder="Straße Hausnummer, PLZ Ort"
              />
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField
                label="Kostenart"
                value={property.travel.costMode}
                onChange={(v) =>
                  set((d) => (d.travel.costMode = v as "perKm" | "perTrip"))
                }
                options={[
                  { value: "perKm", label: "Kilometerpauschale" },
                  { value: "perTrip", label: "Fixpreis je Fahrt" },
                ]}
                help="Kilometerpauschale: Strecke × 2 (Hin und zurück) × Satz × Fahrten. Fixpreis: Preis je Fahrt (Hin und zurück) × Fahrten."
              />
              {property.travel.costMode === "perKm" ? (
                <NumberField
                  label="Kilometerpauschale"
                  unit="€/km"
                  value={property.travel.ratePerKm}
                  onChange={(v) => set((d) => (d.travel.ratePerKm = v))}
                  error={errors.travelRatePerKm}
                  hint={derived.travel.note}
                />
              ) : (
                <NumberField
                  label="Preis je Fahrt"
                  unit="€"
                  value={property.travel.pricePerTrip}
                  onChange={(v) => set((d) => (d.travel.pricePerTrip = v))}
                  error={errors.travelPricePerTrip}
                  hint={derived.travel.note}
                />
              )}
              <NumberField
                label="Fahrten pro Monat"
                unit="Fahrten"
                value={property.travel.tripsPerMonth}
                onChange={(v) => set((d) => (d.travel.tripsPerMonth = v))}
                error={errors.travelTripsPerMonth}
                placeholder={
                  property.cleaningAssumptions.changesPerMonth != null
                    ? `Standard: ${fmtNum(property.cleaningAssumptions.changesPerMonth, 0)}`
                    : undefined
                }
                help="Leer lassen, um die Reinigungen pro Monat des Objekts zu verwenden."
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Plattformprovision */}
        <div className="mt-6 border border-line rounded-xl p-4 bg-card-soft/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-ink">Plattformprovision</h4>
            {derived.variableMonthlyCosts != null &&
            derived.monthlyRevenue != null &&
            property.revenueAssumptions.platformCommissionPct != null ? (
              <span className="flex items-center gap-2 text-sm tabular">
                {fmtEur(
                  derived.monthlyRevenue *
                    (property.revenueAssumptions.platformCommissionPct / 100)
                )}{" "}
                / Monat
                <SourceBadge source="derived" />
              </span>
            ) : (
              <span className="text-sm text-muted">noch nicht berechenbar</span>
            )}
          </div>
          <p className="text-xs text-muted">
            Provision der Buchungsplattform (Airbnb, Booking usw.) in Prozent
            des Umsatzes. Editierbare Annahme, Standard 15 %. Wird als eigene
            Kostenzeile vom Umsatz abgezogen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Provision"
              unit="%"
              value={property.revenueAssumptions.platformCommissionPct}
              onChange={(v) =>
                set((d) => (d.revenueAssumptions.platformCommissionPct = v))
              }
              error={errors.platformCommissionPct}
              help="0 eintragen, wenn ausschließlich direkt vermietet wird."
            />
          </div>
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
    </>

  );
}
