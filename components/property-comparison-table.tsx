"use client";

import { useMemo, useState } from "react";
import type { PropertyInput } from "@/lib/types/analysis";
import {
  deriveProperty,
  type DerivedProperty,
} from "@/lib/calculations/property-calculations";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import { sortRows, type SortDirection } from "@/lib/utils";
import {
  downloadBlob,
  downloadText,
  toCsv,
  toXlsxBlob,
  type ExportColumn,
} from "@/lib/io/export";
import { Button, Card, ConfirmDialog, SectionTitle } from "@/components/ui";

interface Row {
  input: PropertyInput;
  derived: DerivedProperty;
}

interface Column {
  key: string;
  label: string;
  value: (row: Row) => number | string | null;
  render: (row: Row) => string;
}

const columns: Column[] = [
  {
    key: "name",
    label: "Objektname",
    value: (r) => r.input.name,
    render: (r) => r.input.name || "Ohne Namen",
  },
  {
    key: "area",
    label: "Fläche (qm)",
    value: (r) => r.input.areaSqm,
    render: (r) => fmtNum(r.input.areaSqm, 1),
  },
  {
    key: "bedrooms",
    label: "Schlafräume",
    value: (r) => r.input.bedrooms,
    render: (r) => fmtNum(r.input.bedrooms, 0),
  },
  {
    key: "beds",
    label: "Betten",
    value: (r) => r.input.beds,
    render: (r) => fmtNum(r.input.beds, 0),
  },
  {
    key: "energyClass",
    label: "Energieklasse",
    value: (r) => r.derived.energy.energyClass,
    render: (r) => r.derived.energy.energyClass ?? "–",
  },
  {
    key: "energyConsumption",
    label: "Energieverbrauch (kWh/qm p.a.)",
    value: (r) => r.derived.energy.consumption,
    render: (r) => fmtNum(r.derived.energy.consumption, 0),
  },
  {
    key: "nightPrice",
    label: "Nachtpreis Unterkunft (€)",
    value: (r) => r.derived.effectiveNightPrice,
    render: (r) => fmtEur(r.derived.effectiveNightPrice),
  },
  {
    key: "occupancy",
    label: "Auslastung (%)",
    value: (r) => r.derived.occupancyRate,
    render: (r) => fmtPct(r.derived.occupancyRate),
  },
  {
    key: "monthlyRevenue",
    label: "Umsatz/Monat (€)",
    value: (r) => r.derived.monthlyRevenue,
    render: (r) => fmtEur(r.derived.monthlyRevenue),
  },
  {
    key: "annualRevenue",
    label: "Jahresumsatz (€)",
    value: (r) => r.derived.annualRevenue,
    render: (r) => fmtEur(r.derived.annualRevenue),
  },
  {
    key: "monthlyCosts",
    label: "Kosten/Monat (€)",
    value: (r) => r.derived.totalMonthlyCosts,
    render: (r) => fmtEur(r.derived.totalMonthlyCosts),
  },
  {
    key: "monthlyProfit",
    label: "Gewinn/Monat (€)",
    value: (r) => r.derived.monthlyProfit,
    render: (r) => fmtEur(r.derived.monthlyProfit),
  },
  {
    key: "rentPerSqm",
    label: "Miete pro qm (€)",
    value: (r) => r.derived.rentPerSqm,
    render: (r) => fmtEur(r.derived.rentPerSqm),
  },
  {
    key: "marketDeviation",
    label: "Marktpreis-Abweichung (%)",
    value: (r) => r.derived.marketDeviation,
    render: (r) =>
      r.derived.marketDeviation != null
        ? fmtPct(r.derived.marketDeviation)
        : "nicht berechenbar",
  },
  {
    key: "cleaning",
    label: "Reinigungskosten (€/Monat)",
    value: (r) => r.derived.cleaningUsed?.amount ?? null,
    render: (r) => fmtEur(r.derived.cleaningUsed?.amount ?? null),
  },
  {
    key: "score",
    label: "Objektbewertung",
    value: (r) => r.derived.score.total,
    render: (r) =>
      r.derived.score.total != null
        ? fmtPct(r.derived.score.total)
        : "unvollständig",
  },
  {
    key: "scoreLabel",
    label: "Einordnung",
    value: (r) => r.derived.score.label,
    render: (r) => r.derived.score.label ?? "–",
  },
];

export function PropertyComparisonTable({
  properties,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  properties: PropertyInput[];
  onUpdate: (next: PropertyInput) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<string>("score");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      properties.map((input) => ({ input, derived: deriveProperty(input) })),
    [properties]
  );

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey) ?? columns[0];
    return sortRows(rows, column.value, direction);
  }, [rows, sortKey, direction]);

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  };

  const exportColumns: ExportColumn<Row>[] = columns.map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const stamp = () => new Date().toISOString().slice(0, 10);

  if (properties.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle hint="Zum Sortieren auf eine Spaltenüberschrift klicken. Markierte Objekte werden hervorgehoben.">
          Vergleich aller Objekte
        </SectionTitle>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              downloadText(
                "\uFEFF" + toCsv(sorted, exportColumns),
                `hygge-objektvergleich-${stamp()}.csv`,
                "text/csv;charset=utf-8"
              )
            }
          >
            Als CSV exportieren
          </Button>
          <Button
            onClick={() =>
              downloadBlob(
                toXlsxBlob(sorted, exportColumns, "Objektvergleich"),
                `hygge-objektvergleich-${stamp()}.xlsx`
              )
            }
          >
            Als XLSX exportieren
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm border-collapse min-w-[1400px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-line">
              <th className="py-2 pr-2 font-medium">Markieren</th>
              {columns.map((c) => (
                <th key={c.key} className="py-2 pr-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="hover:text-ink text-left"
                    aria-label={`Nach ${c.label} sortieren`}
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      <span aria-hidden="true">
                        {direction === "asc" ? " ↑" : " ↓"}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
              <th className="py-2 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.input.id}
                className={`border-b border-line/60 ${
                  row.input.highlighted ? "bg-sage-soft/60" : ""
                }`}
              >
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={row.input.highlighted}
                    aria-label={`${row.input.name || "Objekt"} hervorheben`}
                    onChange={(e) =>
                      onUpdate({ ...row.input, highlighted: e.target.checked })
                    }
                    className="accent-[var(--sage)] w-4 h-4"
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="py-2 pr-3 tabular whitespace-nowrap">
                    {c.render(row)}
                  </td>
                ))}
                <td className="py-2 whitespace-nowrap">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => onDuplicate(row.input.id)}
                    >
                      Duplizieren
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRemoveId(row.input.id)}
                    >
                      Entfernen
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={removeId != null}
        title="Objekt entfernen?"
        message="Das Objekt wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Entfernen"
        onConfirm={() => {
          if (removeId) onRemove(removeId);
          setRemoveId(null);
        }}
        onCancel={() => setRemoveId(null)}
      />
    </Card>
  );
}
