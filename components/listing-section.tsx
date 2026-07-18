"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ListingInput, LocationInput } from "@/lib/types/analysis";
import {
  deriveListingAnalysis,
  type DerivedListingRow,
} from "@/lib/calculations/listing-calculations";
import { parseListingWorkbook } from "@/lib/io/listing-excel-import";
import { WEEKS_PER_YEAR } from "@/lib/config/assumptions";
import { emptyListing, fillWeeklyPricesRight, newId } from "@/lib/utils";
import { fmtEur, fmtNum, numberToInput, parseLocaleNumber } from "@/lib/format";
import { MetricsCard } from "@/components/metrics-card";
import { NumberField } from "@/components/fields";
import { Button, Card, ConfirmDialog, Notice, SectionTitle, SourceBadge } from "@/components/ui";

const COLORS = {
  sage: "#6f7f67",
  ochre: "#96794a",
  greige: "#d8d0bf",
  muted: "#75705f",
};

const axisStyle = { fontSize: 12, fill: COLORS.muted } as const;

function euroFormatter(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n)} €`;
}

function truncate(text: string, max = 18): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Kompakte Zahlenzelle: übernimmt den Wert beim Verlassen oder mit Enter. */
function CellNumberInput({
  value,
  onCommit,
  ariaLabel,
  widthClass = "w-full",
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  ariaLabel: string;
  widthClass?: string;
}) {
  const [text, setText] = useState(() => numberToInput(value));
  const [invalid, setInvalid] = useState(false);
  const lastValue = useRef<number | null>(value);

  useEffect(() => {
    if (value !== lastValue.current) {
      setText(numberToInput(value));
      setInvalid(false);
      lastValue.current = value;
    }
  }, [value]);

  const commit = () => {
    const parsed = parseLocaleNumber(text);
    if (parsed !== null && Number.isNaN(parsed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== lastValue.current) {
      lastValue.current = parsed;
      onCommit(parsed);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      className={`${widthClass} bg-card border rounded-md px-1.5 py-1 text-xs text-ink text-right tabular focus:border-taupe ${
        invalid ? "border-brick" : "border-line"
      }`}
    />
  );
}

/** Kompakte Textzelle: übernimmt den Wert beim Verlassen oder mit Enter. */
function CellTextInput({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  widthClass = "w-full",
}: {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  widthClass?: string;
}) {
  const [text, setText] = useState(value);
  const lastValue = useRef(value);

  useEffect(() => {
    if (value !== lastValue.current) {
      setText(value);
      lastValue.current = value;
    }
  }, [value]);

  const commit = () => {
    if (text !== lastValue.current) {
      lastValue.current = text;
      onCommit(text);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      className={`${widthClass} bg-card border border-line rounded-md px-1.5 py-1 text-xs text-ink placeholder:text-muted/60 focus:border-taupe`}
    />
  );
}

const headerCell =
  "px-2 py-2 text-left text-[11px] uppercase tracking-[0.08em] text-muted font-normal whitespace-nowrap";
const bodyCell = "px-2 py-1.5 align-middle";

/**
 * Inserats- und KW-Analyse eines Standorts nach dem Modell der
 * Standortanalyse-Excel: Wochen-Listenpreise je Inserat, Auswertung mit
 * der Auslastungsquote des Standorts, Durchschnitt und Diagramm.
 */
export function ListingSection({
  location,
  onChange,
}: {
  location: LocationInput;
  onChange: (next: LocationInput) => void;
}) {
  const [open, setOpen] = useState(true);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analysis = useMemo(() => deriveListingAnalysis(location), [location]);
  const listings = location.listings;

  const updateListing = (next: ListingInput) => {
    onChange({
      ...location,
      listings: listings.map((l) => (l.id === next.id ? next : l)),
    });
  };

  const addListing = () => {
    onChange({
      ...location,
      listings: [...listings, emptyListing(`Inserat ${listings.length + 1}`)],
    });
    setOpen(true);
  };

  const removeListing = (id: string) => {
    onChange({ ...location, listings: listings.filter((l) => l.id !== id) });
  };

  const duplicateListing = (id: string) => {
    const source = listings.find((l) => l.id === id);
    if (!source) return;
    const copy: ListingInput = structuredClone(source);
    copy.id = newId();
    copy.name = `${source.name} (Kopie)`;
    const index = listings.findIndex((l) => l.id === id);
    const next = [...listings];
    next.splice(index + 1, 0, copy);
    onChange({ ...location, listings: next });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const result = parseListingWorkbook(buffer);
      if (!result.ok || !result.listings) {
        setImportMessage({
          kind: "error",
          text: result.error ?? "Die Datei konnte nicht gelesen werden.",
        });
        return;
      }

      const next: LocationInput = {
        ...location,
        listings: [...listings, ...result.listings],
      };
      const notes: string[] = [
        `${result.listings.length} Inserat(e) importiert`,
      ];
      if (result.cityName) {
        notes.push(`Stadt in der Datei: ${result.cityName}`);
      }
      if (result.occupancyPct != null && location.occupancyPct == null) {
        next.occupancyPct = result.occupancyPct;
        notes.push(
          `Auslastungsquote ${fmtNum(result.occupancyPct, 1)} % aus dem Dashboard-Blatt übernommen`
        );
      }
      if (result.skippedRows) {
        notes.push(`${result.skippedRows} unvollständige Zeile(n) übersprungen`);
      }
      onChange(next);
      setImportMessage({ kind: "success", text: `${notes.join(" · ")}.` });
      setOpen(true);
    } catch {
      setImportMessage({
        kind: "error",
        text: "Die Datei konnte nicht gelesen werden.",
      });
    }
  };

  const includedRows = analysis.rows.filter(
    (r) => r.listing.includeInAggregate && r.derived.annualRevenue != null
  );
  const chartData = includedRows.map((r) => ({
    name: truncate(r.listing.name || "Ohne Namen"),
    "Umsatz pro Jahr": r.derived.annualRevenue,
  }));

  const rowWarnings = analysis.rows.flatMap((r) =>
    r.derived.warnings.map(
      (w) => `${truncate(r.listing.name || "Ohne Namen", 40)}: ${w}`
    )
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base tracking-[0.12em] uppercase text-ink">
            Inserate und Wochenpreise
          </h3>
          <p className="text-sm text-muted mt-1">
            Wochen-Listenpreise (KW 1 bis {WEEKS_PER_YEAR}) recherchierter
            Booking-Inserate für {location.name || "diesen Standort"}. Werte
            werden beim Verlassen eines Feldes übernommen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={addListing}>
            Inserat hinzufügen
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Excel importieren
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            aria-label="Standortanalyse-Excel importieren"
            onChange={handleImportFile}
          />
          <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Einklappen" : `Ausklappen (${listings.length})`}
          </Button>
        </div>
      </div>

      {importMessage ? (
        <div className="mt-3">
          <Notice kind={importMessage.kind}>{importMessage.text}</Notice>
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumberField
              label="Gästewechsel pro Woche"
              value={location.changesPerWeek}
              onChange={(value) =>
                onChange({ ...location, changesPerWeek: value })
              }
              unit="Wechsel"
              help={`Annahme des KW-Modells: Reinigungen pro Jahr = ${WEEKS_PER_YEAR} Wochen × Wechsel pro Woche. Die bisherige Excel rechnet mit 2 (also 104).`}
            />
            <MetricsCard
              label="Auslastungsquote des Standorts"
              value={
                analysis.occupancyRate != null
                  ? `${fmtNum(analysis.occupancyRate * 100, 1)} %`
                  : "–"
              }
              sub="Aus den Marktdaten oben (z. B. AirDNA); dort änderbar."
            />
            <MetricsCard
              label="Vermietete Tage pro Monat"
              value={
                analysis.rentedDaysPerMonth != null
                  ? fmtNum(analysis.rentedDaysPerMonth, 1)
                  : "–"
              }
              sub="Auslastungsquote × 30 Tage"
            />
          </div>

          {analysis.warnings.map((warning) => (
            <Notice key={warning} kind="warning">
              {warning}
            </Notice>
          ))}

          {listings.length === 0 ? (
            <p className="text-sm text-muted">
              Noch keine Inserate erfasst. Über „Inserat hinzufügen“ eine leere
              Zeile anlegen oder eine bestehende Standortanalyse-Excel
              importieren.
            </p>
          ) : (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-card-soft">
                    <th
                      className={`${headerCell} sticky left-0 z-10 bg-card-soft border-r border-line min-w-[15rem]`}
                    >
                      Inserat (Haken = in Auswertung)
                    </th>
                    <th className={`${headerCell} min-w-[10rem]`}>
                      Booking-Link
                    </th>
                    <th className={headerCell}>Bewertung</th>
                    <th className={headerCell}>Personen</th>
                    <th className={headerCell}>Reinigung €</th>
                    <th className={headerCell}>Mehrkosten p.P. €</th>
                    {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => (
                      <th key={i} className={headerCell}>
                        KW {i + 1}
                      </th>
                    ))}
                    <th className={headerCell}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing, index) => (
                    <tr key={listing.id} className="border-t border-line">
                      <td
                        className={`${bodyCell} sticky left-0 z-10 bg-card border-r border-line min-w-[15rem]`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={listing.includeInAggregate}
                            onChange={(event) =>
                              updateListing({
                                ...listing,
                                includeInAggregate: event.target.checked,
                              })
                            }
                            aria-label={`Inserat ${index + 1} in die Auswertung einbeziehen`}
                            className="accent-[#6f7f67]"
                          />
                          <CellTextInput
                            value={listing.name}
                            onCommit={(name) =>
                              updateListing({ ...listing, name })
                            }
                            ariaLabel={`Name des Inserats ${index + 1}`}
                            placeholder="Name des Inserats"
                          />
                        </div>
                      </td>
                      <td className={bodyCell}>
                        <CellTextInput
                          value={listing.bookingUrl}
                          onCommit={(bookingUrl) =>
                            updateListing({ ...listing, bookingUrl })
                          }
                          ariaLabel={`Booking-Link des Inserats ${index + 1}`}
                          placeholder="https://…"
                          widthClass="w-40"
                        />
                      </td>
                      <td className={bodyCell}>
                        <CellNumberInput
                          value={listing.rating}
                          onCommit={(rating) =>
                            updateListing({ ...listing, rating })
                          }
                          ariaLabel={`Bewertung des Inserats ${index + 1}`}
                          widthClass="w-16"
                        />
                      </td>
                      <td className={bodyCell}>
                        <CellNumberInput
                          value={listing.persons}
                          onCommit={(persons) =>
                            updateListing({ ...listing, persons })
                          }
                          ariaLabel={`Personenzahl des Inserats ${index + 1}`}
                          widthClass="w-16"
                        />
                      </td>
                      <td className={bodyCell}>
                        <CellNumberInput
                          value={listing.cleaningCost}
                          onCommit={(cleaningCost) =>
                            updateListing({ ...listing, cleaningCost })
                          }
                          ariaLabel={`Reinigungskosten des Inserats ${index + 1}`}
                          widthClass="w-20"
                        />
                      </td>
                      <td className={bodyCell}>
                        <CellNumberInput
                          value={listing.extraCostPerPerson}
                          onCommit={(extraCostPerPerson) =>
                            updateListing({ ...listing, extraCostPerPerson })
                          }
                          ariaLabel={`Mehrkosten pro Person des Inserats ${index + 1}`}
                          widthClass="w-20"
                        />
                      </td>
                      {listing.weeklyPrices.map((price, week) => (
                        <td key={week} className={bodyCell}>
                          <CellNumberInput
                            value={price}
                            onCommit={(value) => {
                              const weeklyPrices = [...listing.weeklyPrices];
                              weeklyPrices[week] = value;
                              updateListing({ ...listing, weeklyPrices });
                            }}
                            ariaLabel={`KW ${week + 1} von Inserat ${index + 1}`}
                            widthClass="w-[4.2rem]"
                          />
                        </td>
                      ))}
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateListing({
                                ...listing,
                                weeklyPrices: fillWeeklyPricesRight(
                                  listing.weeklyPrices
                                ),
                              })
                            }
                            title="Leere KW mit dem jeweils letzten eingetragenen Preis auffüllen"
                            className="px-1.5 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft"
                          >
                            Auffüllen
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateListing(listing.id)}
                            className="px-1.5 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft"
                          >
                            Duplizieren
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingRemoveId(listing.id)}
                            className="px-1.5 py-1 rounded-md text-brick hover:bg-brick-soft"
                          >
                            Entfernen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {listings.length > 0 ? (
            <ListingResults analysis={analysis} chartData={chartData} />
          ) : null}

          {rowWarnings.length > 0 ? (
            <div className="space-y-2">
              {rowWarnings.map((warning) => (
                <Notice key={warning} kind="warning">
                  {warning}
                </Notice>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingRemoveId != null}
        title="Inserat entfernen"
        message="Das Inserat und alle eingetragenen Wochenpreise werden aus diesem Standort entfernt."
        confirmLabel="Entfernen"
        onConfirm={() => {
          if (pendingRemoveId) removeListing(pendingRemoveId);
          setPendingRemoveId(null);
        }}
        onCancel={() => setPendingRemoveId(null)}
      />
    </Card>
  );
}

function ListingResults({
  analysis,
  chartData,
}: {
  analysis: ReturnType<typeof deriveListingAnalysis>;
  chartData: { name: string; "Umsatz pro Jahr": number | null }[];
}) {
  const { aggregate } = analysis;

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle
          hint={`Durchschnitt über ${aggregate.count} einbezogene Inserat(e). Formel je Inserat: (Summe der Wochenpreise − Reinigung × ${WEEKS_PER_YEAR} × ${fmtNum(analysis.changesPerWeek, 1)}) × Auslastungsquote.`}
        >
          Auswertung
        </SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            label="Umsatz pro Jahr (Mittel)"
            value={fmtEur(aggregate.avgAnnualRevenue, 0)}
            sub="Nach Reinigung und Auslastung"
          />
          <MetricsCard
            label="Umsatz pro Monat (Mittel)"
            value={fmtEur(aggregate.avgMonthlyRevenue, 0)}
            sub="Jahresumsatz / 12"
          />
          <MetricsCard
            label="Umsatz pro Nacht (Mittel)"
            value={fmtEur(aggregate.avgRevenuePerNight)}
            sub="Basis / 364 Nächte, unabhängig von der Quote"
          />
          <MetricsCard
            label="Reinigungskosten (Mittel)"
            value={fmtEur(aggregate.avgCleaning)}
            sub="Pro Gästewechsel"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full border-collapse text-xs min-w-max">
          <thead>
            <tr className="bg-card-soft">
              <th className={headerCell}>Inserat</th>
              <th className={headerCell}>Umsatz / Jahr</th>
              <th className={headerCell}>Umsatz / Monat</th>
              <th className={headerCell}>Umsatz / Nacht</th>
              <th className={headerCell}>Reinigung verwendet</th>
              <th className={headerCell}>KW ausgefüllt</th>
            </tr>
          </thead>
          <tbody>
            {analysis.rows.map((row: DerivedListingRow) => (
              <tr
                key={row.listing.id}
                className={`border-t border-line ${
                  row.listing.includeInAggregate ? "" : "opacity-50"
                }`}
              >
                <td className={`${bodyCell} max-w-[18rem]`}>
                  <span className="block truncate" title={row.listing.name}>
                    {row.listing.name || "Ohne Namen"}
                  </span>
                  {!row.listing.includeInAggregate ? (
                    <span className="text-[11px] text-muted">
                      nicht in der Auswertung
                    </span>
                  ) : null}
                </td>
                <td className={`${bodyCell} tabular whitespace-nowrap`}>
                  {fmtEur(row.derived.annualRevenue, 0)}
                </td>
                <td className={`${bodyCell} tabular whitespace-nowrap`}>
                  {fmtEur(row.derived.monthlyRevenue, 0)}
                </td>
                <td className={`${bodyCell} tabular whitespace-nowrap`}>
                  {fmtEur(row.derived.revenuePerNight)}
                </td>
                <td className={`${bodyCell} whitespace-nowrap`}>
                  {row.derived.cleaningUsed ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="tabular">
                        {fmtEur(row.derived.cleaningUsed.amount)}
                      </span>
                      <SourceBadge source={row.derived.cleaningUsed.source} />
                    </span>
                  ) : (
                    "–"
                  )}
                </td>
                <td className={`${bodyCell} tabular`}>
                  {row.derived.filledWeeks} / {WEEKS_PER_YEAR}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.length > 0 ? (
        <div>
          <h4 className="text-sm text-muted mb-2">
            Umsatz pro Jahr je Inserat mit Durchschnittslinie
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8 }}>
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
                <Bar
                  dataKey="Umsatz pro Jahr"
                  fill={COLORS.sage}
                  radius={[3, 3, 0, 0]}
                />
                {analysis.aggregate.avgAnnualRevenue != null ? (
                  <ReferenceLine
                    y={analysis.aggregate.avgAnnualRevenue}
                    stroke={COLORS.ochre}
                    strokeDasharray="6 4"
                    label={{
                      value: "Durchschnitt",
                      position: "insideTopRight",
                      fill: COLORS.ochre,
                      fontSize: 11,
                    }}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
