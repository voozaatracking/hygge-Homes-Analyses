# Roadmap

## Ziel
Hygge Homes Analyse wird von einem internen Tool zu einem SaaS mit eigenen Nutzerprofilen und Abo-Modell ausgebaut. Der Umbau erfolgt schrittweise, jeder Schritt als eigener PR.

## Phasen

### 1. Kleine fachliche Änderungen am bestehenden Stand (laufend)
Keine Strukturänderungen.

Aufräumpunkte:
- `supabase/schema.sql` ist unvollständig: Die Tabelle `app_users` fehlt, obwohl `lib/users.ts` sie voraussetzt. Wird in Phase 2 durch Migrationen unter `supabase/migrations/` ersetzt (Supabase CLI), die den tatsächlichen Stand abbilden.
- Es gab keine `.gitignore`; Build-Artefakte (`node_modules/`, `.next/`, `tsconfig.tsbuildinfo`) lagen untracked im Arbeitsverzeichnis und konnten versehentlich committet werden. `.gitignore` ergänzt (erledigt mit Aufgabe 1).
- README war veraltet (sagte „alle Daten bleiben im Browser“ und „keine Umgebungsvariablen nötig“). Erforderliche Variablen: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_PASSWORD`. Abschnitt Deployment im README korrigiert (erledigt mit Aufgabe 1).

Aufgaben:
- Aufgabe 1: Kurtaxe wahlweise in Prozent vom Übernachtungspreis oder in Euro pro Person und Nacht. Status: erledigt.
- Aufgabe 2: Keep-alive für Supabase Free (täglicher Vercel-Cron auf `/api/cron/keepalive`, geschützt über `CRON_SECRET`). Status: erledigt.

### 2. Nutzerprofile
Ein Profil pro Nutzer mit mehr Einstellungen und individualisierbarem UI.

Entscheidung des Owners:
- Auth-Strategie: Supabase Auth, E-Mail und Passwort. Der eigene Login (`lib/session.ts`, `lib/passwords.ts`, Master-Notzugang über `SITE_PASSWORD`) wird vollständig abgelöst.
- Zugang zunächst nur per Einladung durch den Admin, Selbstregistrierung wird erst mit Phase 3 (Payment) freigeschaltet.
- Keine Teams. Daten hängen am Nutzer.
- Tabelle `profiles` mit `role` (admin, member), `plan` (none, internal, pro) und `plan_valid_until`. Kein Free-Tier: „pro“ ist der bezahlte Plan, „internal“ für Konten ohne Payment. Zugriffsregel: aktiv und (Admin oder internal oder pro mit leerem oder zukünftigem Datum). Serverseitige Prüfung bei jedem Datenzugriff in `lib/access.ts`; bis Payment existiert, setzt der Admin den Plan manuell, später schreibt der Payment-Webhook dieselben Felder.
- Datenzugriff bleibt serverseitig über Route Handler und Service-Role-Key; der Browser spricht nicht direkt mit Tabellen. RLS auf allen Tabellen ohne Policies.
- Bestehende Nutzer: Neustart der Nutzerverwaltung, zwei Bestandsnutzer werden per `supabase/scripts/migrate-users.sql` übernommen.

Teilschritte:
- 2a Supabase Auth, Profile, Migrationen (`supabase/migrations/`), Einladung, Passwort setzen und zurücksetzen, Nutzerverwaltung mit Rolle, Plan, Gültigkeit, Status. Status: erledigt (PR 4). Owner-Schritte in der README, Abschnitt „Supabase Auth einrichten“; Migration `0003_drop_app_users` erst nach bestätigter Datenübernahme.
- 2b Optimistic Lock für `analysis_state` (Spalte `version`, bedingtes Update in einer Anweisung, 409 mit aktuellem Stand, Konfliktauflösung im Client: „Serverstand laden“ oder „Trotzdem speichern“). Status: erledigt (PR 5, Migration 0004).
- 2c Profil, Standardannahmen, Firmendaten, Objektadresse, Entfernung und Fahrtkosten, in drei PRs:
  - PR 6: Formular-Refactoring ohne Verhaltensänderung (`components/property-form/` Sektionen, Cloud-Sync und Autosave als Hooks). Status: erledigt.
  - PR 7: Profilseite `/profil` (Konto, Standardannahmen, Firmendaten mit Logo und Farben, HQ-Adresse mit Geokodierung), `profiles.settings` als versioniertes Zod-Schema (`lib/profile/settings.ts`), `/api/profile`, `/api/geocode` (Nominatim hinter austauschbarer Schnittstelle), neue Objekte mit Profil-Defaults. Status: erledigt.
  - PR 8: Objektadresse mit Koordinaten, Entfernung zum HQ (Luftlinie × `DETOUR_FACTOR` 1,3), Fahrtkosten für Reinigung (Kilometerpauschale Hin und zurück oder Fixpreis je Fahrt) als Fixkostenzeile, Entfernung in Report und Vergleichstabelle. Status: erledigt.
- 2d Gebrandeter Report mit KPI-Auswahl (PR 9): Kopf und Fuß aus den Firmendaten, Primär- und Sekundärfarbe als Akzente, stabile Sektionskennungen, Auswahl im Profil und temporär am Report, Druckansicht A4 über `window.print()`. Status: offen.

Entscheidungen für 2c und 2d (getroffen): Einzelnutzer ohne Teams; alle Profil- und Firmenfelder optional, fehlende Werte werden nicht gerendert; `profiles.settings` ist versioniertes JSON mit Zod-Defaults, nur Rolle, Plan, Gültigkeit und aktiv bleiben Spalten; Entfernung ohne manuelle Überschreibung; Fahrtkosten sind Fixkosten, Wert 0 bedeutet keine Zeile; Geokodierung nur serverseitig, Koordinaten werden mit der Adresse gespeichert und nur bei geändertem Adresstext neu ermittelt; Logo als Data-URL (PNG, JPEG, SVG, maximal 300 KB) ohne Storage-Bucket; PDF über Druckansicht ohne PDF-Bibliothek.

### 3. Abo und Payment
Anbieter noch nicht entschieden (Stripe oder Mollie). Vorbereitung unabhängig vom Anbieter: Plan und Rolle am Nutzer, eigene Abo-Tabelle, zentrales Feature-Gating serverseitig, Webhook-Route.

Status: offen.

### 4. Datenbank-Skalierung
Supabase bleibt vorerst. Damit ein späterer Umzug billig bleibt: Datenzugriff gebündelt halten, Schemaänderungen nur als SQL-Migrationen im Repo.

## Arbeitsregeln
- Pro Aufgabe ein neuer Branch, nie direkt auf main.
- Vor jedem Commit: `npm run lint`, `npm run test`, `npm run build`. Fehler beheben.
- Am Ende ein PR mit kurzer Beschreibung: was, warum, was getestet.
- Keine Änderungen am Supabase-Schema und keine neuen Abhängigkeiten ohne Rückfrage.
- Gespeicherte Analyse-JSONs müssen abwärtskompatibel bleiben: neue Felder mit Defaults im Zod-Schema (`lib/io/json-file.ts`) und in `lib/utils.ts`.
- UI-Texte auf Deutsch, bestehende Benennungen beibehalten.
- Bestehende Tests erweitern, nicht umschreiben.
- Bei jeder Aufgabe: ROADMAP.md lesen und nach erledigten Schritten den Status hier aktualisieren.
