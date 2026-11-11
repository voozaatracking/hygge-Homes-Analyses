# PROJEKTSTATUS Hygge Homes Analyse

Stand: 11. November 2026, nach Session 3 und der anschließenden Claude-Code-Session (PR 14 bis 18)

## 1. Zweck und Nutzung dieses Dokuments

Dieses Dokument hält alles fest, was in Session 1 bis 3 entschieden, gebaut und konfiguriert wurde, welche Werte und Informationen gelten und was als Nächstes kommt. Es ist so geschrieben, dass eine neue Chat-Session ohne Vorwissen damit weiterarbeiten kann.

So wird damit gearbeitet:

1. Neue Chat-Session (Konzept, Entscheidungen, Owner-Schritte): Den Kontext-Prompt aus Abschnitt 13 einfügen, dann dieses Dokument anhängen. Für die Rechtstexte zusätzlich die vier Dateien aus Session 3 anhängen (impressum.md, datenschutz.md, agb.md, rechtstexte-pruefliste.md).
2. Claude Code (Umsetzung im Repo): Claude Code liest CLAUDE.md, AGENTS.md und ROADMAP.md automatisch (CLAUDE.md bindet derzeit nur AGENTS.md und ROADMAP.md ein; der Verweis auf docs/PROJEKTSTATUS.md fehlt noch, siehe Abschnitt 9). Die Fassung im Repo wird von Claude Code mit jedem PR fortgeschrieben; diese Fassung ist führend.
3. Arbeitsteilung: Chat plant, entscheidet und formuliert Prompts; Claude Code setzt um, testet, erstellt Branches und PRs; der Owner merged und erledigt die Schritte in Vercel, Supabase und Strato.

Hinweis: Alle drei Sessions liefen in Incognito-Chats ohne Gedächtnis. Alles Wissen daraus steckt in diesem Dokument, in den Rechtstext-Dateien und im Repo (ROADMAP.md, README.md, docs/).

**Stand am Ende der Claude-Code-Session vom 11.11.2026 (geklärt):**

- PR 14 ist gemerged. Der 3-Minuten-Test der Abmeldung wurde auf der Preview durchgeführt. Der TEMP-Commit (SESSION_MAX_HOURS = 0,05) war versehentlich mit PR 14 in main gelangt und wurde mit PR 15 zurückgenommen; SESSION_MAX_HOURS auf main ist 12.
- Objektübersicht und Pricing-Empfehlungen (ursprünglich als "PR 15" geplant) sind als PR 16 und PR 17 gemerged. PR 16 war versehentlich gegen den bereits gemergten Branch von PR 15 geöffnet und enthielt deshalb nichts Neues für main; PR 17 ist derselbe Branch gegen main.
- Thilo hat die Rechtstexte durchgesehen und freigegeben, sie zunächst so einzusetzen; Überarbeitung folgt. PR 18 (Branch feat/legal-pages) setzt die Texte ein und ist offen. Die 17 Prüfhinweise [PRÜFEN: …] stehen noch im Text und sind auf den Seiten sichtbar markiert.

**Zu Beginn der nächsten Session zuerst prüfen:**

- Ist PR 18 gemerged, und sehen /impressum, /datenschutz und /agb#widerruf auf Production richtig aus?
- Hat Thilo die Prüfhinweise beantwortet (USt-IdNr., Fristen, Preise, Kontaktadresse, Namensnutzung)?
- Soll die Zustimmung zu AGB und Datenschutz bei der Registrierung gespeichert werden (Vorschlag in PR 18, Abschnitt 9 Punkt 1)?

## 2. Produkt, Ziel und Grundentscheidungen

### Produkt

Hygge Homes Analyse ist ein webbasiertes Rechentool zur Wirtschaftlichkeitsanalyse von Ferienunterkünften:

- Objektanalyse: Unterkünfte erfassen und vergleichen (Umsatz, Kosten, Gewinn, Produktivitäten, Break-even, Szenarien, gewichtete Objektbewertung, Empfehlungswerte für das Pricing-Tool). Seit PR 17 mit Übersicht aus Kacheln und Detailansicht je Objekt.
- Standortanalyse: Manuell recherchierte Marktdaten je Stadt oder Region erfassen und gegenüberstellen.
- Report: Gebrandeter Objektsteckbrief als PDF, z. B. für Banken.

### Ziel

Vom internen Tool zu einem SaaS mit eigenen Nutzerkonten und Abo-Modell. Umbau schrittweise, jeder Schritt als eigener PR. Seit Session 2 können sich Nutzer selbst registrieren; das Abo (Phase 3) fehlt noch.

### Grundentscheidungen (gelten bis auf Widerruf)

| Thema | Entscheidung |
|---|---|
| Betreiber (neu in Session 3) | Westerwiede & Westerwiede GbR, Habichtsweg 21, 21385 Amelinghausen. Gesellschafter Thilo Westerwiede und Anna Westerwiede. Keine eGbR, kein Handelsregistereintrag. Die Hygge Homes ND GmbH ist nicht Betreiber des Tools. Der Projekt-Owner (Repo, Vercel, Supabase) ist Mitarbeiter von Thilo und rechtlich nicht Betreiber. Kontakt vorerst info@hygge-homes.de und +49 4171 60 888 20. |
| Datenbank | Supabase bleibt (Postgres). Späterer Upgrade-Pfad: Supabase Pro im selben Projekt, kein Umzug. Portabilität durch Migrationen im Repo und gebündelten Datenzugriff. |
| Auth | Supabase Auth mit E-Mail und Passwort. Eigener Login vollständig entfernt. Lock-in bei Auth bewusst akzeptiert. |
| Zugang | Offene Selbstregistrierung über /registrieren mit Bestätigungsmail. Jedes neue Konto erhält automatisch den Startplan aus lib/config/registration.ts (derzeit pro, 180 Tage). Keine Einladungscodes. Phase 3 setzt den Startplan auf none und führt zur Abo-Seite. Admin kann weiterhin Nutzer direkt anlegen und einladen. |
| Übergang ins Abo (offen, Session 3) | Der AGB-Entwurf sieht vor: kostenlose Phase endet automatisch, kein automatischer Übergang in ein bezahltes Abo. Thilo äußerte die Idee "Code, drei Monate kostenlos, danach automatisch Payment". Das widerspricht den bisherigen Entscheidungen (keine Codes, 180 Tage) und erfordert Zahlungsdaten bei der Registrierung. Entscheidung durch Thilo vor Phase 3. |
| Sitzung (Session 3, PR 14 und 15) | Automatische Abmeldung 12 Stunden nach der Anmeldung, absolute Höchstdauer, kein Inaktivitäts-Timer. Prüfung in der App (proxy.ts, lib/access.ts, Client-Prüfung über /api/me jede Minute und beim Zurückkehren in den Tab), weil die Supabase-Sitzungsgrenzen erst ab Pro verfügbar sind. Keine Migration dafür. "Eine Sitzung je Nutzer" (gegen geteilte Konten) erst später mit Supabase Pro. Die Weiterleitung zum Login erfolgt ohne Browser-Rückfrage "Seite verlassen?" (lib/unload-guard.ts). |
| Nutzermodell | Einzelnutzer, keine Teams. Zielgruppe: Einzelinvestoren, Unternehmer und Verbraucher. Weitergabe von Ergebnissen über den Report. |
| Pläne | Ein bezahlter Plan pro plus internal für Konten ohne Payment (intern, privat, Thilo). Kein Free-Tier. none bedeutet kein Zugang. |
| Rollen | admin und member. Admins sehen die Verwaltung. Niemand kann die eigene Rolle ändern. |
| Payment-Anbieter | Formal noch offen: Stripe oder Mollie (über Payline Dock). Thilo und Owner tendieren seit Session 3 zu Stripe. Endgültige Entscheidung vor Phase 3 (Abschnitt 12). |
| Brutto und Netto (Session 3) | Alle Beträge im Tool sind Bruttobeträge. Hinweis im Formular, im Profil, in der Standortanalyse und im Report. Kein Umrechnungsschalter, weil die Umsatzsteuersätze je Position verschieden sind. |
| Pricing-Tool (Session 3, PR 17) | Reiter "Pricing-Tool" je Objekt als reine Empfehlungsansicht: zwei berechnete Werte (Mindestpreis, Basispreis) und drei feste Empfehlungen aus Konstanten. Keine Eingabefelder, kein Einfluss auf die Rechnung, nicht im Report. Werte von Thilo, siehe Abschnitt 7. |
| Aufbau Objektanalyse (Session 3, PR 17) | Übersicht mit Kacheln je Objekt (Name, Adresse, Gewinn oder Verlust pro Monat), Klick öffnet die Detailansicht mit Zusammenfassung und Reitern. Vergleichen, Neues Objekt und Beispielobjekt nur in der Übersicht. Geöffnetes Objekt als Suchparameter ?objekt=<id> in der URL. Kein allgemeiner UI-Umbau darüber hinaus. |
| Individualisiertes UI | Gebrandeter Report mit Logo, Farben, Firmendaten und KPI-Auswahl. |
| Profilfelder und Adressen | Alle Profil-, Firmen- und Adressfelder optional. Keine Pflichtfelder. Fehlende Eingaben werden als konkreter Hinweis genannt. |
| PDF | Druckoptimierte Reportseite und Browser-Druckdialog. Keine PDF-Bibliothek. |
| Geokodierung | Nominatim (OpenStreetMap), serverseitig, austauschbarer Anbieter. Keine Routing-API; Entfernung bleibt Luftlinie mal 1,3 (Praxistest: 71 km geschätzt, 74 km laut Google Maps). |
| Domain | App läuft weiter unter hygge-homes-analyses.vercel.app. Die Domain hygge-homes.de liegt bei Strato und wird für den Mailversand genutzt; Umzug der App auf eine Subdomain steht auf der Checkliste (Abschnitt 8). Thilo empfindet die aktuelle Adresse als unschön. |
| E-Mail-Versand | Custom SMTP über das Strato-Postfach portal@hygge-homes.de. Deutsche Vorlagen mit token_hash-Links liegen im Repo. Bei Volumen oder Zustellproblemen Wechsel auf Resend ohne Codeänderung. |
| E-Mail-Bestätigung | Pflicht. Ohne bestätigte Adresse keine Anmeldung. "Bestätigungsmail erneut senden" existiert. |
| Spam-Schutz | Honeypot-Feld plus Rate-Limits. CAPTCHA (Turnstile über Supabase Attack Protection) erst bei tatsächlichem Spam. |
| Schriften | Oswald und Jost als lokale WOFF2-Dateien unter app/fonts/ über next/font/local. |
| Datenmodell | Eine jsonb-Zeile je Nutzer (analysis_state) mit Optimistic Lock. Aufteilung in Tabellen erst bei Bedarf (Phase 4). |
| Rechtstexte (Session 3, PR 18) | Impressum, Datenschutzerklärung und AGB mit Widerrufsbelehrung sind als Entwurf eingesetzt (Anrede "Sie"). Thilos Durchsicht am 11.11.2026 ergab die Freigabe zum Einsetzen; die Prüfhinweise werden später aufgelöst und die Texte erneut eingesetzt. Abo- und Widerrufsklauseln vor Phase 3 anwaltlich prüfen. Keine Rechtsberatung aus dem Chat. Texte werden nur über die Vorlagen geändert, nie direkt im Code. |

## 3. Technischer Stand: Stack, Architektur, Datenmodell

### Stack

- Next.js 16 (App Router, proxy.ts statt middleware.ts), React 19, TypeScript, Tailwind CSS 4
- @supabase/supabase-js, @supabase/ssr
- Recharts, zod, SheetJS/xlsx, Vitest (248 Tests nach PR 18)
- Schriften Oswald und Jost lokal über next/font/local (app/fonts/)

### Architektur

- Rechenlogik strikt von der UI getrennt in lib/calculations/, ohne Browser testbar. deriveProperty(input, context) bekommt Firmensitz-Koordinaten als Parameter, kein IO in der Rechenlogik. Break-even-Nachtpreis, Mindestpreis und Basispreis in lib/calculations/pricing.ts.
- Datenzugriff ausschließlich serverseitig über Route Handler mit Service-Role-Key. Der Browser spricht nie direkt mit Tabellen. RLS auf allen Tabellen aktiv, ohne öffentliche Policies.
- lib/supabase/browser.ts nur für Auth-Vorgänge (Login, Reset anfordern, Passwort setzen und ändern).
- lib/supabase/server.ts: Cookie-gebundener Server-Client, dazu getServerAuthClient() als Anon-Client ohne Cookie-Anbindung für signUp und resend.
- lib/access.ts ist die einzige Zugriffsschicht: getSessionUser(), getAccess(userId) liefert Rolle, Plan, Gültigkeit, aktiv, hasAccess, isAdmin. Rolle und Plan werden bei jedem Request aus profiles gelesen, nie aus dem Cookie. Ein abgelaufener Plan sperrt daher sofort, unabhängig von der Sitzung. Payment hängt sich in Phase 3 nur hier ein.
- Sitzungsgrenze (PR 14 und 15): SESSION_MAX_HOURS in lib/config/session.ts, Prüfung in proxy.ts und lib/access.ts (lib/session-limit.ts). Anmeldezeitpunkt aus einem signierten httpOnly-Cookie hh_session_start, gebunden an die session_id aus dem JWT, plus auth.users.last_sign_in_at als Untergrenze; der frühere Zeitpunkt zählt. Signatur mit dem Service-Role-Key (kein eigenes Secret; bei Wechsel des Schlüsselformats werden die Cookies ungültig, Folge höchstens eine Neuanmeldung). Bei Ablauf: Seiten leiten auf /login mit Meldung, API antwortet 401 mit expired: true, der Client sichert den lokalen Stand nur bei ungespeicherten Änderungen (Marker hygge-analyse-pending-v1) und bietet nach erneuter Anmeldung die Konfliktauflösung nur an, wenn sich lokaler und Serverstand unterscheiden. Der Client fragt /api/me jede Minute und beim Zurückkehren in den Tab, damit die Abmeldung auch ohne Speichervorgang greift. Bekannte Lücke: Wer sein Cookie löscht, kann die Frist im Einzelfall verlängern; bewusst akzeptiert.
- Objektanalyse (PR 17): app/(app)/object-analysis/page.tsx zeigt Übersicht oder Detail, abhängig vom Suchparameter ?objekt=<id>. Kachelwerte aus lib/overview.ts (tileSummary, findObject) als reine Funktionen. Unbekannte Kennung führt zur Übersicht mit Hinweis. Zustand und Sync bleiben unverändert; der Wechsel zwischen Übersicht und Detail erzeugt keinen Speicherkonflikt.
- Rechtsseiten (PR 18): Texte als typisierte Blöcke in lib/legal/ (impressum.ts, datenschutz.ts, agb.ts, types.ts), Renderer components/legal/legal-document.tsx (Überschriften, Absätze, Listen, nummerierte Absätze mit Unterpunkten, Fettdruck, Web-Adressen als Links, Prüfhinweise als Markierung). Die Widerrufsbelehrung steht in den AGB nach einer Trennlinie unter der Sprungmarke #widerruf. Solange ein Text Prüfhinweise enthält, steht ein Hinweis "Entwurf" über dem Text.
- Route-Gruppen: app/(app)/ geschützt (Server-Layout prüft Sitzung und Zugang, force-dynamic), app/(public)/ für Login, /registrieren, /auth/forgot, /auth/callback, /auth/set-password, /no-access, /impressum, /datenschutz, /agb. Die Fußzeile mit Impressum, Datenschutz und AGB liegt im Root-Layout und erscheint auf allen Seiten.
- /auth/callback verarbeitet Code (PKCE), token_hash (Typen email, signup, invite, recovery) mit next-Parameter, und Fragment (#access_token).
- Zugriffsregel: Zugang hat, wer active = true ist und (Admin oder Plan internal oder Plan pro mit leerem oder zukünftigem plan_valid_until). Alle anderen sehen /no-access.

### Registrierungsflow (seit PR 11 und 12)

1. Nutzer öffnet /registrieren (Anzeigename optional, E-Mail, Passwort, Passwort wiederholen, verstecktes Honeypot-Feld website, Pflicht-Checkbox mit Links auf /agb und /datenschutz).
2. POST /api/register: Zod-Validierung, Honeypot (bei Inhalt 201 ohne Aktion), Rate-Limit 10 je IP und Stunde, Dublettenprüfung über profiles.email (409, bei unbestätigtem Konto zusätzlich unconfirmed: true), signUp über den Anon-Client mit emailRedirectTo {origin}/auth/callback?next=/, danach per Service-Role in profiles: plan, plan_valid_until, display_name, active. Antwort 201, keine Sitzung.
3. Supabase sendet die Bestätigungsmail über den Strato-SMTP mit der Vorlage "Confirm signup".
4. Nutzer klickt, /auth/callback verifiziert, Sitzung entsteht, Weiterleitung auf die Startseite.
5. Anmeldeversuch vor Bestätigung: Meldung "Bitte bestätige zuerst deine E-Mail-Adresse." mit Button "Bestätigungsmail erneut senden".
6. POST /api/register/resend { email }: Rate-Limit 3 je E-Mail und 10 je IP pro Stunde; Antwort immer neutral 200.
7. Unbestätigte Konten haben bereits den Startplan, können sich aber nicht anmelden. Kein automatisches Aufräumen; der Admin löscht sie in der Verwaltung.
8. Geprüft in PR 18: Zeitpunkt und Fassung der Zustimmung zu AGB und Datenschutz werden nicht gespeichert. Die Checkbox ist nur im Browser Pflicht, /api/register kennt kein entsprechendes Feld. Die Datenschutzerklärung nennt die Zustimmung aber als gespeichertes Datum. Vorschlag und Entscheidung in Abschnitt 9.

### Projektstruktur

```
app/(app)/               geschützte Seiten (Start, Objektanalyse mit Übersicht und Detail, Standortanalyse, Profil, Verwaltung)
app/(public)/            Login, Registrieren, Passwort vergessen, Passwort setzen, Auth-Callback, Kein Zugang, Rechtsseiten
app/api/                 Route Handler (data, profile, geocode, register, register/resend, admin/users, logout, me, cron/keepalive)
app/fonts/               Oswald und Jost als variable WOFF2 (OFL)
app/layout.tsx           Root-Layout mit Fußzeile (Impressum, Datenschutz, AGB)
proxy.ts                 Sitzung aus Cookies lesen und auffrischen, Sitzungsgrenze prüfen; öffentliche Pfade
components/              UI (property-form/ in Sektionen inkl. Pricing-Tool, object-overview, object-detail, report/, admin-panel, profile-page, legal/)
hooks/                   use-cloud-sync, use-autosave, use-profile
lib/access.ts            Zugriffsschicht
lib/session-limit.ts     signiertes Sitzungs-Cookie, effektiver Anmeldezeitpunkt
lib/unload-guard.ts      Weiterleitung bei Ablauf ohne Browser-Rückfrage
lib/overview.ts          Kachelwerte und Objektsuche für die Übersicht
lib/legal/               Rechtstexte als Blöcke (impressum, datenschutz, agb, types)
lib/supabase/            server, browser (nur Auth), admin (Service-Role), keys
lib/config/registration.ts  Startplan für neue Registrierungen
lib/config/session.ts    SESSION_MAX_HOURS
lib/config/assumptions.ts   Konstanten inkl. Pricing-Konstanten
lib/config/texts.ts      Brutto-Hinweis
lib/registration.ts      planValidUntil, Passwortregel
lib/profile/settings.ts  Zod-Schema der Profil-Einstellungen
lib/geo/                 geocode (Nominatim), distance (Haversine)
lib/calculations/        Rechenlogik, missing.ts (Hinweise, describeTravelIssues), pricing.ts (Break-even-Nachtpreis, Mindestpreis, Basispreis)
lib/io/                  JSON-Export/Import, Excel
lib/report/sections.ts   Report-Sektionen mit stabilen Kennungen
lib/security-headers.ts  CSP und weitere Header
lib/rate-limit.ts        In-Memory-Rate-Limit (geocode, register, resend)
supabase/migrations/     SQL-Migrationen
docs/supabase/           E-Mail-Vorlagen und email-setup.md
docs/PROJEKTSTATUS.md    dieses Dokument
tests/                   Vitest
ROADMAP.md               Phasen, Arbeitsregeln, Go-Live-Checkliste
CLAUDE.md                @AGENTS.md, @ROADMAP.md (Verweis auf docs/PROJEKTSTATUS.md fehlt, Abschnitt 9)
```

### Datenmodell in Supabase

**profiles** (angelegt per Trigger bei jedem neuen Auth-Nutzer)

| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid, PK, FK auth.users | Auth-ID |
| email | text | gespiegelt aus auth.users |
| display_name | text | Anzeigename |
| role | text | admin oder member, Default member |
| plan | text | none, internal, pro, Default none |
| plan_valid_until | timestamptz | nur für pro relevant |
| active | boolean | Default true |
| settings | jsonb | versioniertes JSON, siehe unten |
| created_at, updated_at | timestamptz | |

**analysis_state**

| Spalte | Typ | Bedeutung |
|---|---|---|
| id | text, PK | Auth-ID des Nutzers |
| payload | jsonb | komplette Analyse-Datei (objects, locations, schemaVersion, calcVersion) |
| updated_at | timestamptz | |
| version | int4 | Optimistic Lock, Start 1 |

**app_users:** alte Nutzerverwaltung, wird mit Migration 0003 entfernt (offen).

**profiles.settings** (Zod, schemaVersion 1, alle Felder optional mit Defaults, unbekannte Schlüssel werden beim Laden verworfen):

- defaults: electricity (pricePerKwh 0,35, surchargePct 30), cleaning (minutesPerSqm 2, hourlyWage 22, changesPerMonth 4), revenue (platformCommissionPct 15), touristTax (mode, pct, perPersonNight), listing (changesPerWeek 2)
- defaults.pricing: mit PR 14 eingeführt und mit PR 17 wieder entfernt; gespeicherte Schlüssel werden ignoriert
- company: name, street, zip, city, country, phone, email, website, registerInfo, logoDataUrl, primaryColor, secondaryColor
- hq: address, lat, lng
- report: selectedSections, showLogo, showCompanyFooter, showDate, showDisclaimer, disclaimerText
- consent: noch nicht vorhanden; Vorschlag aus PR 18, siehe Abschnitt 9

### API

| Route | Methode | Zweck |
|---|---|---|
| /api/data | GET, PUT | Datenstand lesen und speichern. PUT erwartet { expectedVersion, file }, 409 bei Konflikt, 401 mit expired: true nach Ablauf der Sitzung |
| /api/profile | GET, PUT | Anzeigename, Plan, Einstellungen |
| /api/geocode | POST | Adresse zu Koordinaten, Rate-Limit 30 pro Nutzer und Stunde |
| /api/register | POST | Selbstregistrierung |
| /api/register/resend | POST | Bestätigungsmail erneut senden, Antwort immer neutral 200 |
| /api/admin/users | GET, POST, PATCH, DELETE | Nutzerverwaltung, nur Admins |
| /api/me | GET | Access-Objekt ohne interne Felder; der Client fragt sie jede Minute zur Sitzungsprüfung |
| /api/logout | POST | Supabase signOut |
| /api/cron/keepalive | GET | täglich 04:00 UTC per Vercel Cron, Bearer CRON_SECRET |

## 4. Infrastruktur, Konten und Konfiguration

Keine Geheimnisse in diesem Dokument. Schlüssel und Passwörter liegen nur in Vercel, Supabase und Strato.

### GitHub

- Repo: voozaatracking/hygge-Homes-Analyses, öffentlich, Branch main
- Claude GitHub App installiert für voozaatracking (Cloud-Sessions). Claude Code startet unter claude.ai/code mit Repository-Selector.
- PR 1 bis 17 gemerged (PR 16 ohne Wirkung auf main, siehe Abschnitt 5). PR 18 (Branch feat/legal-pages, Rechtstexte) offen. Dieser Dokumentstand liegt auf dem Branch docs/projektstatus-session-4, gestapelt auf feat/legal-pages.

### Vercel

- Projekt hygge-homes-analyses, Plan Hobby, Team-Slug voozaatrackings-projects
- **Hinweis aus Session 3:** Der Hobby-Tarif ist nach den Vercel-Bedingungen nur für nicht kommerzielle Nutzung gedacht. Vor zahlenden Kunden ist Vercel Pro nötig.
- Production: https://hygge-homes-analyses.vercel.app
- Previews: pro Branch automatisch. Die Preview nutzt dieselbe Supabase-Datenbank wie Production. Branch-Adressen werden bei über 63 Zeichen gekürzt; die tatsächliche Adresse steht auf der Deployment-Seite unter "Domains".
- Deployment Protection (Vercel Authentication) ist für Previews aktiv.
- Cron: vercel.json, täglich 04:00 UTC, /api/cron/keepalive. Der Cron verhindert das Pausieren von Supabase Free; manuelle Nutzung alle zwei Wochen ist dafür nicht nötig.
- Bei Cache-Problemen "Redeploy" ohne Build-Cache. Lokal entspricht dem ein Löschen von .next vor dem Build (Turbopack-Cache kann den Fehler "next/font/google queries have exactly one entry" erzeugen).

Umgebungsvariablen (Production und Preview):

| Variable | Typ | Inhalt |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Config | https://xkgguretirxwncbxqdrk.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Config | anon-Key (Legacy, JWT) |
| SUPABASE_SERVICE_ROLE_KEY | Secret | service_role-Key (Legacy, JWT), dient auch als Signaturschlüssel des Sitzungs-Cookies |
| SUPABASE_URL | Secret | aus der alten Version; der Code liest sie nicht mehr (geprüft am 11.11.2026), kann entfernt werden |
| CRON_SECRET | Secret | Zufallszeichenkette |
| SITE_PASSWORD | | sollte gelöscht sein; prüfen |

### Supabase

- Projekt Hygge-Anaylse-Tool, Organisation voozaatracking's Org, Plan Free
- Project ID xkgguretirxwncbxqdrk, Region eu-west-1 (Irland)
- Vor echten Kunden: Pro (Backups, kein Pausieren, Sitzungsgrenzen im Dashboard).
- Angewendete Migrationen: 20261028000001_baseline, 20261028000002_profiles, 20261028000004_analysis_state_version. Noch nicht: 20261028000003_drop_app_users. Session 2 und 3 sowie PR 14 bis 18 brachten keine Schemaänderung.
- Authentication: Site URL https://hygge-homes-analyses.vercel.app. Redirect URLs: Production-Callback, Wildcard https://*-voozaatrackings-projects.vercel.app/auth/callback, dazu ein veralteter Eintrag mit zu langer Branch-Adresse (entfernen). "Allow new users to sign up" an, "Confirm email" an.
- SMTP: Custom SMTP an. Sender email und Username portal@hygge-homes.de, Sender name "Hygge Homes Analyse", Host smtp.strato.de. Port: Dieses Dokument nannte bisher 587, ROADMAP und docs/supabase/email-setup.md nennen 465. Im Dashboard nachsehen und hier den tatsächlichen Wert eintragen.
- Templates: Confirm signup, Invite user, Reset password aus docs/supabase/email-templates.
- Rate Limits: E-Mails 100 pro Stunde.
- Logs: Authentication-Probleme unter Logs, Auth.

### Strato (Mail)

- Domain hygge-homes.de liegt bei Strato. Postfach portal@hygge-homes.de ist für den App-Versand reserviert.
- Strato akzeptiert nur Absenderadressen, die zum angemeldeten Postfach gehören (Fehler 550 5.7.0). Sender email und Username in Supabase müssen zeichengleich sein.
- Versandgrenze je Postfach im Kundenbereich prüfen.

### Claude-Code-Arbeitsregeln (aus ROADMAP.md)

- Pro Aufgabe ein neuer Branch, nie direkt auf main.
- Vor jedem Commit: npm run lint, npm run test, npm run build (vorher .next löschen).
- PR mit Beschreibung: was, warum, was getestet, was der Owner nach dem Merge tun muss. PRs werden über die GitHub-REST-API angelegt (gh api), weil GraphQL aus der Cloud-Session gesperrt ist.
- Keine Schemaänderungen und keine neuen Abhängigkeiten ohne Rückfrage.
- Analyse-JSON abwärtskompatibel halten (Zod-Defaults).
- UI-Texte deutsch, bestehende Benennungen beibehalten, Tests erweitern statt umschreiben, keine Gedankenstriche in Texten.
- Gestapelte PRs: Merge immer aufsteigend und mit "Create a merge commit", nie Squash. Beim Öffnen eines gestapelten PR prüfen, ob die Basis inzwischen gemerged ist; dann gegen main öffnen (Lehre aus PR 16).
- Bei Merge-Konflikten: Claude Code rebased auf main, nicht im Browser auflösen.
- Seit Session 3 bewährt: mehrere Arbeitspakete in einem Prompt, ein Branch, ein PR, je Paket ein Commit.
- Zeitabhängige Funktionen mit verkürzter Frist auf der Preview testen; den Testcommit vor dem Merge per Revert zurücknehmen und den Merge-Stand von main prüfen (Lehre aus PR 14).

## 5. Umgesetzt in Session 1 (28.10.2026), Session 2 (04.11.2026) und Session 3 (11.11.2026)

### PRs

| PR | Status | Inhalt |
|---|---|---|
| 1 | gemerged | ROADMAP.md, CLAUDE.md-Verweis, README-Korrektur. Kurtaxe wahlweise € pro Person und Nacht oder Prozent vom Nachtpreis. |
| 2 | gemerged | Keep-alive für Supabase Free: vercel.json, /api/cron/keepalive, CRON_SECRET. |
| 3 | gemerged | .gitignore, veraltete UI-Texte korrigiert, ROADMAP bereinigt. |
| 4 | gemerged | Supabase Auth, profiles, Migrationen, lib/access.ts, Login-, Reset-, Callback-Seiten, Nutzerverwaltung, alter Login entfernt. |
| 5 | gemerged | Optimistic Lock: version-Spalte, 409 bei Konflikt, "Serverstand laden" und "Trotzdem speichern". |
| 6 | gemerged | property-form.tsx in Sektionskomponenten zerlegt, Cloud-Sync und Autosave als Hooks. |
| 7 | gemerged | profiles.settings als Zod-Schema, /api/profile, /api/geocode, Seite /profil, Profil-Defaults für neue Objekte. |
| 8 | gemerged | Objektadresse mit Koordinaten, Entfernung (Haversine × 1,3), Fahrtkosten Reinigung als Fixkosten. Nachzug (kein zweites Adressfeld) mit PR 14 bestätigt. |
| 9 | gemerged | Gebrandeter Report, Sektionsauswahl, Druckansicht A4, "Als PDF speichern". |
| 10 | gemerged | Go-Live-Vorbereitung: Security-Header, Schlüsselformate, Onboarding, Hinweis-Konzept, Rechtsseiten als Gerüst, Rate-Limit geocode. |
| 11 | gemerged | Offene Selbstregistrierung, deutsche Mail-Vorlagen, docs/PROJEKTSTATUS.md angelegt. |
| 12 | gemerged | Bestätigungsmail erneut anfordern, Spalte "Registriert am". |
| 13 | gemerged | Vercel-Build repariert: lokale Schriften. |
| 14 | gemerged 11.11.2026 | Paket A: Fahrtkosten-Hinweise mit Einzelursachen (describeTravelIssues), Zeilen "Ausgangsadresse" und "Objektadresse" fett, "Ausgangspunkt" im UI zu "Ausgangsadresse". Paket B: Brutto-Hinweis. Paket C: Abmeldung nach 12 Stunden. Paket D: Break-even-Nachtpreis und Mindestpreis. Paket E: Reiter "Pricing-Tool" mit Eingabefeldern und Profil-Standardwerten (durch PR 17 vereinfacht). Analysen: Login prüft nach einem Fehler die Sitzung; Verwaltungsspalte heißt "Letzter Login" (Quelle last_sign_in_at, nur echte Anmeldungen). Der TEMP-Commit mit 3 Minuten Sitzungsdauer wurde versehentlich mitgemerged. |
| 15 | gemerged 11.11.2026 | Branch fix/session-max-hours: TEMP-Commit revertiert, SESSION_MAX_HOURS wieder 12. Ergebnisse des 3-Minuten-Tests eingearbeitet: Sitzungsprüfung jede Minute und beim Zurückkehren in den Tab, Marker für ungespeicherte Änderungen nur bei echten Änderungen (vorher Scheinkonflikt nach Ablauf), Konfliktdialog nur bei abweichenden Daten, Weiterleitung ohne Safari-Rückfrage "Seite verlassen?" (lib/unload-guard.ts). |
| 16 | gemerged, ohne Wirkung | Branch feat/objektuebersicht-pricing gegen fix/session-max-hours geöffnet, obwohl PR 15 bereits gemerged war. Inhalt kam deshalb nicht in main. |
| 17 | gemerged 11.11.2026 | Derselbe Branch gegen main. Paket F: Pricing-Tool als reine Empfehlungsansicht mit Thilos Werten, Eingabefelder und defaults.pricing entfernt, alte Dateien laden weiter. Paket G: Objektübersicht mit Kacheln (lib/overview.ts, components/object-overview.tsx), Detailansicht (components/object-detail.tsx), geöffnetes Objekt als ?objekt=<id>. 245 Tests. |
| 18 | offen | Branch feat/legal-pages: Rechtstexte eingesetzt (lib/legal/, components/legal/legal-document.tsx), Widerrufsbelehrung unter #widerruf, Platzhalter-Gerüst entfernt, Prüfhinweise sichtbar markiert, Analyse zur Zustimmungsspeicherung im PR. 248 Tests. |

### Owner-Schritte, erledigt in Session 1

- Umgebungsvariablen in Vercel gesetzt, Redeploy.
- Migrationen 0001, 0002, 0004 angewendet.
- Auth konfiguriert, Admin-Konto angelegt, Datenzeile shared umgehängt.
- Thilo direkt mit Passwort angelegt, Plan internal, alte Datenzeile umgehängt.
- Preview getestet, PR 1 bis 10 gemerged.

### Owner-Schritte, erledigt in Session 2

- Strato-Postfach in Betrieb, Custom SMTP in Supabase, Rate-Limit 100 pro Stunde, Vorlagen eingefügt.
- PR 11, 13 und 12 gemerged, Sign-up-Schalter eingeschaltet, Testregistrierung auf Production erfolgreich.

### Session 3: Ergebnisse

- Feedbackgespräch mit Thilo ausgewertet (zwei Transkripte). Thilo hat die Registrierung dreimal getestet, Bestätigungsmail und Passwort-Reset funktionieren. Timo war als Nutzer bereits im Tool.
- Acht Verbesserungen als PR 14 umgesetzt, Nachbesserungen aus dem Preview-Test als PR 15.
- Pricing-Empfehlungen und Objektübersicht als PR 17 umgesetzt und gemerged.
- Rechtstexte entworfen (impressum.md, datenschutz.md, agb.md, rechtstexte-pruefliste.md), von Thilo durchgesehen und als Entwurf mit PR 18 eingesetzt.
- Betreiber geklärt: Westerwiede & Westerwiede GbR.

### Erkenntnisse

- Session 2: Build-Fehler auf Vercel können lokal grün sein; zuerst das Build-Log holen. Strato prüft die Absenderadresse. Parallel laufende Claude-Code-Sessions erzeugen Konflikte in ROADMAP und PROJEKTSTATUS.
- Session 3: Die Sorge, ein Nutzer könne nach Abo-Ende angemeldet bleiben und weiter nutzen, ist unbegründet, weil der Plan bei jedem Request geprüft wird. Die Abmeldung ist ein Sicherheitsthema, kein Payment-Schutz.
- Session 3: Die Spalte in der Verwaltung zeigte ein altes Datum, weil nur echte Anmeldungen erfasst werden, nicht die Nutzung.
- Session 3: Zeitabhängige Funktionen vor dem Merge mit verkürzter Frist auf der Preview testen. Den Testcommit zurücknehmen und vor dem Merge prüfen, dass der Revert im Branch ist; bei PR 14 gelangte der Testwert in main.
- Session 3: Der 3-Minuten-Test zeigte zwei Fehler, die ohne Test unbemerkt geblieben wären: Safari fragte "Seite verlassen?" bei der Weiterleitung, und nach der Neuanmeldung erschien ein Konfliktdialog ohne echte Änderung.
- Session 3: Gestapelte PRs nur öffnen, solange die Basis offen ist. PR 16 lief ins Leere, weil die Basis schon gemerged war.
- Session 3: Die bestehenden Rechtstexte der Website hygge-homes.de sind für das Tool nicht verwendbar (Gastaufnahmebedingungen, Datenschutztext für WordPress). In den AGB der Website ist die Stornostaffel in § 5 verdreht; Hinweis an Thilo.
- Session 3: Markdown-Rechtstexte lassen sich ohne Bibliothek als typisierte Blöcke einsetzen; Textänderungen laufen über die Vorlagen und ein erneutes Einsetzen, nicht über den Code.

## 6. Nutzer, Rollen und Datenstand

| Konto | Rolle | Plan | Anlage | Daten |
|---|---|---|---|---|
| Owner (Admin) | admin | internal | direkt in Supabase | frühere Zeile shared, war leer |
| Thilo | member | internal | direkt in Supabase, Startpasswort persönlich übergeben | 5 Objekte aus der alten Zeile; Anmeldung funktioniert laut Gespräch vom 11.11. |
| Timo | member | prüfen | prüfen | war laut Gespräch bereits angemeldet |
| Testkonten | member | pro, 180 Tage | Selbstregistrierung | in der Verwaltung löschen |
| weitere Mentoring-Teilnehmer | member | pro, 180 Tage | Selbstregistrierung über Thilos Link | ein zweiter Teilnehmer war am 11.11. noch nicht angelegt |
| dritter alter Nutzer (aus app_users) | | | nicht übernommen | eigene Zeile in analysis_state (Stand 20.07.2026), Entscheidung offen |

Prüfung: `select id, updated_at, version from public.analysis_state;` muss die UUID-Zeilen der aktiven Nutzer und höchstens die dritte alte Zeile zeigen, keine Zeile shared.

Frühnutzer-Übergang: Die ersten selbst registrierten Konten laufen 180 Tage nach Registrierung aus (ab Anfang Mai 2027). Bis dahin muss Phase 3 stehen oder die Gültigkeit wird in der Verwaltung verlängert.

## 7. Festgelegte Werte und Regeln (Referenz)

**Rechenbasis:** 30 Tage pro Monat, 12 Monate pro Jahr, 52 Wochen, 364 Nächte pro Jahr. Alle Beträge brutto.

**Standardannahmen** (lib/config/assumptions.ts, Profil-Defaults identisch):

- Strom: 0,35 €/kWh, Aufschlag 30 %
- Reinigung: 2 min/qm, 22 €/h, 4 Wechsel pro Monat
- Plattformprovision: 15 %
- Standortanalyse: 2 Gästewechsel pro Woche
- Szenarien: pessimistisch Auslastung × 0,8 und Preis × 0,9; optimistisch × 1,2 und × 1,1
- Objektbewertung, Gewichte: Miete/qm 0,25, Raumproduktivität 0,35, Flächenproduktivität 0,20, Betten pro Raum 0,10, Energieverbrauch 0,10

**Registrierung** (lib/config/registration.ts):

- REGISTRATION = { defaultPlan: 'pro', defaultValidDays: 180 }. Phase 3 setzt defaultPlan auf 'none'.
- Rate-Limits (In-Memory, je Serverless-Instanz): /api/register 10 je IP und Stunde; /api/register/resend 3 je E-Mail und 10 je IP pro Stunde; /api/geocode 30 je Nutzer und Stunde.
- Honeypot-Feld website: Inhalt führt zu 201 ohne Aktion.
- Supabase-Rate-Limit für E-Mails: 100 pro Stunde.

**Sitzung** (lib/config/session.ts): SESSION_MAX_HOURS = 12, absolut ab Anmeldung. Meldung: "Du wurdest aus Sicherheitsgründen nach 12 Stunden automatisch abgemeldet. Bitte melde dich erneut an." Client-Prüfung über /api/me alle 60 Sekunden und beim Zurückkehren in den Tab.

**Brutto-Hinweis:** "Alle Beträge sind Bruttobeträge (inkl. Umsatzsteuer)." Einmal je Objektformular, im Profil, in der Standortanalyse, im Report-Fuß (lib/config/texts.ts).

**Kurtaxe / Tourismusabgabe:**

- Modus perPersonNight: Betrag × Betten × vermietete Nächte; Break-even-Abzug Betrag × Betten je Nacht
- Modus percentOfPrice: Monatsumsatz × Prozent / 100; Break-even-Abzug Nachtpreis × Prozent / 100
- Nur der gewählte Modus gilt, der andere Wert bleibt gespeichert. Wert 0 bedeutet keine Abgabe.

**Entfernung und Fahrtkosten:**

- Entfernung = Luftlinie (Haversine) × Umwegfaktor 1,3 (DETOUR_FACTOR). Im UI "geschätzt aus Luftlinie".
- Fahrtkosten nur bei aktiviertem Haken. Ausgangsadresse ist der Firmensitz aus dem Profil oder eine eigene Adresse. Kilometerpauschale = Strecke × 2 × Satz × Fahrten pro Monat. Fixpreis = Preis je Fahrt × Fahrten. Fahrten leer bedeutet Reinigungen pro Monat des Objekts. Kostenzeile "Fahrtkosten Reinigung" als Fixkosten.
- Hinweise (PR 14): Jede Ursache wird einzeln genannt: Objektadresse fehlt, Koordinaten des Objekts fehlen, Firmensitz fehlt (Link auf /profil), Koordinaten des Firmensitzes fehlen, eigene Ausgangsadresse oder deren Koordinaten fehlen, Kilometersatz bzw. Fixpreis fehlt.
- Anzeige: "Ausgangsadresse: …" und "Objektadresse: …" jeweils fett, darunter die Entfernung.

**Pricing-Tool** (Vorgaben von Thilo, umgesetzt mit PR 17, lib/calculations/pricing.ts):

- Break-even-Nachtpreis: der Nachtpreis, bei dem der Monatsgewinn bei den geplanten Nächten des Objekts genau 0 ist. Preisabhängige Kosten (Provision, prozentuale Kurtaxe) sind berücksichtigt; Berechnung über zwei Stützpreise, weil die Kostenfunktion im Preis linear ist.
- Mindestpreis = Break-even-Nachtpreis × 1,10, auf volle Euro aufgerundet. Bezeichnung im UI "Mindestpreis" mit Unterzeile "Break-even-Preis je Nacht zzgl. 10 %".
- Basispreis = ungerundeter Mindestpreis + 40 € je Nacht für die gesamte Unterkunft, auf volle Euro aufgerundet.
- Feste Empfehlungen (keine Eingabefelder): Mindestaufenthalt 3 Nächte; Buchungslücken von 1 bis 5 Nächten: Buchung ab 1 Nacht zulassen; Last-Minute (1 bis 4 Nächte vor Anreise): Buchung ab 1 Nacht zulassen. Formulierung der Empfehlungen durch Thilo bestätigen lassen.
- Konstanten: PRICING_MARKUP_PCT = 10, PRICING_BASE_SURCHARGE_EUR = 40, PRICING_MIN_STAY_NIGHTS = 3, PRICING_GAP_MAX_NIGHTS = 5, PRICING_LAST_MINUTE_MAX_NIGHTS = 4.
- Nicht berechenbar (keine Nächte, keine Kosten): Hinweis nach dem Hinweis-Konzept, kein NaN.
- Hintergrund: Die Werte werden in ein externes Pricing-Tool wie PriceLabs übertragen. Der Mindestpreis zeigt, wie weit der Preis in schwachen Monaten sinken darf.
- Bekannte Schwäche: Der feste Aufschlag von 40 € gilt unabhängig von der Objektgröße.

**Objektübersicht** (umgesetzt mit PR 17): Kachel je Objekt mit Name, Adresse klein darunter ("Keine Adresse hinterlegt", falls leer), Gewinn oder Verlust pro Monat aus dem moderaten Szenario, farblich unterschieden, sonst "Noch nicht berechenbar". Ganze Kachel klickbar und per Tastatur erreichbar, Duplizieren und Löschen über ein Menü je Kachel. Aktionsleiste: Neues Objekt, Beispielobjekt laden, Objekte vergleichen, Export und Import. Detailansicht mit "Zurück zur Übersicht", Zusammenfassung (Umsatz, Kosten, Gewinn, Break-even, moderates Szenario) und den bestehenden Reitern. Neues Objekt und Beispielobjekt öffnen direkt die Detailansicht.

**Hinweis-Prinzip:** Fehlende Eingaben werden als Hinweis an Feld oder Kennzahl genannt, nie als Pflichtfeld erzwungen.

**Profil:** alle Felder optional. Logo als Data-URL, max. 300 KB, PNG, JPEG, SVG. Farben nur als Akzente.

**Report:** Sektionen basics, revenue, costs, results, scenarios. A4, 15 mm Rand. Dateiname aus Objektname und Datum. Pricing-Tool nicht im Report.

**Sicherheit:** CSP erlaubt Supabase-Host und Nominatim, frame-ancestors 'none', HSTS nur in Production.

**Zugriffsregel:** active && (role = admin || plan = internal || (plan = pro && (plan_valid_until null || > now))).

**Rechtstexte (Entwurfsstand, eingesetzt mit PR 18):** Stand November 2026. Kostenlose Phase 180 Tage, endet automatisch ohne Zahlungspflicht. Daten bleiben nach Ablauf 90 Tage erhalten, nach Vertragsende 30 Tage Export. Unbestätigte Konten sollen nach 30 Tagen gelöscht werden. Kontolöschung per E-Mail an info@hygge-homes.de. Gerichtsstand Lüneburg für Kaufleute. Alle Fristen stehen unter Vorbehalt von Thilos Bestätigung. Offene Prüfhinweise: Impressum 1 (USt-IdNr.), Datenschutz 9 (unter anderem Anschriften von Vercel und Supabase, Zahlungsanbieter), AGB 7 (unter anderem Preise, Rhythmus, Umsatzsteuer, Fristen).

## 8. Offene Owner-Schritte (Checkliste, neu priorisiert)

1. **PR 18 abschließen:** Preview öffnen, /impressum, /datenschutz und /agb#widerruf prüfen (Struktur, Markierungen der Prüfhinweise, Links zur Anmeldung), mit "Create a merge commit" mergen. Danach diesen Dokumentstand (Branch docs/projektstatus-session-4) mergen.
2. **Rechtstexte mit Thilo finalisieren** (rechtstexte-pruefliste.md): Schreibweise Firmenname und Gesellschafter, USt-IdNr. oder Kleinunternehmerregelung, Nutzung des Namens "Hygge Homes" durch die GbR, Kontaktadresse für das Tool, Übergang ins Abo, Fristen, Preise. Danach alle [PRÜFEN]-Stellen in den Vorlagen auflösen und die Texte per Prompt (Abschnitt 14) erneut einsetzen lassen. Der Hinweis "Entwurf" auf den Seiten verschwindet dann von selbst.
3. **Entscheidung Zustimmung speichern:** Vorschlag aus PR 18 (Abschnitt 9 Punkt 1) freigeben oder den Satz in der Datenschutzerklärung streichen.
4. **Verträge über Auftragsverarbeitung** abschließen: Supabase (DPA im Dashboard), Vercel (DPA), Strato (Kundenbereich). Sicherstellen, dass Vercel Analytics und Speed Insights aus sind.
5. **Anwaltliche Prüfung** der Abo-, Haftungs- und Widerrufsklauseln vor Phase 3.
6. Testkonten in der Verwaltung löschen.
7. Alte Nutzertabelle entfernen: Inhalt von supabase/migrations/20261028000003_drop_app_users.sql im SQL Editor ausführen.
8. Dritte alte Datenzeile: löschen oder Nutzer anlegen und umhängen.
9. Aufräumen: veraltete Redirect-URL entfernen; SUPABASE_URL in Vercel entfernen (Code liest sie nicht mehr); SITE_PASSWORD muss gelöscht sein; SMTP-Port im Supabase-Dashboard nachsehen und in Abschnitt 4 eintragen.
10. Probedruck des Reports auf Production mit und ohne Logo.
11. Eigene Domain für die App: Subdomain app.hygge-homes.de bei Strato als CNAME auf Vercel, in Vercel hinzufügen, Supabase Site URL und Redirect URLs umstellen, Thilo den neuen Link geben.
12. Spam beobachten: unbestätigte Konten in der Verwaltung prüfen und löschen, bis die automatische Löschung existiert.
13. Strato-Versandlimit nachsehen und notieren.
14. Formulierung der drei Pricing-Empfehlungen und der Kachelansicht von Thilo auf Production bestätigen lassen.
15. **Vor Phase 3:** Payment-Anbieter endgültig entscheiden (Tendenz Stripe; die Payline-Konditionen für Mollie gelten nur bei Anmeldung bis 31.12.2026), Preis, Rhythmus, Testphase, Übergang ins Abo und Umsatzsteuer-Status festlegen, strategische Option (Abschnitt 11) bewerten.
16. Frühnutzer-Übergang: Phase 3 vor Mai 2027 fertig oder Gültigkeiten verlängern.
17. **Vor zahlenden Kunden:** Vercel Pro, Supabase Pro (danach Keep-alive-Cron entfernen, Sitzungsgrenzen und "eine Sitzung je Nutzer" im Dashboard), Backups, Fehlerüberwachung, Support-Adresse.
18. Schlüssel auf neues Format umstellen (führt zu einmaliger Neuanmeldung aller Nutzer).
19. Preview und Production trennen: eigenes Supabase-Projekt für Previews, sobald Payment getestet wird.

## 9. Offene Punkte für Claude Code

1. **Zustimmung speichern** (Entscheidung des Owners nötig, Vorschlag aus PR 18, keine Schemaänderung): Request an /api/register um acceptedTerms: true erweitern und serverseitig erzwingen (400 ohne Zustimmung); in lib/profile/settings.ts ein optionales Feld consent { termsVersion, privacyVersion, acceptedAt } mit Default null; Fassungen als Konstanten in lib/legal/ (zum Beispiel "2026-11"); nach signUp zusammen mit dem Startplan schreiben; in der Verwaltung optional als Spalte. Prompt in Abschnitt 14.
2. Rechtstexte erneut einsetzen, sobald die Prüfhinweise aufgelöst sind (Prompt in Abschnitt 14). Dabei bleibt die Abbruchbedingung "[PRÜFEN" aktiv.
3. CLAUDE.md um die Zeile "@docs/PROJEKTSTATUS.md" ergänzen, damit Claude Code das Dokument automatisch liest (mit dem Docs-PR oder dem nächsten PR).
4. Automatisches Löschen unbestätigter Konten nach 30 Tagen über den bestehenden Cron (/api/cron/keepalive oder eigene Cron-Route; Vercel Hobby erlaubt nur tägliche Crons).
5. Kontolöschung durch den Nutzer im Profil (Auth-Nutzer, profiles und analysis_state löschen; Bestätigung mit Passwort oder erneuter Eingabe der E-Mail).
6. Fragment-Weiterleitung (#access_token): prüfen, ob noch nötig.
7. Fehlermeldung Einladung: Supabase-Fehlermeldung in der Verwaltung mit anzeigen.
8. Hartes Rate-Limit über Tabelle, sobald mehrere Instanzen oder Payment-Nutzer existieren.
9. Routing-Kilometer über API erst nach Nutzerfeedback (Phase 5).
10. Phase 3 (Abschnitt 10), erst nach Anbieterentscheidung.

## 10. Roadmap: Phase 3 Payment, Go-Live, Phase 4 und 5

### Phase 3: Abo und Payment (gesperrt bis zur Anbieterentscheidung)

Entscheidungen, die vorher fallen müssen:

- Preis und Abrechnungsrhythmus (monatlich, jährlich)
- Testphase und Übergang: automatisch endend (Entwurf) oder automatischer Übergang ins Abo (Thilos Idee)
- Umsatzsteuer-Status der GbR (keine Steuerberatung)
- Anbieter Stripe oder Mollie (Abschnitt 12)
- Strategische Option aus Abschnitt 11

Ablauf für Abo-Kunden:

1. Registrierung mit E-Mail, Passwort und Bestätigungsmail: existiert.
2. REGISTRATION.defaultPlan auf 'none'. Nutzer mit Plan none sehen statt /no-access die Seite "Abo abschließen".
3. Checkout auf der gehosteten Seite des Anbieters, App übergibt die Nutzer-ID.
4. Webhook setzt plan = pro und plan_valid_until.
5. Kündigung, Zahlungsmethode, Rechnungen über das Kundenportal des Anbieters.
6. Bestehende Frühnutzer: Pro läuft nach 180 Tagen aus und führt zur Abo-Seite.

Technik: Tabelle subscriptions, Webhook-Route mit Signaturprüfung und Idempotenz, Kundenportal, App-Mails, Feature-Gating bleibt in lib/access.ts.

Rechtliche Anforderungen aus Session 3 (Verbraucher): Bestellseite mit Pflichtangaben und Schaltfläche "Zahlungspflichtig bestellen", Kündigungsfunktion, Widerrufsbelehrung (liegt unter /agb#widerruf) und elektronische Widerrufsfunktion, Aufbewahrung der Daten nach Ablauf. Vor Veröffentlichung anwaltlich prüfen.

Rechnungen: Stripe kann Invoicing und Tax selbst, bei Mollie braucht es ein Rechnungstool.

### Go-Live-Checkliste (Pflicht vor dem ersten zahlenden Nutzer)

Eigene Domain und HTTPS, finalisierte Rechtstexte und Verträge über Auftragsverarbeitung, Zustimmung gespeichert, Vercel Pro, Supabase Pro, Fehlerüberwachung, Support-Adresse, Sicherheitsdurchsicht, Schlüsselformat, Preview-Datenbank getrennt. Eigener SMTP ist erledigt. Rechtsseiten mit Inhalt sind erledigt (Entwurf).

### Phase 4: Datenbank-Skalierung, nur bei Bedarf

Auslöser: viele Objekte je Nutzer, Teilen einzelner Objekte, Auswertungen über alle Nutzer. Dann Aufteilung des JSON in Tabellen objects und locations. Ohne Auslöser bleibt das Modell.

### Phase 5: Produktausbau nach Nutzerfeedback

- Routing-API für echte Fahrtkilometer und Fahrtzeit
- Serverseitige PDF-Erzeugung, falls der Browserdruck nicht reicht
- Reports per Link teilen
- Standortanalyse mit hinterlegten Marktdaten
- Team-Konten, falls Nachfrage entsteht
- Manuelle Kilometerüberschreibung je Objekt
- Marketing-Website und Onboarding-Flow
- E-Mail-Adresse im Profil änderbar
- Supabase Storage für Logos
- Pricing-Aufschlag abhängig von der Objektgröße statt fester 40 €
- Pricing-Empfehlungen als Report-Sektion
- Übersicht mit Kacheln auch für die Standortanalyse

## 11. Strategische Option: Claude-Skill oder Connector statt eigenes SaaS

Idee von Thilo (Ende Session 1): Statt ein eigenes Programm zu betreiben, die vorhandene Rechenlogik als Produkt für Claude verpacken (Skill, Connector bzw. MCP-Server) und einmalig verkaufen.

Vorteile: kein Betrieb von Hosting, Datenbank, Auth, Payment, Support; schneller am Markt; einmaliger Verkauf.

Nachteile: kein eigener Datenbestand, keine Oberfläche, Report nur eingeschränkt; Kunden brauchen ein Claude-Abo; Vertriebsweg und Preis unklar; Schutz vor Weitergabe schwach; mit MCP-Server wieder Hosting nötig.

Einordnung nach Session 3: Registrierung, Mailversand, Nutzerverwaltung, Sitzungsgrenze, Objektübersicht und Rechtstexte existieren. Der Restaufwand bis zum SaaS ist im Wesentlichen Phase 3. Thilo nutzt das Tool im Mentoring und verteilt Zugänge. Die Option ist damit eher Ergänzung (Phase 5) als Ersatz. Eine formale Entscheidung steht noch aus.

## 12. Payment-Vergleich: Ausgangsdaten

**Stripe:** 1,50 % + 0,25 € je Kartenzahlung (europäische Karten). Stripe Billing: Abos, Proration, Customer Portal, Mahnwesen, Trials, Invoicing und Tax. Kein Merchant of Record.

**Mollie über Payline Dock** (YFN-Benefit, Stand Oktober 2026): 1,20 % + 0,10 € je Kartenzahlung; 0 € Setup, kein Mindestvolumen, monatlich kündbar; Konditionen bleiben bei Anmeldung bis 31.12.2026; Anmeldung https://dock.payline.one. Subscriptions-API vorhanden, aber kein Kundenportal und weniger Mahnwesen. Kein Merchant of Record.

**Einordnung:** Bei SaaS-Beträgen von 29 € bis 99 € ist der Gebührenvorteil klein. Entscheidend sind Abo-Funktionalität und Rechnungsstellung. Im Gespräch vom 11.11. tendierten Thilo und Owner zu Stripe. Die Datenschutzerklärung nennt im vorbereiteten Abschnitt bereits Stripe.

Für die Entscheidung benötigt: Preis, Rhythmus, Testphase, Umsatzsteuer-Status, erwartete Kundenzahl im ersten Jahr.

## 13. Kontext-Prompt für die nächste Chat-Session

Zum Einfügen als erste Nachricht in einen neuen Chat (nicht Incognito, damit Docs und Gedächtnis funktionieren). Dieses Dokument und bei Bedarf die Rechtstext-Dateien anhängen.

```
Kontext: Ich bin Owner des Projekts "Hygge Homes Analyse", ein Next-16-Tool zur Wirtschaftlichkeitsanalyse von Ferienunterkünften, Repo voozaatracking/hygge-Homes-Analyses (öffentlich), deployed auf Vercel (Hobby, https://hygge-homes-analyses.vercel.app), Datenbank und Auth bei Supabase (Free, Projekt xkgguretirxwncbxqdrk, Region Irland), Mailversand über Strato-SMTP (portal@hygge-homes.de). Betreiber ist die Westerwiede & Westerwiede GbR (Thilo und Anna Westerwiede), ich bin Mitarbeiter von Thilo. Umsetzung läuft über Claude Code (Cloud-Sessions mit GitHub), du planst, entscheidest mit mir und formulierst die Prompts für Claude Code. Die vollständige Dokumentation hängt an (PROJEKTSTATUS, Stand 11. November 2026, nach PR 18). Lies sie zuerst, besonders Abschnitt 1 (Prüfpunkte zu Beginn), 2 (Grundentscheidungen), 7 (Werte), 8 (offene Owner-Schritte), 9 (offene Punkte für Claude Code) und 10 bis 12 (Roadmap, strategische Option, Payment).

Stand: PR 1 bis 17 sind in main gemerged (Session 3: Fahrtkosten-Hinweise, Brutto-Hinweis, Abmeldung nach 12 Stunden, Pricing-Empfehlungen, Objektübersicht mit Kacheln). PR 18 setzt die Rechtstexte für Impressum, Datenschutz und AGB als Entwurf ein; die Prüfhinweise [PRÜFEN: …] stehen noch im Text und sind auf den Seiten markiert. Die Zustimmung zu AGB und Datenschutz wird bei der Registrierung noch nicht gespeichert; ein Vorschlag ohne Schemaänderung liegt vor. Phase 3 (Payment) ist noch nicht gestartet; Tendenz Stripe, Entscheidung offen.

Aktueller Stand von mir: [hier eintragen: PR 18 gemerged ja/nein, Rückmeldung von Thilo zu den Prüfhinweisen, Entscheidung zur Zustimmungsspeicherung].

Arbeitsweise, die gilt: Deutsch, direkt, kein Loben, kritisches Feedback, Stichpunkte mit Zwischenüberschriften, keine Gedankenstriche, keine Emojis. Bei Owner-Schritten in Vercel, Supabase oder Strato Schritt für Schritt, immer nur der nächste Schritt. Prompts für Claude Code immer als Codeblock, so präzise, dass er ohne Rückfragen starten kann; mehrere Pakete dürfen in einen Prompt und einen PR, je Paket ein Commit; Merge mache ich. Keine Phase 3 ohne meine Anbieterentscheidung. Keine Rechtsberatung, Rechtstexte sind Entwürfe. Bei Build-Fehlern auf Vercel zuerst das Build-Log holen.

Erste Aufgabe heute: [hier eintragen, z. B. "Rechtstexte nach Thilos Rückmeldung finalisieren und erneut einsetzen", "Zustimmung speichern umsetzen", "Unbestätigte Konten automatisch löschen", "Phase 3 vorbereiten mit diesen Preisen: …", "Domain app.hygge-homes.de einrichten"].
```

## 14. Prompt-Vorlagen für Claude Code

### Statusabfrage zu Sessionbeginn

```
Lies CLAUDE.md, AGENTS.md, ROADMAP.md und docs/PROJEKTSTATUS.md. Melde: aktueller Stand von main (letzter Merge), offene PRs mit Branch und Basis, ob Tests, Lint und Build auf main grün sind, den Wert von SESSION_MAX_HOURS auf main und auf offenen Branches, und welche Punkte aus ROADMAP und PROJEKTSTATUS Abschnitt 9 noch offen sind. Keine Änderungen vornehmen.
```

### Dokumentation im Repo ersetzen

```
Die angehängte Datei PROJEKTSTATUS.md ist die vollständige Projektdokumentation. Ersetze docs/PROJEKTSTATUS.md vollständig durch ihren Inhalt, ohne inhaltliche Änderungen. Stelle sicher, dass CLAUDE.md die Zeile "@docs/PROJEKTSTATUS.md" enthält. Prüfe ROADMAP.md auf Widersprüche zu Abschnitt 8 und 9 der neuen Fassung und gleiche ROADMAP an (PROJEKTSTATUS ist führend). Wo der tatsächliche Stand im Repo neuer ist als das Dokument (zum Beispiel ein inzwischen gemergter PR), passe nur diese Statusangaben an und nenne sie im PR. Branch docs/projektstatus-<datum>, PR mit kurzer Beschreibung.
```

### Rechtstexte erneut einsetzen (nach Auflösung der Prüfhinweise)

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md. Branch feat/legal-texts-<datum> auf main.

Ziel: Die angehängten Dateien impressum.md, datenschutz.md und agb.md ersetzen die Rechtstexte in lib/legal/impressum.ts, lib/legal/datenschutz.ts und lib/legal/agb.ts. Der Renderer components/legal/legal-document.tsx und die Seiten bleiben unverändert.

Regeln:
1. Abbruchbedingung: Enthält eine der Dateien noch die Zeichenfolge "[PRÜFEN", setze nichts ein, sondern liste die Fundstellen auf und stoppe.
2. Texte unverändert übernehmen, Markdown-Struktur wie bisher als Blöcke (h1, h2, p, hr, ul, ol mit Unterpunkten). Die Widerrufsbelehrung bleibt der Abschnitt nach der Trennlinie (Sprungmarke #widerruf).
3. Stand-Datum der Texte in ROADMAP und docs/PROJEKTSTATUS.md nachtragen; den Vermerk "Entwurf" dort entfernen, wenn Thilo die Texte freigegeben hat (Datum angeben). Anwaltliche Prüfung der Abo- und Widerrufsklauseln bleibt offen, bis ich sie als erledigt melde.
4. Keine Schemaänderung, keine neue Abhängigkeit.

Tests: tests/legal-pages.test.ts anpassen (Stand-Datum, Anbieter, #widerruf, keine Prüfhinweise mehr im HTML). Abschluss: Lint, Tests, Build, PR mit Beschreibung.
```

### Zustimmung bei der Registrierung speichern (nach Freigabe)

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md Abschnitt 3 und 9. Branch feat/consent-record auf main.

Ziel: Bei der Registrierung werden Zeitpunkt und Fassung der Zustimmung zu AGB und Datenschutzerklärung gespeichert, ohne Schemaänderung.

Entscheidungen (nicht neu diskutieren):
- Speicherort profiles.settings.consent = { termsVersion, privacyVersion, acceptedAt } (ISO-Zeit), Default null im Zod-Schema lib/profile/settings.ts. Bestehende Profile bleiben gültig.
- Fassungen als Konstanten in lib/legal/ (TERMS_VERSION, PRIVACY_VERSION, Wert "<Stand der Texte, z. B. 2026-11>").
- /api/register erwartet zusätzlich acceptedTerms: true; fehlt es, Antwort 400 mit verständlicher Meldung. Das Formular sendet das Feld aus der bestehenden Checkbox.
- Zustimmung nach signUp zusammen mit dem Startplan schreiben. Beim Honeypot-Treffer nichts schreiben.
- Verwaltung: Spalte "Zustimmung" mit Datum und Fassung, leer bei Altkonten.
- Keine Schemaänderung, keine neue Abhängigkeit.

Tests: Route-Test für /api/register (ohne acceptedTerms 400, mit acceptedTerms wird consent geschrieben), Schema-Test für settings mit und ohne consent. Abschluss: Lint, Tests, Build, PR, ROADMAP und docs/PROJEKTSTATUS.md aktualisieren.
```

### Unbestätigte Konten automatisch löschen (nach Bestätigung der 30-Tage-Frist)

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md. Branch feat/cleanup-unconfirmed auf main.

Ziel: Konten, deren E-Mail-Adresse 30 Tage nach der Registrierung nicht bestätigt ist, werden täglich automatisch gelöscht (Auth-Nutzer, profiles, analysis_state).

Entscheidungen (nicht neu diskutieren):
- Frist als Konstante UNCONFIRMED_DELETE_DAYS = 30 in lib/config/registration.ts.
- Ausführung im bestehenden täglichen Cron /api/cron/keepalive (Vercel Hobby erlaubt nur tägliche Crons), geschützt über CRON_SECRET; Keep-alive-Funktion bleibt erhalten. Antwort enthält die Anzahl gelöschter Konten.
- Kriterium: auth.users.email_confirmed_at ist null und created_at älter als die Frist. Admin-Konten und Konten mit Plan internal werden nie gelöscht.
- Löschung über den Service-Role-Client (auth.admin.deleteUser), Datenzeile zuerst.
- Keine Schemaänderung, keine neue Abhängigkeit.

Tests: Auswahlfunktion als reine Funktion (Frist, Ausnahmen, Grenzfälle), Route-Test mit gemocktem Admin-Client. Abschluss: Lint, Tests, Build, PR, ROADMAP und docs/PROJEKTSTATUS.md aktualisieren; im PR nennen, dass die Datenschutzerklärung Abschnitt 14 dieselbe Frist nennt.
```

### Kontolöschung im Profil

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md. Branch feat/account-deletion auf main.

Ziel: Nutzer können ihr Konto auf /profil selbst löschen.

Entscheidungen (nicht neu diskutieren):
- Abschnitt "Konto löschen" am Ende der Profilseite mit Erklärung (alle Objekte, Standorte und Einstellungen werden unwiderruflich gelöscht; Export vorher über die Objektübersicht) und Sicherheitsabfrage: der Nutzer tippt seine E-Mail-Adresse ein.
- Route DELETE /api/profile: Sitzung prüfen, E-Mail vergleichen, analysis_state und profiles löschen, Auth-Nutzer über den Service-Role-Client löschen, Sitzung beenden, Antwort 204. Admins können ihr eigenes Konto nicht löschen, solange sie der einzige Admin sind.
- Nach der Löschung Weiterleitung auf /login mit Meldung "Dein Konto wurde gelöscht."
- Keine Schemaänderung, keine neue Abhängigkeit.

Tests: Route-Test (falsche E-Mail 400, Erfolg 204, einziger Admin 409). Abschluss: Lint, Tests, Build, PR, ROADMAP und docs/PROJEKTSTATUS.md aktualisieren; Hinweis auf die Datenschutzerklärung (Kontolöschung derzeit per E-Mail beschrieben, Text anpassen lassen).
```

### Allgemeine Aufgabenvorlage

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md. Branch <name> auf main (oder auf PR <n>, falls gestapelt und die Basis noch offen ist).
Ziel: <ein Satz>.
Entscheidungen (nicht neu diskutieren): <Liste>.
Umsetzung: <nummerierte Punkte mit Dateien und Regeln, bei mehreren Paketen je Paket ein Commit>.
Tests: <was>.
Abschluss: Lint, Tests, Build, PR mit Beschreibung (was, warum, was getestet, Owner-Schritte nach dem Merge). ROADMAP und docs/PROJEKTSTATUS.md aktualisieren. Keine Schemaänderung und keine neue Abhängigkeit ohne Rückfrage. Bei Unklarheiten nicht raten, sondern im PR als Rückfrage aufführen.
```

### Zeitabhängige Funktion auf der Preview testen

```
Weiter auf Branch <name>. Setze <Konstante> vorübergehend auf <Testwert>, eigener Commit mit der Nachricht "TEMP: <Beschreibung>, vor Merge zurücksetzen". Pushe und nenne mir die Preview-Adresse. Warte auf meine Rückmeldung. Bei "Test bestanden": TEMP-Commit per Revert zurücknehmen, Lint, Tests, Build, Push, und bestätige mir den Wert der Konstante im Branch. Bei Fehlern: Ursache beheben, erneut testen lassen.
```

### Build-Fehler auf Vercel

```
Lies CLAUDE.md, AGENTS.md, ROADMAP.md und docs/PROJEKTSTATUS.md. Branch fix/vercel-build-<datum> auf main.
Problem: Production-Build auf Vercel schlägt fehl (Commit <hash>). Build-Log:
<LOG EINFÜGEN>
Aufgabe: Ursache aus dem Log bestimmen und beheben, ohne Funktionsänderung. Build lokal unter Vercel-Bedingungen reproduzieren (NODE_ENV=production, ohne .env, Node 22, .next vorher löschen). Lint, Tests, Build, PR mit kurzer Beschreibung der Ursache. Keine Schemaänderung, keine neue Abhängigkeit.
```

### Phase 3 (erst nach Anbieterentscheidung)

```
Lies ROADMAP.md und docs/PROJEKTSTATUS.md Abschnitt 3, 10 und 12. Anbieter: <Stripe oder Mollie>. Preis: <…>, Rhythmus: <…>, Testphase und Übergang: <…>.
Baue Phase 3 in drei gestapelten PRs: (1) Migration subscriptions, Webhook-Route mit Signaturprüfung und Idempotenz, Plan-Setzung über lib/access.ts; (2) REGISTRATION.defaultPlan auf 'none', Seite "Abo abschließen" statt /no-access für plan = none mit Pflichtangaben und Schaltfläche "Zahlungspflichtig bestellen", Checkout-Start mit Nutzer-ID, Rückkehrseite; (3) Kundenportal-Link, Kündigungs- und Widerrufsfunktion (Widerrufsbelehrung liegt unter /agb#widerruf), App-Mails (Zahlung fehlgeschlagen, Abo beendet, Willkommen), README mit Owner-Schritten (Webhook-URL, Secrets, Produkt und Preis beim Anbieter). Keine echten Zahlungen in Tests; Testmodus des Anbieters.
```

## 15. Nebenthemen außerhalb dieses Projekts (aus dem Gespräch vom 11.11.)

Nicht Teil des Tools, hier nur festgehalten, damit sie nicht verloren gehen:

- **Mentoring-Website:** Thilo wünscht eine eigene Website für das Mentoring, getrennt von hygge-homes.de, weil die Hauptseite zu sehr ablenkt. Inhalte aus dem Podcast-Transkript ("Family und Business") ableiten, Gestaltung in der bestehenden Linie mit beigen Farben, echte Fotos aus dem Shooting statt KI-Bildern. Benötigt: Transkripte und Bildmaterial von Thilo. Vertrieb über Social Media noch nicht geplant.
- **Kursplattform:** Das Mentoring läuft derzeit über Memberspot; Learning Suite wurde als Vorbild gezeigt. Ein Nachbau einer einfachen Plattform (Videos, Tools, Kalender) wäre möglich, Community-Funktionen wären der aufwendige Teil. Keine Entscheidung.
