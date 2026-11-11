"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnalysis } from "@/components/providers";
import { AnalysisModeSwitch } from "@/components/analysis-mode-switch";
import { ObjectOverview } from "@/components/object-overview";
import { ObjectDetail } from "@/components/object-detail";
import { Card } from "@/components/ui";
import { findObject } from "@/lib/overview";

/**
 * Objektanalyse: Übersicht mit Kacheln oder Detailansicht eines Objekts.
 * Das geöffnete Objekt steht als Suchparameter ?objekt=<id> in der URL:
 * Browser-Zurück führt zur Übersicht, Neuladen bleibt im Objekt, der
 * Zustand bleibt im Provider (kein Remount, kein zusätzlicher Sync).
 */
export default function ObjectAnalysisPage() {
  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
          Objektanalyse
        </h1>
        <AnalysisModeSwitch active="object" />
      </div>
      <Suspense
        fallback={
          <Card className="text-center py-14">
            <p className="text-sm text-muted">Datenstand wird geladen …</p>
          </Card>
        }
      >
        <ObjectAnalysisContent />
      </Suspense>
    </div>
  );
}

function ObjectAnalysisContent() {
  const { state, sync } = useAnalysis();
  const router = useRouter();
  const params = useSearchParams();
  const requestedId = params.get("objekt");
  const settled = sync.status !== "checking";
  const [notice, setNotice] = useState<string | null>(null);

  const object = findObject(state.objects, requestedId);

  const openObject = (id: string) => {
    setNotice(null);
    router.push(`/object-analysis?objekt=${encodeURIComponent(id)}`);
  };
  const backToOverview = () => router.push("/object-analysis");

  // Unbekannte Kennung (erst nach dem Cloud-Abgleich beurteilbar): Übersicht mit Hinweis.
  useEffect(() => {
    if (!requestedId || !settled || object) return;
    const timeout = window.setTimeout(() => {
      setNotice("Das angeforderte Objekt wurde nicht gefunden. Es wurde möglicherweise entfernt.");
      router.replace("/object-analysis");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [requestedId, settled, object, router]);

  if (requestedId && object) {
    return <ObjectDetail object={object} onBack={backToOverview} />;
  }
  if (requestedId && !settled) {
    return (
      <Card className="text-center py-14">
        <p className="text-sm text-muted">Datenstand wird geladen …</p>
      </Card>
    );
  }
  return <ObjectOverview onOpen={openObject} notice={notice} />;
}
