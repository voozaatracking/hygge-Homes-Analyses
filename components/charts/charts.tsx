"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PropertyInput } from "@/lib/types/analysis";
import { deriveProperty } from "@/lib/calculations/property-calculations";
import type { DerivedLocation } from "@/lib/calculations/location-calculations";
import { Card, SectionTitle } from "@/components/ui";

const COLORS = {
  sage: "#6f7f67",
  taupe: "#8c8377",
  sand: "#b3a184",
  brick: "#a05f54",
  greige: "#d8d0bf",
  ink: "#3b3733",
  muted: "#75705f",
};

const axisStyle = { fontSize: 12, fill: COLORS.muted } as const;

function euroFormatter(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n)} €`;
}

export function PropertyCharts({
  properties,
}: {
  properties: PropertyInput[];
}) {
  const data = properties
    .map((p) => {
      const d = deriveProperty(p);
      return {
        name: p.name || "Ohne Namen",
        Umsatz: d.monthlyRevenue,
        Kosten: d.totalMonthlyCosts,
        Gewinn: d.monthlyProfit,
        Bewertung:
          d.score.total != null ? Math.round(d.score.total * 1000) / 10 : null,
      };
    })
    .filter(
      (d) => d.Umsatz != null || d.Kosten != null || d.Bewertung != null
    );

  if (data.length === 0) return null;

  return (
    <Card>
      <SectionTitle hint="Monatswerte in Euro. Objekte ohne berechenbare Werte werden nicht dargestellt.">
        Diagramme
      </SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm text-muted mb-2">
            Umsatz, Kosten und Gewinn pro Monat
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: 8 }}>
                <CartesianGrid stroke={COLORS.greige} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} tickLine={false} />
                <YAxis
                  tick={axisStyle}
                  tickLine={false}
                  tickFormatter={euroFormatter}
                  width={80}
                />
                <Tooltip
                  formatter={(value) =>
                    value == null ? "–" : euroFormatter(value as number)
                  }
                  contentStyle={{
                    background: "#fbf8f2",
                    border: "1px solid #e0d8c8",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Umsatz" fill={COLORS.sage} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Kosten" fill={COLORS.sand} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Gewinn" fill={COLORS.taupe} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h4 className="text-sm text-muted mb-2">
            Objektbewertung in Prozent
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: 8 }}>
                <CartesianGrid stroke={COLORS.greige} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} tickLine={false} />
                <YAxis
                  tick={axisStyle}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v} %`}
                  width={52}
                />
                <Tooltip
                  formatter={(value) => (value == null ? "unvollständig" : `${value} %`)}
                  contentStyle={{
                    background: "#fbf8f2",
                    border: "1px solid #e0d8c8",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="Bewertung"
                  fill={COLORS.taupe}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

export interface LocationChartRow {
  name: string;
  derived: DerivedLocation;
}

export function LocationCharts({ rows }: { rows: LocationChartRow[] }) {
  const revenueData = rows
    .map((r) => ({
      name: r.name || "Ohne Namen",
      "Monatsumsatz (aus Jahresumsatz)": r.derived.monthlyRevenue?.value ?? null,
      "Monatsumsatz (aus Nachtumsatz)":
        r.derived.monthlyRevenueFromNight?.value ?? null,
      "Umsatz pro Nacht": r.derived.revenuePerNight?.value ?? null,
    }))
    .filter(
      (d) =>
        d["Monatsumsatz (aus Jahresumsatz)"] != null ||
        d["Monatsumsatz (aus Nachtumsatz)"] != null ||
        d["Umsatz pro Nacht"] != null
    );

  const occupancyData = rows
    .map((r) => ({
      name: r.name || "Ohne Namen",
      "Auslastung (%)":
        r.derived.occupancyRate != null
          ? Math.round(r.derived.occupancyRate.value * 1000) / 10
          : null,
      "Vermietete Tage": r.derived.rentedDays?.value ?? null,
    }))
    .filter((d) => d["Auslastung (%)"] != null || d["Vermietete Tage"] != null);

  if (revenueData.length === 0 && occupancyData.length === 0) return null;

  return (
    <Card>
      <SectionTitle hint="Alle Werte stammen aus manuellen Eingaben oder wurden daraus berechnet. Es werden keine Marktdaten automatisch abgerufen.">
        Diagramme
      </SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {revenueData.length > 0 ? (
          <div>
            <h4 className="text-sm text-muted mb-2">Zentrale Umsatzkennzahlen</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 8 }}>
                  <CartesianGrid stroke={COLORS.greige} vertical={false} />
                  <XAxis dataKey="name" tick={axisStyle} tickLine={false} />
                  <YAxis
                    tick={axisStyle}
                    tickLine={false}
                    tickFormatter={euroFormatter}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value == null ? "–" : euroFormatter(value as number)
                    }
                    contentStyle={{
                      background: "#fbf8f2",
                      border: "1px solid #e0d8c8",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="Monatsumsatz (aus Jahresumsatz)"
                    fill={COLORS.sage}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="Monatsumsatz (aus Nachtumsatz)"
                    fill={COLORS.taupe}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="Umsatz pro Nacht"
                    fill={COLORS.sand}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
        {occupancyData.length > 0 ? (
          <div>
            <h4 className="text-sm text-muted mb-2">
              Auslastungsquote und vermietete Tage
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occupancyData}
                  margin={{ top: 4, right: 8, left: 8 }}
                >
                  <CartesianGrid stroke={COLORS.greige} vertical={false} />
                  <XAxis dataKey="name" tick={axisStyle} tickLine={false} />
                  <YAxis tick={axisStyle} tickLine={false} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: "#fbf8f2",
                      border: "1px solid #e0d8c8",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="Auslastung (%)"
                    fill={COLORS.sage}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="Vermietete Tage"
                    fill={COLORS.taupe}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
