"use client";

import { useState } from "react";
import type { GeoAddress } from "@/lib/types/analysis";
import { TextField } from "@/components/fields";
import { Button } from "@/components/ui";

/**
 * Adressfeld mit "Koordinaten ermitteln" über /api/geocode (nur serverseitig).
 * Ändert sich der Adresstext, werden die Koordinaten verworfen; sie gelten
 * nur für den Text, zu dem sie ermittelt wurden.
 */
export function AddressGeocodeField({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: GeoAddress;
  onChange: (next: GeoAddress) => void;
  placeholder?: string;
  help?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const geocode = async () => {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: value.text }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        lat?: number;
        lng?: number;
        displayName?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok || body.lat == null || body.lng == null) {
        setMessage(body?.error ?? "Die Koordinaten konnten nicht ermittelt werden.");
        return;
      }
      onChange({ text: value.text, lat: body.lat, lng: body.lng });
      setMessage(`Gefunden: ${body.displayName ?? value.text}`);
    } catch {
      setMessage("Die Koordinaten konnten nicht ermittelt werden.");
    } finally {
      setPending(false);
    }
  };

  const hasCoords = value.lat != null && value.lng != null;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="sm:col-span-2">
          <TextField
            label={label}
            value={value.text}
            onChange={(text) =>
              onChange(
                text === value.text
                  ? value
                  : { text, lat: null, lng: null }
              )
            }
            placeholder={placeholder}
            help={help}
          />
        </div>
        <Button
          onClick={() => void geocode()}
          disabled={pending || value.text.trim().length < 3}
        >
          {pending ? "Wird ermittelt …" : "Koordinaten ermitteln"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        {message ??
          (hasCoords
            ? `Koordinaten: ${value.lat!.toFixed(5)}, ${value.lng!.toFixed(5)}`
            : "Noch keine Koordinaten ermittelt.")}
      </p>
    </div>
  );
}
