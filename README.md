# Hygge Homes | Objekt- und Standortanalyse

Webbasiertes Rechentool zur wirtschaftlichen Analyse von Ferienunterkünften mit zwei Bereichen:

- **Objektanalyse:** konkrete Unterkünfte erfassen und vergleichen (Umsatz, Kosten, Gewinn, Produktivitäten, gewichtete Objektbewertung).
- **Standortanalyse:** manuell recherchierte Marktdaten je Stadt oder Region festhalten und gegenüberstellen (Auslastung, Umsätze, Reinigungskosten, inkl. Datenquelle und Erhebungsdatum).

Alle Daten bleiben im Browser. Gespeichert und geladen wird über versionierte JSON-Dateien, bestehende Excel-Listen lassen sich importieren.

## Technik

- Next.js (App Router) mit TypeScript
- Tailwind CSS v4
- Recharts (Diagramme), Zod (Schema-Validierung), SheetJS/xlsx (Excel-Import und -Export)
- Vitest (Unit-Tests der Rechenlogik)
- Schriften: Oswald (Display) und Jost (Fließtext) über `next/font`

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # Vitest, Rechenlogik und Import/Export
npm run lint       # ESLint
npm run build      # Produktions-Build
```

## Deployment auf Vercel

1. Repository auf GitHub anlegen und pushen:
   ```bash
   git init
   git add .
   git commit -m "Initial: Hygge Analyse"
   git remote add origin <REPO-URL>
   git push -u origin main
   ```
2. Auf vercel.com „Add New Project“, das Repository importieren. Next.js wird automatisch erkannt, keine weiteren Einstellungen oder Umgebungsvariablen nötig.
3. Jeder Push auf `main` erzeugt ein neues Deployment.

## Projektstruktur

```
app/                     Seiten (Start, Objektanalyse, Standortanalyse)
components/              UI-Komponenten (Formulare, Tabellen, Diagramme, Import)
lib/calculations/        gesamte Rechenlogik (rein, ohne UI)
lib/config/              zentrale Annahmen und Normierungstabellen
lib/io/                  JSON-Export/Import, Excel-Import, CSV/XLSX-Export
lib/validation/          Eingabevalidierung
tests/                   Vitest-Tests
```

Rechenlogik und UI sind strikt getrennt: Alle Formeln liegen in `lib/` und sind ohne Browser testbar.

## Datenmodell und Speicherung

- Der gesamte Zustand (Objekte und Standorte) wird als eine JSON-Datei exportiert und importiert.
- Die Datei trägt `schemaVersion` und `calcVersion` plus einen Schnappschuss der Annahmen. Ältere Versionen werden migriert (aktuell nur Version 1), neuere mit verständlicher Meldung abgelehnt.
- Es gibt bewusst keine automatische Speicherung im Browser-Storage; der Export ist der Speicherstand. Ungespeicherte Änderungen lösen beim Verlassen der Seite eine Browser-Warnung aus.

## Berechnungslogik (Kurzfassung)

Rechenbasis: **30 Tage pro Monat, 12 Monate pro Jahr.**

- Effektiver Nachtpreis: bei „pro Unterkunft“ der eingegebene Preis, bei „pro Bett“ Preis × Bettenanzahl.
- Auslastungsquote = vermietete Tage / 30 (zulässig 0 bis 30 Tage).
- Monatsumsatz = effektiver Nachtpreis × vermietete Tage, Jahresumsatz = Monatsumsatz × 12.
- Mindestpreis pro Nacht bei Vollauslastung = monatliche Gesamtkosten / 30.
- Stromkosten (Schätzung): Verbrauch (kWh/qm p.a.) × Fläche × Strompreis (Default 0,35 €/kWh), plus Aufschlag (Default 30 %) für Übernachtungsbetrieb, durch 12 als Monatswert. Annahmen je Objekt editierbar; ein manuell eingegebener Wert hat immer Vorrang und wird als „manuell eingegeben“ gekennzeichnet.
- Reinigungskosten (Schätzung): Fläche × 2 min/qm ÷ 60 × 22 €/h × 4 Wechsel pro Monat, Annahmen je Objekt editierbar, manueller Wert hat Vorrang.
- Energieeffizienzklasse ↔ Verbrauch: Aus einer Klasse abgeleitete Verbräuche sind Schätzwerte (Mitte des Klassenbereichs, Klasse H als offene Klasse mit Repräsentativwert 231 kWh/qm p.a.) und werden inklusive Bereich angezeigt. Liegen Verbrauch und Klasse vor und widersprechen sich, gewinnt der Verbrauch und ein Hinweis erscheint.
- Miete pro qm = Kaltmiete / Fläche; Marktabweichung = (Miete/qm − Marktpreis) / Marktpreis. Der Marktpreis wird manuell recherchiert (Link zu ImmobilienScout24 ist hinterlegt, es gibt keinen automatischen Abruf).
- Produktivitäten: Flächenproduktivität (Monatsumsatz/qm, zusätzlich als Jahreswert), Raumproduktivität (Monatsumsatz/Schlafraum), Bettenproduktivität (Monatsumsatz/Bett), Betten pro Raum.

### Objektbewertung

Gewichtete Summe normierter Teilwerte über Stufentabellen (Treppenfunktionen, keine Interpolation):

| Faktor | Gewicht |
| --- | --- |
| Miete pro qm | 0,25 |
| Raumproduktivität | 0,35 |
| Flächenproduktivität | 0,20 |
| Betten pro Raum | 0,10 |
| Energieverbrauch | 0,10 |

Die Raumproduktivität ist bewusst nicht monoton (Optimum bei 25 €/Raum und Tag laut Vorlage). Werte unterhalb der ersten Tabellenschwelle werden auf die erste Stufe geklemmt. Einordnung: unter 0,4 „schlecht“, unter 0,8 „moderat“, ab 0,8 „sehr gut“. Fehlen Eingaben, wird die Bewertung als unvollständig markiert und die fehlenden Werte werden benannt; es wird nie mit stillen Ersatzwerten gerechnet.

### Standortanalyse

- Auslastungsquote und vermietete Tage lassen sich gegenseitig ableiten (Basis 30 Tage). Sind beide eingegeben und widersprechen sich, bleiben beide stehen und eine Warnung erscheint.
- Monatsumsatz wird aus dem Jahresumsatz (÷ 12) abgeleitet; zusätzlich wird eine zweite Schätzung aus Umsatz pro Nacht × vermietete Tage angezeigt. Weichen beide um mehr als 10 % voneinander ab, erscheint eine Warnung.
- Jeder Wert trägt eine Herkunftskennzeichnung („manuell eingegeben“ / „automatisch berechnet“).

## Excel-Import

- Unterstützt .xlsx, .xls, .csv, .tsv.
- Die Zuordnung erfolgt über Spaltennamen (mit Synonymliste), nicht über feste Zellpositionen. Der Vorschlag ist in einem Mapping-Dialog korrigierbar, nicht zugeordnete Spalten werden benannt und ignoriert.
- Deutsche Zahlformate („80,5“, „1.150,00“) werden erkannt. Ungültige oder unplausible Werte (z. B. negative Fläche, mehr als 30 vermietete Tage) werden mit Zeilennummer gemeldet und nicht übernommen; der Rest der Zeile wird importiert.

## Dokumentierte Annahmen und bewusste Vereinfachungen

- 30 Tage pro Monat und 12 Monate pro Jahr als einheitliche Rechenbasis (keine 52-Wochen- oder Kalenderlogik im ersten Release).
- Strom- und Reinigungs-Defaults wie oben, je Objekt änderbar; sie stammen aus der Vorlage und sind als Annahmen im UI ausgewiesen.
- Klassen-basierte Energieverbräuche sind Schätzwerte mit angezeigtem Bereich; Klasse H nutzt 231 als Repräsentativwert.
- Die Normierungstabelle der Flächenproduktivität wird auf den Monatswert angewendet (Auslegung der Vorlage, im Code zentral änderbar).
- Marktdaten (Vergleichsmiete, Standortkennzahlen) werden ausschließlich manuell erfasst; es gibt keine externen API-Abrufe.
- Die Original-Exceldateien („Objektanalyse Eckdaten“, „Standortanalyse NEU 06/2025“) und das Logo lagen beim Bau nicht vor. Alle Tabellenwerte wurden aus der schriftlichen Vorgabe übernommen (zentral in `lib/config/normalization-tables.ts`); die Wortmarke im Header lässt sich durch eine Logodatei unter `public/brand/` ersetzen (siehe `components/header.tsx`).

## Erweiterungsideen

- Persistenz über eine kleine Datenbank oder Cloud-Speicher statt reinem JSON-Export.
- Saisonalisierung (monatsgenaue Auslastung und Preise) statt 30-Tage-Pauschale.
- Direkter Abgleich Objekt gegen Standort (erwarteter vs. kalkulierter Umsatz).
- PDF-Export des Objektvergleichs.
