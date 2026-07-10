"use client";

import { useAnalysis } from "@/components/providers";
import { AnalysisModeSwitch } from "@/components/analysis-mode-switch";
import { Toolbar } from "@/components/toolbar";
import { PropertyForm } from "@/components/property-form";
import { PropertyComparisonTable } from "@/components/property-comparison-table";
import { PropertyCharts } from "@/components/charts/charts";
import { Card } from "@/components/ui";

export default function ObjectAnalysisPage() {
  const { state, dispatch } = useAnalysis();
  const objects = state.objects;

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
          Objektanalyse
        </h1>
        <AnalysisModeSwitch active="object" />
      </div>

      <Toolbar mode="object" />

      {objects.length === 0 ? (
        <Card className="text-center py-14">
          <p className="font-display text-lg tracking-wide uppercase text-ink">
            Noch keine Objekte angelegt
          </p>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            Über „Neues Objekt“ ein leeres Objekt anlegen, mit „Beispieldaten
            laden“ zwei fiktive Objekte zum Ausprobieren einfügen oder eine
            bestehende Excel-Liste importieren.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {objects.map((object) => (
              <PropertyForm
                key={object.id}
                property={object}
                onChange={(next) =>
                  dispatch({ type: "updateObject", object: next })
                }
                onRemove={() =>
                  dispatch({ type: "removeObject", id: object.id })
                }
                onDuplicate={() =>
                  dispatch({ type: "duplicateObject", id: object.id })
                }
              />
            ))}
          </div>

          <PropertyComparisonTable
            properties={objects}
            onUpdate={(next) => dispatch({ type: "updateObject", object: next })}
            onRemove={(id) => dispatch({ type: "removeObject", id })}
            onDuplicate={(id) => dispatch({ type: "duplicateObject", id })}
          />

          <PropertyCharts properties={objects} />
        </>
      )}
    </div>
  );
}
