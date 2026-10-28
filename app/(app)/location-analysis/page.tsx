"use client";

import { useAnalysis } from "@/components/providers";
import { AnalysisModeSwitch } from "@/components/analysis-mode-switch";
import { Toolbar } from "@/components/toolbar";
import { LocationHeader } from "@/components/location-header";
import { ListingSection } from "@/components/listing-section";
import { Card } from "@/components/ui";

/**
 * Standortanalyse in der verschlankten Fassung: pro Standort nur der Name
 * und die Inserate mit Wochenpreisen (KW 1 bis 52) samt Auswertung des
 * Preisniveaus. Die früheren Marktdaten-Eingaben sind ausgeblendet, die
 * Datenfelder bleiben im Modell erhalten.
 */
export default function LocationAnalysisPage() {
  const { state, dispatch } = useAnalysis();
  const locations = state.locations;

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
          Standortanalyse
        </h1>
        <AnalysisModeSwitch active="location" />
      </div>

      <Toolbar mode="location" />

      {locations.length === 0 ? (
        <Card className="text-center py-14">
          <p className="font-display text-lg tracking-wide uppercase text-ink">
            Noch keine Standorte angelegt
          </p>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            Über „Neuer Standort“ einen Standort anlegen und darin Inserate mit
            Wochenpreisen erfassen, mit „Beispieldaten laden“ ein Beispiel
            einfügen oder eine bestehende Standortanalyse-Excel direkt im
            Standort importieren.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {locations.map((location) => (
            <div key={location.id} className="space-y-6">
              <LocationHeader
                location={location}
                onChange={(next) =>
                  dispatch({ type: "updateLocation", location: next })
                }
                onRemove={() =>
                  dispatch({ type: "removeLocation", id: location.id })
                }
                onDuplicate={() =>
                  dispatch({ type: "duplicateLocation", id: location.id })
                }
              />
              <ListingSection
                location={location}
                onChange={(next) =>
                  dispatch({ type: "updateLocation", location: next })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
