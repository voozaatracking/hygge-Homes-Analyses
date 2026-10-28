"use client";

import type { SectionProps } from "@/components/property-form/types";
import { Notice, SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtEur, fmtNum } from "@/lib/format";

export function ResultsSection({
  derived,
  scenarios,
  active,
}: SectionProps) {
  // Wirtschaftlichkeit
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Break-even und Szenarien. Provision und Kurtaxe gelten als variable Kosten pro Nacht, alle übrigen Kosten als fix. Die Startinvestition wird im Tab 'Markt & Investition' eingegeben.">
        Wirtschaftlichkeit
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricsCard
          label="Break-even-Auslastung"
          value={
            derived.breakEvenNights != null
              ? `${fmtNum(derived.breakEvenNights, 1)} Nächte/Monat`
              : "nicht berechenbar"
          }
          sub={
            derived.breakEvenNights == null
              ? "Dafür werden Fixkosten und ein positiver Deckungsbeitrag pro Nacht benötigt."
              : derived.breakEvenNights > 30
                ? "Über 30 Nächten: Bei diesen Kosten ist das Objekt selbst bei Vollauslastung nicht profitabel."
                : `Entspricht ${fmtNum(derived.breakEvenOccupancyPct, 0)} % Auslastung (Basis 30 Tage).`
          }
          tone={
            derived.breakEvenNights == null
              ? "neutral"
              : derived.breakEvenNights > 30
                ? "negative"
                : "positive"
          }
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
              : "Dafür werden eine Startinvestition (Tab 'Markt & Investition') und ein positiver Monatsgewinn benötigt."
          }
        />
      </div>

      {scenarios ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border border-line rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-card-soft/60 text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th className="px-3 py-2 font-medium">Szenario</th>
                <th className="px-3 py-2 font-medium">Annahme</th>
                <th className="px-3 py-2 font-medium text-right">
                  Nächte/Monat
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  Nachtpreis
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  Umsatz/Monat
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  Gewinn/Monat
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  Gewinn/Jahr
                </th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.key} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">
                    {s.label}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {s.key === "base"
                      ? "eingegebene Werte"
                      : `Auslastung × ${fmtNum(s.occupancyFactor, 1)}, Preis × ${fmtNum(s.priceFactor, 1)}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    {fmtNum(s.rentedDaysPerMonth, 1)}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    {fmtEur(s.nightPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    {fmtEur(s.monthlyRevenue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular ${
                      s.monthlyProfit != null && s.monthlyProfit < 0
                        ? "text-brick"
                        : "text-sage"
                    }`}
                  >
                    {fmtEur(s.monthlyProfit)}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    {fmtEur(s.annualProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4">
          <Notice kind="info">
            Für die Szenariorechnung fehlen noch Nachtpreis oder vermietete
            Tage pro Monat.
          </Notice>
        </div>
      )}
    </div>

  );
}
