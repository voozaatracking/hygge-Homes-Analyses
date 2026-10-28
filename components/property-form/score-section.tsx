"use client";

import type { SectionProps } from "@/components/property-form/types";
import { Notice, SectionTitle } from "@/components/ui";
import { MetricsCard } from "@/components/metrics-card";
import { fmtNum, fmtPct } from "@/lib/format";

export function ScoreSection({
  derived,
  active,
}: SectionProps) {
  // Bewertung
  return (
    <div className={active ? undefined : "hidden"}>
      <SectionTitle hint="Gewichtete Summe aus fünf normierten Faktoren (Skala 0 bis 1). Normierung und Gewichte stammen aus der bestehenden Normierungstabelle.">
        Objektbewertung
      </SectionTitle>
      {derived.score.complete && derived.score.total != null ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricsCard
            label="Gesamtbewertung"
            value={fmtPct(derived.score.total)}
            sub={`Score ${fmtNum(derived.score.total, 3)} von 1,000`}
          />
          <MetricsCard
            label="Einordnung"
            value={derived.score.label ?? "–"}
            sub="schlecht unter 0,4 · moderat unter 0,8 · sehr gut ab 0,8"
            tone={
              derived.score.total >= 0.8
                ? "positive"
                : derived.score.total < 0.4
                  ? "negative"
                  : "neutral"
            }
          />
        </div>
      ) : (
        <Notice kind="warning">
          Bewertung unvollständig. Es fehlen:{" "}
          {derived.score.missing.join(", ")}.
        </Notice>
      )}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-line">
              <th className="py-2 pr-3 font-medium">Bewertungsfaktor</th>
              <th className="py-2 pr-3 font-medium">Kennwert</th>
              <th className="py-2 pr-3 font-medium">Normwert (0 bis 1)</th>
              <th className="py-2 pr-3 font-medium">Gewichtung</th>
              <th className="py-2 font-medium">Gewichteter Beitrag</th>
            </tr>
          </thead>
          <tbody>
            {derived.score.factors.map((f) => (
              <tr key={f.key} className="border-b border-line/60">
                <td className="py-2 pr-3">{f.label}</td>
                <td className="py-2 pr-3 tabular">
                  {f.raw != null ? fmtNum(f.raw, 2) : "fehlt"}
                </td>
                <td className="py-2 pr-3 tabular">
                  {f.norm != null ? fmtNum(f.norm, 2) : "–"}
                </td>
                <td className="py-2 pr-3 tabular">{fmtNum(f.weight, 2)}</td>
                <td className="py-2 tabular">
                  {f.contribution != null ? fmtNum(f.contribution, 3) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

  );
}
