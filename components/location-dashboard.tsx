"use client";

import { useMemo, useState } from "react";
import type { LocationInput } from "@/lib/types/analysis";
import {
  deriveLocation,
  type DerivedLocation,
} from "@/lib/calculations/location-calculations";
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
  input: LocationInput;
  derived: DerivedLocation;
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
    label: "Stadt / Region",
    value: (r) => r.input.name,
    render: (r) => r.input.name || "Ohne Namen",
  },
  {
    key: "dataSource",
    label: "Datenquelle",
    value: (r) => r.input.dataSource,
    render: (r) => r.input.dataSource || "–",
  },
  {
    key: "collectedAt",
    label: "Stand",
    value: (r) => r.input.collectedAt,
    render: (r) => r.input.collectedAt || "–",
  },
  {
    key: "occupancy",
    label: "Auslastung (%)",
    value: (r) => r.derived.occupancyRate?.value ?? null,
    render: (r) => fmtPct(r.derived.occupancyRate?.value ?? null),
  },
  {
    key: "rentedDays",
    label: "Vermietete Tage/Monat",
    value: (r) => r.derived.rentedDays?.value ?? null,
    render: (r) => fmtNum(r.derived.rentedDays?.value ?? null, 1),
  },
  {
    key: "monthlyRevenue",
    label: "Ø Monatsumsatz (€)",
    value: (r) => r.derived.monthlyRevenue?.value ?? null,
    render: (r) => fmtEur(r.derived.monthlyRevenue?.value ?? null),
  },
  {
    key: "monthlyRevenueFromNight",
    label: "Monatsumsatz aus Nachtumsatz (€)",
    value: (r) => r.derived.monthlyRevenueFromNight?.value ?? null,
    render: (r) => fmtEur(r.derived.monthlyRevenueFromNight?.value ?? null),
  },
  {
    key: "annualRevenue",
    label: "Ø Jahresumsatz (€)",
    value: (r) => r.derived.annualRevenue?.value ?? null,
    render: (r) => fmtEur(r.derived.annualRevenue?.value ?? null),
  },
  {
    key: "revenuePerNight",
    label: "Ø Umsatz pro Nacht (€)",
    value: (r) => r.derived.revenuePerNight?.value ?? null,
    render: (r) => fmtEur(r.derived.revenuePerNight?.value ?? null),
  },
  {
    key: "cleaning",
    label: "Ø Reinigungskosten (€)",
    value: (r) => r.derived.cleaningCost?.value ?? null,
    render: (r) => fmtEur(r.derived.cleaningCost?.value ?? null),
  },
  {
    key: "extraPerson",
    label: "Mehrkosten pro Person (€)",
    value: (r) => r.derived.extraPersonCost?.value ?? null,
    render: (r) => fmtEur(r.derived.extraPersonCost?.value ?? null),
  },
  {
    key: "warnings",
    label: "Hinweise",
    value: (r) => r.derived.warnings.length,
    render: (r) =>
      r.derived.warnings.length > 0
        ? `${r.derived.warnings.length} Warnung(en)`
        : "keine",
  },
];

/** Vergleichstabelle aller Standorte, sortierbar und exportierbar. */
export function LocationComparisonTable({
  locations,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  locations: LocationInput[];
  onUpdate: (next: LocationInput) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<string>("monthlyRevenue");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () => locations.map((input) => ({ input, derived: deriveLocation(input) })),
    [locations]
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

  if (locations.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle hint="Zum Sortieren auf eine Spaltenüberschrift klicken. Markierte Standorte werden hervorgehoben.">
          Vergleich aller Standorte
        </SectionTitle>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              downloadText(
                "\uFEFF" + toCsv(sorted, exportColumns),
                `hygge-standortvergleich-${stamp()}.csv`,
                "text/csv;charset=utf-8"
              )
            }
          >
            Als CSV exportieren
          </Button>
          <Button
            onClick={() =>
              downloadBlob(
                toXlsxBlob(sorted, exportColumns, "Standortvergleich"),
                `hygge-standortvergleich-${stamp()}.xlsx`
              )
            }
          >
            Als XLSX exportieren
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm border-collapse min-w-[1200px]">
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
                    aria-label={`${row.input.name || "Standort"} hervorheben`}
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
        title="Standort entfernen?"
        message="Der Standort wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
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
