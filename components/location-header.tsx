"use client";

import { useState } from "react";
import type { LocationInput } from "@/lib/types/analysis";
import { TextField } from "@/components/fields";
import { Button, Card, ConfirmDialog } from "@/components/ui";

/**
 * Schlanker Kopf eines Standorts: nur Name plus Aktionen.
 * Die früheren Marktdaten-Felder (Auslastung, Umsätze, Kosten, Quelle)
 * sind bewusst ausgeblendet; die Datenfelder existieren im Modell weiter,
 * damit bestehende Dateien und die Cloud-Daten unverändert gültig bleiben.
 */
export function LocationHeader({
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

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grow max-w-md">
          <TextField
            label="Stadt / Region"
            value={location.name}
            onChange={(name) => onChange({ ...location, name })}
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

      <ConfirmDialog
        open={confirmRemove}
        title="Standort entfernen"
        message="Der Standort und alle zugehörigen Inserate mit Wochenpreisen werden entfernt."
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
