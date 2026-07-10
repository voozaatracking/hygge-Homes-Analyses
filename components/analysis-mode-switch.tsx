"use client";

import Link from "next/link";
import type { AnalysisMode } from "@/lib/types/analysis";

/** Deutlich sichtbarer Umschalter zwischen den beiden Analysebereichen. */
export function AnalysisModeSwitch({ active }: { active: AnalysisMode }) {
  const item = (mode: AnalysisMode, href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === mode ? "page" : undefined}
      className={`px-4 py-2 text-sm rounded-full transition-colors ${
        active === mode
          ? "bg-ink text-cream"
          : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex items-center gap-1 bg-card border border-line rounded-full p-1">
      {item("object", "/object-analysis", "Objektanalyse")}
      {item("location", "/location-analysis", "Standortanalyse")}
    </div>
  );
}
