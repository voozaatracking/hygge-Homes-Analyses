"use client";

import { useMemo } from "react";
import { useAnalysis } from "@/components/providers";
import { AnalysisModeSwitch } from "@/components/analysis-mode-switch";
import { Toolbar } from "@/components/toolbar";
import { LocationForm } from "@/components/location-form";
import { LocationComparisonTable } from "@/components/location-dashboard";
import { LocationCharts, type LocationChartRow } from "@/components/charts/charts";
import { deriveLocation } from "@/lib/calculations/location-calculations";
import { Card } from "@/components/ui";

export default function LocationAnalysisPage() {
  const { state, dispatch } = useAnalysis();
  const locations = state.locations;

  const chartRows: LocationChartRow[] = useMemo(
    () =>
      locations.map((l) => ({
        name: l.name || "Ohne Namen",
        derived: deriveLocation(l),
      })),
    [locations]
  );

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
            Über „Neuer Standort“ einen leeren Standort anlegen, mit
            „Beispieldaten laden“ einen fiktiven Standort einfügen oder
            recherchierte Marktdaten aus einer Excel-Liste importieren.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {locations.map((location) => (
              <LocationForm
                key={location.id}
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
            ))}
          </div>

          <LocationComparisonTable
            locations={locations}
            onUpdate={(next) =>
              dispatch({ type: "updateLocation", location: next })
            }
            onRemove={(id) => dispatch({ type: "removeLocation", id })}
            onDuplicate={(id) => dispatch({ type: "duplicateLocation", id })}
          />

          <LocationCharts rows={chartRows} />
        </>
      )}
    </div>
  );
}
