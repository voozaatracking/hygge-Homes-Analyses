"use client";

import type { ReactNode } from "react";
import type { ValueSource } from "@/lib/types/analysis";
import { SourceBadge } from "@/components/ui";

/** Große, gut lesbare Ergebniszahl mit Label, Einheit und optionaler Herkunft. */
export function MetricsCard({
  label,
  value,
  sub,
  source,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  source?: ValueSource;
  tone?: "neutral" | "positive" | "negative";
}) {
  const valueColor =
    tone === "positive"
      ? "text-sage"
      : tone === "negative"
        ? "text-brick"
        : "text-ink";
  return (
    <div className="bg-card border border-line rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className={`font-display text-2xl tabular ${valueColor}`}>
        {value}
      </span>
      {sub ? <span className="text-xs text-muted">{sub}</span> : null}
      {source ? <SourceBadge source={source} className="self-start mt-1" /> : null}
    </div>
  );
}

/** Aufklappbare, verständliche Herleitung einer Berechnung. */
export function CalculationBreakdown({
  summary,
  lines,
}: {
  summary: string;
  lines: string[];
}) {
  return (
    <details className="mt-2 border border-line rounded-lg bg-card-soft/60">
      <summary className="cursor-pointer px-3 py-2 text-xs text-muted hover:text-ink select-none">
        {summary}
      </summary>
      <div className="px-3 pb-3 pt-1">
        <ol className="text-xs text-ink space-y-1 tabular">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
