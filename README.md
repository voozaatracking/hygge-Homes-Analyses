# Hygge Homes | Objekt- und Standortanalyse

Webbasiertes Rechentool zur wirtschaftlichen Analyse von Ferienunterkünften mit zwei Bereichen:

- **Objektanalyse:** konkrete Unterkünfte erfassen und vergleichen (Umsatz, Kosten, Gewinn, Produktivitäten, gewichtete Objektbewertung).
- **Standortanalyse:** manuell recherchierte Marktdaten je Stadt oder Region festhalten und gegenüberstellen (Auslastung, Umsätze, Reinigungskosten, inkl. Datenquelle und Erhebungsdatum).

Der Zugang läuft über Supabase Auth (E-Mail und Passwort, nur auf Einladung). Der Datenstand wird je Nutzer in Supabase gespeichert und zusätzlich im Browser zwischengespeichert; versionierte JSON-Dateien dienen als Export und Import, bestehende Excel-Listen lassen sich importieren.

## Technik

- Next.js (App Router) mit TypeScript
- Supabase: Auth (E-Mail und Passwort über `@supabase/ssr`) und Postgres für Profile und Datenstand
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

1. Repository auf GitHub anlegen und pushen, auf vercel.com „Add New Project“, das Repository importieren. Next.js wird automatisch erkannt.
2. Supabase einrichten, siehe [Supabase Auth einrichten](#supabase-auth-einrichten).
3. In Vercel folgende Umgebungsvariablen für **Production und Preview** setzen und neu deployen:

   | Variable | Zweck |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL des Supabase-Projekts |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Schlüssel: alter anon-Key (JWT) oder neuer `sb_publishable_…`-Key. Per Design öffentlich; Tabellen sind durch Row Level Security ohne Policies nicht erreichbar, der Key dient nur der Anmeldung |
   | `SUPABASE_SERVICE_ROLE_KEY` | Serverschlüssel: alter service_role-Key (JWT) oder neuer `sb_secret_…`-Key; nur serverseitig für Datenzugriff und Nutzerverwaltung, gelangt nie in den Browser |
   | `CRON_SECRET` | Schützt `/api/cron/keepalive`; Vercel sendet den Wert automatisch als Bearer-Token beim täglichen Cron-Aufruf (`vercel.json`), der das Supabase-Free-Projekt vor dem Pausieren bewahrt |

   Supabase stellt von JWT-Schlüsseln auf neue API-Schlüssel um; beide Formate funktionieren mit denselben Variablennamen (`lib/supabase/keys.ts`). Ein `sb_secret_`-Key in der öffentlichen Variable oder ein `sb_publishable_`-Key als Serverschlüssel wird abgewiesen und im Server-Log gemeldet.

   `SITE_PASSWORD` aus der alten Nutzerverwaltung wird nicht mehr gelesen und kann entfernt werden. Ohne die Supabase-Variablen leitet die Produktion auf die Login-Seite und meldet die fehlende Konfiguration.
4. Jeder Push auf `main` erzeugt ein neues Deployment.

**Hinweis:** Preview-Deployments und Production teilen dieselbe Supabase-Datenbank und damit dieselben Nutzer und Datenstände.

## Supabase Auth einrichten

Schritte für den Owner, in dieser Reihenfolge. Nach dem Umbau auf Supabase Auth funktioniert der Login erst, wenn Schritte 1 bis 5 erledigt sind.

1. **Migrationen anwenden.** Im SQL Editor nacheinander `supabase/migrations/20261028000001_baseline.sql`, `supabase/migrations/20261028000002_profiles.sql` und `supabase/migrations/20261028000004_analysis_state_version.sql` ausführen (alternativ Supabase CLI: `supabase db push`). Migration `20261028000003_drop_app_users.sql` noch **nicht** ausführen (siehe Schritt 7).
2. **Authentication konfigurieren.** Unter Authentication > Providers den E-Mail-Provider einschalten, „Enable sign ups“ **ausschalten** (Zugang nur per Einladung), „Confirm email“ einschalten. Unter Authentication > URL Configuration die Site URL (Production-Domain) und als Redirect URLs `https://<production-domain>/auth/callback` sowie `https://*-<team>.vercel.app/auth/callback` für Preview-Deployments eintragen.
   Empfohlen: In den E-Mail-Vorlagen „Invite user“ und „Reset password“ den Link auf `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/set-password` (Invite) bzw. `…&type=recovery&next=/auth/set-password` (Reset) setzen. Dann tauscht der Server den Token direkt gegen eine Sitzung. Ohne diese Anpassung funktionieren die Standardlinks ebenfalls; die Sitzung wird dann im Browser übernommen.
3. **Eigenen SMTP eintragen** (Authentication > SMTP Settings, z. B. Resend oder Postmark) **vor der ersten Einladung**. Der eingebaute Mailversand von Supabase ist stark limitiert und nicht für produktive Einladungen gedacht.
4. **Umgebungsvariablen in Vercel setzen** (Tabelle oben) für Production und Preview, `SITE_PASSWORD` entfernen, neu deployen.
5. **Sich selbst einladen.** Im Supabase-Dashboard unter Authentication > Users „Invite user“ mit der eigenen E-Mail-Adresse, Link aus der E-Mail öffnen, Passwort setzen. Danach `supabase/scripts/migrate-users.sql` öffnen, die Platzhalter `<ADMIN_AUTH_ID>` (eigene Auth-ID aus Authentication > Users) eintragen und die Schritte 1 und 2 des Skripts ausführen: Das setzt die Admin-Rolle mit Plan „internal“ und hängt die bisherige Datenzeile „shared“ auf die eigene Auth-ID um. Ab jetzt ist die Verwaltung unter `/admin` erreichbar.
6. **Zweiten Bestandsnutzer einladen** über `/admin` (Rolle Mitglied, Plan Intern). Nach dem Setzen des Passworts die Platzhalter `<USER2_AUTH_ID>` und `<USER2_OLD_ID>` im Skript eintragen und die Schritte 3 und 4 ausführen; damit wandert die alte Datenzeile auf die neue Auth-ID.
7. **Nach Bestätigung** (beide Nutzer sehen ihre Daten) `supabase/migrations/20261028000003_drop_app_users.sql` ausführen. Das entfernt die alte Tabelle `app_users` endgültig.

Zugriffsregel (serverseitig in `lib/access.ts`): Zugang hat, wer aktiv ist und entweder Admin ist, Plan „internal“ hat oder Plan „pro“ mit leerem oder zukünftigem Gültigkeitsdatum. Alle anderen Konten sehen nur die Seite „Kein Zugang“. Rolle, Plan und Status werden bei jedem Request aus `profiles` gelesen, nie aus dem Cookie.

## Projektstruktur

```
app/(app)/               geschützte Seiten (Start, Objektanalyse, Standortanalyse, Profil, Verwaltung); Layout prüft Sitzung und Zugang
app/(public)/            Login, Passwort vergessen, Passwort setzen, Auth-Callback, Kein Zugang
app/api/                 Route Handler (Datenstand, Nutzerverwaltung, Sitzung, Cron)
proxy.ts                 Sitzung aus Cookies lesen und auffrischen, ohne Sitzung zur Anmeldung
components/              UI-Komponenten (Formulare, Tabellen, Diagramme, Import)
lib/access.ts            einzige Zugriffsschicht: Sitzung, Profil, Zugriffsregel
lib/supabase/            Server-Client (Auth über Cookies), Browser-Client (nur Auth), Service-Client
lib/profile/             Schema der Profil-Einstellungen (profiles.settings)
lib/geo/                 Geokodierung (austauschbarer Anbieter, Nominatim)
hooks/                   Cloud-Sync, Autosave, Profil
lib/calculations/        gesamte Rechenlogik (rein, ohne UI)
lib/config/              zentrale Annahmen und Normierungstabellen
lib/io/                  JSON-Export/Import, Excel-Import, CSV/XLSX-Export
lib/validation/          Eingabevalidierung
supabase/migrations/     Schemaänderungen als SQL-Migrationen (Supabase CLI)
supabase/scripts/        einmalige Skripte (Datenübernahme)
tests/                   Vitest-Tests
```

Rechenlogik und UI sind strikt getrennt: Alle Formeln liegen in `lib/` und sind ohne Browser testbar.

## Profil, Standardannahmen und Firmendaten

Unter `/profil` pflegt jeder Nutzer sein Konto (Anzeigename, Passwort), Standardannahmen für neue Objekte (Strompreis und Aufschlag, Reinigung, Plattformprovision, Kurtaxe, Gästewechsel der Standortanalyse) und Firmendaten (Name, Adresse, Kontakt, Registerangaben, Logo, Primär- und Sekundärfarbe) sowie den Firmensitz als Ausgangspunkt für Entfernungen. Alle Felder sind optional.

- Die Einstellungen liegen als versioniertes JSON in `profiles.settings` (`lib/profile/settings.ts`, Zod mit `schemaVersion` und Defaults für jedes Feld). Spätere Erweiterungen brauchen keine Datenbank-Migration; nur Rolle, Plan, Gültigkeit und aktiv sind echte Spalten.
- API: `GET /api/profile` liefert Anzeigename, E-Mail, Plan, Gültigkeit und die mit Defaults aufgefüllten Einstellungen; `PUT /api/profile` speichert Anzeigename und Einstellungen (Zod-validiert, 400 bei Fehlern). Die Passwortänderung läuft über Supabase Auth; `lib/supabase/browser.ts` wird ausschließlich für Auth-Vorgänge genutzt, nie für Tabellen.
- Standardannahmen gelten für neue Objekte und Standorte (`emptyProperty`, `emptyLocation` mit Profil-Defaults). Bestehende Objekte, Duplikate und importierte Dateien bleiben unverändert.
- Logo: PNG, JPEG oder SVG als Data-URL, maximal 300 KB nach clientseitiger Verkleinerung. Kein Storage-Bucket in dieser Phase.

## Entfernung und Fahrtkosten

- Objekte haben eine Adresse mit optionalen Koordinaten (Tab Kosten, „Koordinaten ermitteln“, serverseitig über `/api/geocode`). Koordinaten gelten nur für den Adresstext, zu dem sie ermittelt wurden.
- Entfernung zum Firmensitz: Luftlinie (Haversine) × Umwegfaktor `DETOUR_FACTOR` = 1,3 (`lib/config/assumptions.ts`, `lib/geo/distance.ts`). Keine Einstellung im UI und keine manuelle Kilometerüberschreibung; im UI als „geschätzt aus Luftlinie“ gekennzeichnet. Berechnet, sobald Objekt- und Firmensitz-Koordinaten vorliegen, auch ohne Fahrtkosten. Erscheint im Report und in der Vergleichstabelle.
- Fahrtkosten für die Reinigung (optional, Haken „Fahrtkosten für Reinigung einrechnen“): Ausgangspunkt Firmensitz oder eigene Adresse; Kilometerpauschale = Strecke × 2 (Hin und zurück) × Satz × Fahrten pro Monat, oder Fixpreis je Fahrt (Hin und zurück) × Fahrten. Fahrten pro Monat leer bedeutet Reinigungen pro Monat des Objekts. Kostenzeile „Fahrtkosten Reinigung“ zählt als Fixkosten (wie die Reinigung), nicht umsatzabhängig. Wert 0 bedeutet keine Kostenzeile. Fehlen Koordinaten, Satz oder Fahrten, erscheint am Feld ein Hinweis.
- Die Rechenlogik bleibt frei von IO: `deriveProperty(input, context)` bekommt die Firmensitz-Koordinaten als Parameter (`DeriveContext`), der Provider stellt sie aus dem Profil bereit.

## Gebrandeter Report (PDF)

- „Report / PDF“ am Objekt öffnet die Report-Ansicht: Vorschau des Objektsteckbriefs, Sektionen für diesen Ausdruck abwählbar (ändert das Profil nicht), „Als PDF speichern“ ruft den Browser-Druckdialog auf (`window.print()`, keine PDF-Bibliothek). Der Dateiname kommt aus `document.title` (Objektname und Datum).
- Kopf (`components/report/report-header.tsx`): Logo, Firmenname und Adresse aus dem Profil; Fuß (`components/report/report-footer.tsx`): Kontakt, Registerangaben, Datum, Hinweistext. Fehlende Felder werden nicht gerendert. Primär- und Sekundärfarbe wirken nur als Akzente (Überschriften, Linien, Tabellenkopf); ohne Farben greifen die App-Farben. Beide Komponenten sind für die Standortanalyse wiederverwendbar.
- Sektionen mit stabilen Kennungen (`lib/report/sections.ts`): `basics`, `revenue`, `costs`, `results`, `scenarios`. Die Standardauswahl und die Kopf-/Fußbestandteile stehen in `profiles.settings.report` (Bereich „Report“ auf `/profil`).
- Druck: `@page` A4 mit 15 mm Rand, Navigation und Bedienelemente ausgeblendet, Seitenumbrüche nur zwischen Sektionen (`break-inside: avoid`), Farben per `print-color-adjust: exact`.

## Sicherheit, Rechtsseiten und Betrieb

- **Security-Header** (`lib/security-headers.ts`, `next.config.ts`): Content-Security-Policy mit Supabase (Projekt-URL aus `NEXT_PUBLIC_SUPABASE_URL`, sonst `*.supabase.co`) und Nominatim als erlaubten Zielen, `frame-ancestors 'none'`, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; Strict-Transport-Security nur in Produktion (`VERCEL_ENV=production`). Preview lässt die Vercel-Toolbar (`vercel.live`) zu, Entwicklung `'unsafe-eval'` für React Refresh.
- **Rechtsseiten** `/impressum`, `/datenschutz`, `/agb` sind öffentlich erreichbar (Footer) und enthalten nur Platzhalter, die klar als „vom Owner zu ersetzen“ markiert sind. Vor der öffentlichen Bewerbung durch geprüfte Texte ersetzen.
- **Onboarding**: Ohne Objekte zeigt die Objektanalyse einen leeren Zustand mit Erklärung und „Beispielobjekt laden“ (fiktives Objekt aus `lib/sample-data.ts`). Nichts wird automatisch angelegt.
- **Hinweise statt Pflichtfelder**: Jede Kennzahl, die wegen fehlender Eingaben nicht berechenbar ist, nennt den fehlenden Wert (`lib/calculations/missing.ts`), nach dem Muster der Kurtaxe.
- **Rate-Limit** für `/api/geocode`: 30 Anfragen pro Nutzer und Stunde, Antwort 429 mit `Retry-After`. Zähler im Arbeitsspeicher je Serverinstanz (`lib/rate-limit.ts`); bei Serverless zählt jede Instanz getrennt und verliert den Stand beim Kaltstart. Für harte Grenzen später eine Tabelle.

## Geokodierung

Adressen (Firmensitz, später Objekte) werden nur serverseitig über `POST /api/geocode` in Koordinaten umgesetzt (`lib/geo/geocode.ts`, Anbieter austauschbar). Koordinaten werden zusammen mit dem Adresstext gespeichert und nur neu ermittelt, wenn sich der Text ändert.

Erster Anbieter ist **Nominatim (OpenStreetMap)**. Nutzungshinweis: Die Nominatim-Nutzungsbedingungen verlangen einen aussagekräftigen User-Agent mit Kontaktmöglichkeit und erlauben höchstens eine Anfrage pro Sekunde; beides ist in `lib/geo/geocode.ts` umgesetzt (User-Agent `hygge-homes-analyse/1.0 (<Origin>)`, Anfragen je Serverinstanz serialisiert). Der Dienst ist für geringe Volumina gedacht, nicht für Massenabfragen; Anfragen gibt es nur auf Knopfdruck eines angemeldeten Nutzers. Bei wachsendem Volumen wird auf einen Anbieter mit API-Schlüssel gewechselt; dafür genügt ein weiterer `GeocodeProvider`.

## Datenmodell und Speicherung

- Der gesamte Zustand (Objekte und Standorte) wird als eine JSON-Datei exportiert und importiert.
- Die Datei trägt `schemaVersion` und `calcVersion` plus einen Schnappschuss der Annahmen. Ältere Versionen werden migriert (aktuell nur Version 1), neuere mit verständlicher Meldung abgelehnt.
- Der Datenstand wird je Nutzer als eine Zeile in Supabase gespeichert (`analysis_state`, Schlüssel ist die Auth-ID, Optimistic Lock über die Spalte `version`: Der Server speichert nur, wenn die vom Client erwartete Version noch gilt, sonst antwortet er mit 409 und dem aktuellen Stand, und der Nutzer wählt im Footer „Serverstand laden“ oder „Trotzdem speichern“). Rolle, Plan und Status liegen in `profiles`; die Profilzeile entsteht per Trigger beim Anlegen des Auth-Nutzers und im Browser-Storage zwischengespeichert. Der JSON-Export bleibt die dauerhafte Sicherung. Ungespeicherte Änderungen lösen beim Verlassen der Seite eine Browser-Warnung aus.

## Berechnungslogik (Kurzfassung)

Rechenbasis: **30 Tage pro Monat, 12 Monate pro Jahr.**

- Effektiver Nachtpreis: bei „pro Unterkunft“ der eingegebene Preis, bei „pro Bett“ Preis × Bettenanzahl.
- Auslastungsquote = vermietete Tage / 30 (zulässig 0 bis 30 Tage).
- Monatsumsatz = effektiver Nachtpreis × vermietete Tage, Jahresumsatz = Monatsumsatz × 12.
- Mindestpreis pro Nacht bei Vollauslastung = monatliche Gesamtkosten / 30.
- Stromkosten (Schätzung): Verbrauch (kWh/qm p.a.) × Fläche × Strompreis (Default 0,35 €/kWh), plus Aufschlag (Default 30 %) für Übernachtungsbetrieb, durch 12 als Monatswert. Annahmen je Objekt editierbar; ein manuell eingegebener Wert hat immer Vorrang und wird als „manuell eingegeben“ gekennzeichnet.
- Reinigungskosten (Schätzung): Fläche × 2 min/qm ÷ 60 × 22 €/h × 4 Wechsel pro Monat, Annahmen je Objekt editierbar, manueller Wert hat Vorrang.
- Kurtaxe / Tourismusabgabe (optional): wahlweise in € pro Person und Nacht (Kostenzeile = Betrag × Betten × vermietete Nächte) oder in Prozent vom Übernachtungspreis (Kostenzeile = Monatsumsatz × Prozent, dieselbe Preisbasis wie die Plattformprovision). Es gilt nur der gewählte Modus; der Wert 0 bedeutet „keine Abgabe“. Die Kurtaxe zählt in beiden Modi als variable Kostenart und mindert den Deckungsbeitrag pro Nacht im Break-even.
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

- Saisonalisierung (monatsgenaue Auslastung und Preise) statt 30-Tage-Pauschale.
- Direkter Abgleich Objekt gegen Standort (erwarteter vs. kalkulierter Umsatz).
- PDF-Export des Objektvergleichs und gebrandeter Report für die Standortanalyse (Kopf und Fuß liegen bereits wiederverwendbar vor).
