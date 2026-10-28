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
- Auth-Strategie: Supabase Auth, E-Mail und Passwort. Der eigene Login (`lib/session.ts`, `lib/passwords.ts`, Master-Notzugang über `SITE_PASSWORD`) wird in Phase 2 vollständig abgelöst.
- Zugang zunächst nur per Einladung durch den Admin, Selbstregistrierung wird erst mit Phase 3 (Payment) freigeschaltet.
- Tabelle `profiles` mit `role` (admin, member) und `plan` (frei, pro) plus Gültigkeitsdatum. Serverseitige Prüfung bei jedem Datenzugriff. Bis Payment existiert, setzt der Admin den Plan manuell; später schreibt der Payment-Webhook dasselbe Feld.
- Bestehende Nutzer: Neustart der Nutzerverwaltung, nur ein Bestandsnutzer wird übernommen (Datenzeile in `analysis_state` auf die neue Auth-ID umhängen).

Status: entschieden, Umsetzung folgt nach Aufgabe 1.

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
