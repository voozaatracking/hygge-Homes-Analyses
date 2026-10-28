import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyForm } from "@/components/property-form";
import { sampleProperties } from "@/lib/sample-data";
import { emptyProperty } from "@/lib/utils";

/**
 * Render-Test der Formular-Sektionen (ohne Browser, über react-dom/server).
 * Prüft, dass alle Sektionen mit Beispieldaten und mit einem leeren Objekt
 * rendern und ihre Überschriften und Kennzahlen enthalten.
 */
const noop = () => {};

function render(property = sampleProperties()[0]) {
  return renderToStaticMarkup(
    createElement(PropertyForm, {
      property,
      onChange: noop,
      onRemove: noop,
      onDuplicate: noop,
    })
  );
}

describe("PropertyForm rendert alle Sektionen", () => {
  it("enthält die Überschriften aller Sektionen und Tabs", () => {
    const html = render();
    for (const text of [
      "Grunddaten &amp; Energie",
      "Preis &amp; Auslastung",
      "Kosten",
      "Markt &amp; Investition",
      "Ergebnis",
      ">Grunddaten<",
      ">Energie<",
      "Nachtpreis und Auslastung",
      "Monatliche Kosten",
      ">Strom<",
      ">Reinigung<",
      "Plattformprovision",
      "Wirtschaftlichkeit",
      "Marktpreis",
      ">Investition<",
      "Weitere Kennzahlen",
      "Objektbewertung",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("zeigt die Kennzahlen der Beispieldaten", () => {
    const html = render();
    expect(html).toContain("Umsatz / Monat");
    expect(html).toContain("2.160,00 €");
    expect(html).toContain("Kostenaufstellung anzeigen");
  });

  it("rendert ein leeres Objekt ohne Fehler und mit Hinweisen", () => {
    const html = render(emptyProperty("Leer"));
    expect(html).toContain("unvollständig");
    expect(html).toContain("Für die Szenariorechnung fehlen noch");
  });

  it("blendet nur den aktiven Tab ein (Grunddaten beim Start)", () => {
    const html = render();
    // Grunddaten und Energie sichtbar, die übrigen sechs Sektionshüllen mit "hidden".
    const hidden = (html.match(/<div class="hidden">/g) ?? []).length;
    expect(hidden).toBe(6);
  });
});
