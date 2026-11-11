# Projektstatus Hygge Homes Analyse

Stand 11.11.2026, nach PR 1 bis 14. Detailplanung und Phasen in `ROADMAP.md`, Owner-Schritte in `README.md` und `docs/supabase/email-setup.md`.

## 1. Ziel
Aus dem internen Rechentool für Ferienunterkünfte wird ein SaaS mit Nutzerprofilen und Abo-Modell. Umbau in gestapelten Pull Requests, jeder Schritt mit Lint, Tests und Build.

## 2. Grundentscheidungen
| Thema | Entscheidung |
| --- | --- |
| Auth | Supabase Auth, E-Mail und Passwort, Sitzung in Cookies (`@supabase/ssr`) |
| Zugang | Offene Selbstregistrierung mit Bestätigungsmail; jedes neue Konto erhält den Startplan aus der Konstante `lib/config/registration.ts` (derzeit Pro, 180 Tage). Einladung durch den Admin bleibt möglich. Zugang erst nach bestätigter E-Mail und Anmeldung. |
| E-Mail-Versand | Custom SMTP über Strato (`smtp.strato.de`, Port 465), Vorlagen mit `token_hash`-Links in `docs/supabase/email-templates/` |
| Zugriffsregel | aktiv und (Admin oder Plan „internal“ oder Plan „pro“ mit leerem oder zukünftigem Gültigkeitsdatum); serverseitig in `lib/access.ts` bei jedem Request aus `profiles` |
| Datenzugriff | nur serverseitig über Route Handler mit Service-Role-Key; RLS ohne Policies; Browser-Client nur für Auth |
| Datenmodell | `analysis_state` (ein versioniertes Analyse-JSON je Nutzer, Optimistic Lock), `profiles` (Spalten Rolle, Plan, Gültigkeit, aktiv; Rest als versioniertes JSON in `settings`) |
| Teams | keine, Daten hängen am Nutzer |
| Pläne | kein Free-Tier; „pro“ bezahlt, „internal“ ohne Payment, „none“ ohne Zugang |

## 3. Umgesetzte Schritte
| PR | Inhalt |
| --- | --- |
| 1 | ROADMAP, README, `.gitignore`, Kurtaxe in Euro oder Prozent |
| 2 | Keep-alive-Cron für Supabase Free |
| 3 | Aufräumen (Texte, Build-Artefakte) |
| 4 | Supabase Auth, `profiles`, Migrationen, Zugriffsschicht, Verwaltung, Auth-Seiten |
| 5 | Optimistic Lock für den Datenstand |
| 6 | Formular in Sektionen, Cloud-Sync und Autosave als Hooks |
| 7 | Profilseite, Standardannahmen, Firmendaten, Geokodierung |
| 8 | Objektadresse, Entfernung zum Firmensitz, Fahrtkosten |
| 9 | Gebrandeter Report mit Sektionsauswahl und Druckansicht |
| 10 | Go-Live-Vorbereitung: Security-Header, Schlüsselformate, Onboarding, Hinweise, Rechtsseiten, Rate-Limit |
| 11 | Selbstregistrierung mit Bestätigungsmail, Honeypot, Rate-Limit je IP, Startplan per Konstante, E-Mail-Vorlagen, Kennzeichen „E-Mail bestätigt“ |
| 12 | Bestätigungsmail erneut anfordern, Hinweis bei unbestätigtem Konto, Spalte „Registriert am“ |
| 13 | Vercel-Build repariert: Schriften selbst gehostet über `next/font/local` statt Google-Download zur Build-Zeit |
| 14 | Session 3: Fahrtkosten-Hinweise mit Einzelursachen, Brutto-Hinweis, automatische Abmeldung nach 12 Stunden, Mindestpreis aus dem Break-even, Reiter „Pricing-Tool“ mit Standardwerten im Profil |

## 4. Architektur
- `proxy.ts`: Sitzung aus Cookies lesen und erneuern, ohne Datenbank; öffentliche Pfade: `/login`, `/auth/*`, `/registrieren`, `/no-access`, Rechtsseiten.
- `app/(app)/`: geschützte Seiten mit Server-Layout (Sitzung und Zugang), `app/(public)/`: Login, Registrierung, Auth-Flows, Rechtsseiten.
- `lib/access.ts`: einzige Zugriffsschicht (`getSessionUser`, `getAccess`, `requireAccess`, `requireAdmin`); Einstiegspunkt für Feature-Gating in Phase 3.
- `lib/calculations/`: Rechenlogik rein und ohne IO; externe Werte (Firmensitz-Koordinaten) als Parameter.
- `lib/profile/settings.ts`: versioniertes Zod-Schema für `profiles.settings` (Standardannahmen, Firmendaten, Firmensitz, Report).

## 5. API
| Route | Zweck | Zugang |
| --- | --- | --- |
| `GET/PUT /api/data` | Datenstand je Nutzer mit Optimistic Lock | Nutzer mit Zugang |
| `GET /api/me` | Access-Objekt des angemeldeten Nutzers | Sitzung |
| `POST /api/logout` | Sitzung beenden | Sitzung |
| `GET/PUT /api/profile` | Anzeigename und Einstellungen | Nutzer mit Zugang |
| `POST /api/geocode` | Adresse zu Koordinaten (Nominatim), 30 je Nutzer und Stunde | Nutzer mit Zugang |
| `POST /api/register` | Selbstregistrierung: Validierung, Honeypot, 10 Versuche je IP und Stunde, Dublettenprüfung (409, bei unbestätigtem Konto `unconfirmed: true`), signUp ohne Sitzung, Startplan setzen | öffentlich |
| `POST /api/register/resend` | Bestätigungsmail erneut senden (`auth.resend`, nur bei unbestätigtem Konto, Antwort immer neutral), 3 je E-Mail und 10 je IP pro Stunde | öffentlich |
| `GET/POST/PATCH/DELETE /api/admin/users` | Nutzerverwaltung inkl. „E-Mail bestätigt“ | Admin |
| `GET /api/cron/keepalive` | Keep-alive für Supabase Free | `CRON_SECRET` |
| `GET /auth/callback` | Code oder Token-Hash gegen Sitzung tauschen (`type` email/signup, invite, recovery), `next` beachten | öffentlich |

## 6. Umgebungsvariablen
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon-JWT oder `sb_publishable_`), `SUPABASE_SERVICE_ROLE_KEY` (service_role-JWT oder `sb_secret_`), `CRON_SECRET`. `SITE_PASSWORD` entfällt.

## 7. Konstanten und Annahmen
| Konstante | Ort | Wert |
| --- | --- | --- |
| Rechenbasis | `lib/config/assumptions.ts` | 30 Tage pro Monat, 12 Monate pro Jahr |
| Strom, Reinigung, Provision | `lib/config/assumptions.ts` | 0,35 €/kWh, 30 % Aufschlag; 2 Min/qm, 22 €/h, 4 Wechsel; 15 % |
| Umwegfaktor | `lib/config/assumptions.ts` | `DETOUR_FACTOR` 1,3 |
| Startplan Registrierung | `lib/config/registration.ts` | `REGISTRATION = { defaultPlan: "pro", defaultValidDays: 180 }`; Phase 3 setzt `defaultPlan` auf `none` |
| Passwortregel | `lib/registration.ts` | mindestens 8 Zeichen |
| Rate-Limits | `app/api/geocode`, `app/api/register`, `app/api/register/resend` | 30 je Nutzer und Stunde; 10 je IP und Stunde; 3 je E-Mail und 10 je IP pro Stunde (In-Memory je Serverinstanz) |
| Logo | `lib/profile/settings.ts` | PNG, JPEG, SVG als Data-URL, maximal 300 KB |
| Automatische Abmeldung | `lib/config/session.ts` | `SESSION_MAX_HOURS` 12, absolute Höchstdauer ab Anmeldung; Anker: signiertes Cookie `hh_session_start` (session_id) und `auth.users.last_sign_in_at`, der frühere Zeitpunkt zählt |
| Brutto-Regel | `lib/config/texts.ts` | Alle Beträge sind Bruttobeträge (inkl. Umsatzsteuer); keine Umrechnung, kein Schalter |
| Mindestpreis | `lib/calculations/pricing.ts` | Break-even-Nachtpreis (Monatsgewinn 0 bei Bezugsauslastung) × (1 + Aufschlag), Aufschlag Standard 10 %, Vergleichswert bei 30 Nächten |
| Pricing-Standardwerte | `lib/config/assumptions.ts` `PRICING_DEFAULTS` | Aufschlag 10 %, Lücken bis 7 Nächte mit Mindestaufenthalt 1, Last-Minute ab 4 Tagen mit Mindestaufenthalt 1; Mindestaufenthalte und Basispreis ohne Vorgabe (fachliche Werte offen). Pflegbar im Profil (`defaults.pricing`), gelten für neue Objekte |

## 8. Phase 3 (Abo und Payment), geplanter Ablauf
1. Registrierung und E-Mail-Bestätigung existieren (PR 11). Startplan in `lib/config/registration.ts` auf `none` setzen.
2. Abo-Seite anlegen, auf die Konten ohne Zugang geführt werden (statt „Kein Zugang“).
3. Anbieter wählen (Stripe oder Mollie), Abo-Tabelle, Webhook-Route, die `profiles.plan` und `plan_valid_until` schreibt.
4. Feature-Gating über `lib/access.ts`.

## 9. Offene Punkte
- Fachliche Standardwerte für Mindestaufenthalt und Basispreis im Pricing-Tool.
- Sitzungsgrenze über `auth.sessions` bzw. Supabase-Dashboard (Time-box, eine Sitzung je Nutzer) erst mit Supabase Pro; bis dahin App-Lösung aus PR 14 (signiertes Cookie plus `last_sign_in_at`), keine Migration. Entscheidung des Owners vom 11.11.2026.
- Der Reiter „Pricing-Tool“ erscheint vorerst nicht im Report.

## 10. Offene Owner-Schritte
- Supabase-Auth-Schritte aus der README (Migrationen inkl. 0004, Redirect-URLs, Datenübernahme, `0003_drop_app_users`).
- E-Mail-Versand nach `docs/supabase/email-setup.md`: Custom SMTP prüfen, Vorlagen einfügen, „Allow new users to sign up“ einschalten, Rate-Limit für E-Mails anheben, Test-Registrierung.
- Rechtstexte für Impressum, Datenschutz und AGB einsetzen.
- Probedruck des Reports, CSP im Preview prüfen, eigene Domain.
