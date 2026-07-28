"use client";

import type { PropertyInput } from "@/lib/types/analysis";
import type { DerivedProperty } from "@/lib/calculations/property-calculations";
import type { ScenarioResult } from "@/lib/calculations/scenarios";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";

/**
 * Druckoptimierter Objektsteckbrief. Auf dem Bildschirm unsichtbar;
 * beim Drucken (Browser-Druckdialog, "Als PDF speichern") ist ausschließlich
 * dieser Steckbrief sichtbar (siehe @media print in globals.css).
 */
export function PropertyReport({
  property,
  derived,
  scenarios,
}: {
  property: PropertyInput;
  derived: DerivedProperty;
  scenarios: ScenarioResult[] | null;
}) {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dash = "–";
  const val = (v: string | null | undefined) => v ?? dash;

  return (
    <div className="print-report">
      <header className="report-header">
        <h1>{property.name || "Unbenanntes Objekt"}</h1>
        <p className="report-sub">
          Objektsteckbrief · Wirtschaftlichkeitsanalyse · Stand {today}
        </p>
        {property.address ? <p>{property.address}</p> : null}
        {property.listingUrl ? (
          <p className="report-muted">{property.listingUrl}</p>
        ) : null}
      </header>

      <section>
        <h2>Grunddaten</h2>
        <table>
          <tbody>
            <tr>
              <td>Gesamtfläche</td>
              <td>
                {property.areaSqm != null
                  ? `${fmtNum(property.areaSqm)} qm`
                  : dash}
              </td>
              <td>Schlafräume</td>
              <td>{property.bedrooms != null ? property.bedrooms : dash}</td>
            </tr>
            <tr>
              <td>Betten</td>
              <td>{property.beds != null ? property.beds : dash}</td>
              <td>Energieklasse</td>
              <td>{derived.energy.energyClass ?? dash}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Umsatz</h2>
        <table>
          <tbody>
            <tr>
              <td>Effektiver Nachtpreis</td>
              <td>{val(fmtEur(derived.effectiveNightPrice))}</td>
              <td>Auslastung</td>
              <td>
                {property.pricing.rentedDaysPerMonth != null
                  ? `${fmtNum(property.pricing.rentedDaysPerMonth)} Nächte/Monat (${fmtPct(derived.occupancyRate)})`
                  : dash}
              </td>
            </tr>
            <tr>
              <td>Umsatz pro Monat</td>
              <td>{val(fmtEur(derived.monthlyRevenue))}</td>
              <td>Jahresumsatz</td>
              <td>{val(fmtEur(derived.annualRevenue))}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Monatliche Kosten</h2>
        {derived.costLines.length > 0 ? (
          <table>
            <tbody>
              {derived.costLines.map((line, i) => (
                <tr key={i}>
                  <td>{line.label}</td>
                  <td className="report-num">{fmtEur(line.amount)}</td>
                </tr>
              ))}
              <tr className="report-total">
                <td>Gesamtkosten pro Monat</td>
                <td className="report-num">
                  {val(fmtEur(derived.totalMonthlyCosts))}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="report-muted">Keine Kosten erfasst.</p>
        )}
      </section>

      <section>
        <h2>Ergebnis und Wirtschaftlichkeit</h2>
        <table>
          <tbody>
            <tr>
              <td>Gewinn pro Monat</td>
              <td className="report-num">{val(fmtEur(derived.monthlyProfit))}</td>
              <td>Gewinn pro Jahr</td>
              <td className="report-num">{val(fmtEur(derived.annualProfit))}</td>
            </tr>
            <tr>
              <td>Break-even-Auslastung</td>
              <td className="report-num">
                {derived.breakEvenNights != null
                  ? `${fmtNum(derived.breakEvenNights, 1)} Nächte/Monat (${fmtNum(derived.breakEvenOccupancyPct, 0)} %)`
                  : dash}
              </td>
              <td>Amortisation</td>
              <td className="report-num">
                {derived.paybackMonths != null
                  ? `${fmtNum(derived.paybackMonths, 1)} Monate`
                  : dash}
              </td>
            </tr>
            {property.startInvestment != null ? (
              <tr>
                <td>Startinvestition</td>
                <td className="report-num">
                  {fmtEur(property.startInvestment)}
                </td>
                <td />
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {scenarios ? (
        <section>
          <h2>Szenarien</h2>
          <table>
            <thead>
              <tr>
                <th>Szenario</th>
                <th className="report-num">Nächte/Monat</th>
                <th className="report-num">Nachtpreis</th>
                <th className="report-num">Umsatz/Monat</th>
                <th className="report-num">Gewinn/Monat</th>
                <th className="report-num">Gewinn/Jahr</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td className="report-num">
                    {fmtNum(s.rentedDaysPerMonth, 1)}
                  </td>
                  <td className="report-num">{fmtEur(s.nightPrice)}</td>
                  <td className="report-num">{val(fmtEur(s.monthlyRevenue))}</td>
                  <td className="report-num">{val(fmtEur(s.monthlyProfit))}</td>
                  <td className="report-num">{val(fmtEur(s.annualProfit))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-muted">
            Pessimistisch: Auslastung × 0,8 und Preis × 0,9. Optimistisch:
            Auslastung × 1,2 und Preis × 1,1 (vermietete Nächte begrenzt auf
            30). Realistisch entspricht den eingegebenen Werten.
          </p>
        </section>
      ) : null}

      <footer className="report-footer">
        Erstellt mit der Hygge Homes Objekt- und Standortanalyse. Alle Werte
        beruhen auf den eingegebenen Daten und dokumentierten Annahmen; keine
        Anlage- oder Rechtsberatung.
      </footer>
    </div>
  );
}
