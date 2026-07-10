import Link from "next/link";

/** Einstieg: Auswahl zwischen den beiden Analysebereichen. */
export default function Home() {
  return (
    <div className="py-10 sm:py-16 space-y-10">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-taupe mb-3">
          Wirtschaftliche Analyse von Ferienunterkünften
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-ink uppercase">
          Objekte und Standorte in Ruhe durchrechnen
        </h1>
        <p className="text-muted mt-4 leading-relaxed">
          Zwei Bereiche, eine Datei: In der Objektanalyse werden konkrete
          Unterkünfte mit Umsatz, Kosten, Gewinn und einer gewichteten
          Objektbewertung verglichen. In der Standortanalyse werden
          recherchierte Marktdaten je Stadt oder Region festgehalten und
          gegenübergestellt.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 max-w-3xl">
        <Link
          href="/object-analysis"
          className="group bg-card border border-line rounded-xl p-6 hover:border-taupe transition-colors"
        >
          <h2 className="font-display text-lg tracking-[0.12em] uppercase text-ink">
            Objektanalyse
          </h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Einzelne Unterkünfte erfassen: Fläche, Betten, Energie, Nachtpreis,
            Kosten. Das Tool berechnet Auslastung, Gewinn, Produktivitäten und
            eine Gesamtbewertung, transparent hergeleitet.
          </p>
          <span className="inline-block mt-4 text-sm text-taupe group-hover:text-ink transition-colors">
            Zur Objektanalyse →
          </span>
        </Link>
        <Link
          href="/location-analysis"
          className="group bg-card border border-line rounded-xl p-6 hover:border-taupe transition-colors"
        >
          <h2 className="font-display text-lg tracking-[0.12em] uppercase text-ink">
            Standortanalyse
          </h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Marktdaten je Stadt oder Region festhalten: Auslastung, Umsätze,
            Reinigungskosten, mit Datenquelle und Datum. Widersprüche in den
            Eingaben werden angezeigt, nie stillschweigend überschrieben.
          </p>
          <span className="inline-block mt-4 text-sm text-taupe group-hover:text-ink transition-colors">
            Zur Standortanalyse →
          </span>
        </Link>
      </div>

      <div className="max-w-3xl bg-card-soft/70 border border-line rounded-xl p-5 text-sm text-muted leading-relaxed">
        Alle Eingaben bleiben im Browser und werden nirgendwo hochgeladen.
        Gespeichert wird über den JSON-Export in der Werkzeugleiste, geladen
        über „JSON laden“. Bestehende Excel-Listen lassen sich über den
        Datei-Import übernehmen.
      </div>
    </div>
  );
}
