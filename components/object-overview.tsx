"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalysis } from "@/components/providers";
import { Toolbar } from "@/components/toolbar";
import { PropertyComparisonTable } from "@/components/property-comparison-table";
import { PropertyCharts } from "@/components/charts/charts";
import { Button, Card, ConfirmDialog, Notice } from "@/components/ui";
import { fmtEur } from "@/lib/format";
import { newId } from "@/lib/utils";
import { sampleProperties } from "@/lib/sample-data";
import { tileSummary, type TileSummary } from "@/lib/overview";

/**
 * Einstieg der Objektanalyse: Kacheln je Objekt, Aktionsleiste und der
 * bestehende Vergleich (Tabelle, Bewertung, Diagramme) auf Wunsch.
 */
export function ObjectOverview({
  onOpen,
  notice,
}: {
  /** Objekt in der Detailansicht öffnen (Kennung in die URL). */
  onOpen: (id: string) => void;
  /** Hinweis, z. B. nach unbekannter Kennung. */
  notice?: string | null;
}) {
  const { state, dispatch, sync, deriveContext } = useAnalysis();
  const objects = state.objects;
  const settled = sync.status !== "checking";
  const [compare, setCompare] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TileSummary | null>(null);

  const tiles = useMemo(
    () => objects.map((o) => tileSummary(o, deriveContext)),
    [objects, deriveContext]
  );

  const createObject = () => {
    const id = newId();
    dispatch({ type: "addObject", id });
    onOpen(id);
  };
  const loadSample = () => {
    const sample = sampleProperties()[0];
    dispatch({ type: "addObjects", objects: [sample] });
    onOpen(sample.id);
  };

  return (
    <div className="space-y-6">
      {notice ? <Notice kind="warning">{notice}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={createObject}>
          Neues Objekt
        </Button>
        <Button onClick={loadSample}>Beispielobjekt laden</Button>
        <Button
          onClick={() => setCompare((c) => !c)}
          disabled={objects.length === 0}
        >
          {compare ? "Vergleich ausblenden" : "Objekte vergleichen"}
        </Button>
      </div>

      <Toolbar mode="object" hideCreate />

      {objects.length === 0 ? (
        settled ? (
          <Card className="text-center py-14">
            <p className="font-display text-lg tracking-wide uppercase text-ink">
              Noch keine Objekte angelegt
            </p>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Ein Objekt ist eine Ferienunterkunft mit Preis, Auslastung und
              Kosten. Daraus entstehen Umsatz, Gewinn, Break-even und die
              Objektbewertung. Zum Kennenlernen ein fiktives Beispielobjekt
              laden, über „Neues Objekt“ leer starten oder eine bestehende
              Excel-Liste importieren.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="primary" onClick={loadSample}>
                Beispielobjekt laden
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-14">
            <p className="text-sm text-muted">Datenstand wird geladen …</p>
          </Card>
        )
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
          {tiles.map((tile) => (
            <li key={tile.id} className="relative">
              <ObjectTile tile={tile} onOpen={() => onOpen(tile.id)} />
              <TileMenu
                name={tile.name}
                onDuplicate={() => dispatch({ type: "duplicateObject", id: tile.id })}
                onDelete={() => setDeleteTarget(tile)}
              />
            </li>
          ))}
        </ul>
      )}

      {compare && objects.length > 0 ? (
        <div className="space-y-6">
          <PropertyComparisonTable
            properties={objects}
            onUpdate={(next) => dispatch({ type: "updateObject", object: next })}
            onRemove={(id) => dispatch({ type: "removeObject", id })}
            onDuplicate={(id) => dispatch({ type: "duplicateObject", id })}
          />
          <PropertyCharts properties={objects} />
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Objekt entfernen?"
        message={`"${deleteTarget?.name ?? "Dieses Objekt"}" wird aus der Analyse entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Entfernen"
        onConfirm={() => {
          if (deleteTarget) dispatch({ type: "removeObject", id: deleteTarget.id });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/** Ganze Kachel klickbar und per Tastatur erreichbar. */
function ObjectTile({ tile, onOpen }: { tile: TileSummary; onOpen: () => void }) {
  const toneClass =
    tile.tone === "positive"
      ? "text-sage"
      : tile.tone === "negative"
        ? "text-brick"
        : "text-muted";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${tile.name} öffnen`}
      className="w-full h-full text-left bg-card border border-line rounded-xl p-5 pr-12 hover:border-taupe focus:outline-none focus-visible:ring-2 focus-visible:ring-taupe transition-colors"
    >
      <span className="block font-display text-xl tracking-wide text-ink truncate">
        {tile.name}
      </span>
      <span className={`block mt-1 text-sm truncate ${tile.hasAddress ? "text-muted" : "text-muted/70"}`}>
        {tile.address}
      </span>
      <span className="block mt-4 text-xs uppercase tracking-[0.12em] text-muted">
        {tile.label}
      </span>
      <span className={`block font-display text-2xl tabular ${toneClass}`}>
        {tile.monthlyProfit != null ? fmtEur(Math.abs(tile.monthlyProfit)) : "–"}
      </span>
    </button>
  );
}

/** Dezentes Menü je Kachel: Duplizieren und Löschen. */
function TileMenu({
  name,
  onDuplicate,
  onDelete,
}: {
  name: string;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute top-3 right-3">
      <button
        type="button"
        aria-label={`Aktionen für ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-full text-muted hover:text-ink hover:bg-card-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-taupe"
      >
        ···
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-40 bg-card border border-line rounded-lg shadow-lg py-1 z-10 text-sm"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="w-full text-left px-3 py-1.5 text-ink hover:bg-card-soft"
          >
            Duplizieren
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-1.5 text-brick hover:bg-brick-soft"
          >
            Löschen
          </button>
        </div>
      ) : null}
    </div>
  );
}
