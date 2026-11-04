# E-Mail-Versand und Selbstregistrierung einrichten (Owner-Schritte)

Reihenfolge einhalten. Alle Schritte im Supabase-Dashboard des Projekts.

## 1. Custom SMTP (Strato) prüfen oder eintragen
Authentication → Emails → SMTP Settings → „Enable Custom SMTP“.

| Feld | Wert |
| --- | --- |
| Sender email | die Absenderadresse des Strato-Postfachs |
| Sender name | `Hygge Homes Analyse` |
| Host | `smtp.strato.de` |
| Port | `465` (SSL/TLS) |
| Username | vollständige E-Mail-Adresse des Postfachs |
| Password | Postfach-Passwort |

Speichern und mit „Send test email“ prüfen, ob die Mail ankommt (auch Spam-Ordner).

## 2. Vorlagen einfügen
Authentication → Emails → Templates. Für jede Vorlage Betreff und HTML-Body aus `docs/supabase/email-templates/` einsetzen:

| Vorlage im Dashboard | Datei | Betreff |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | `Bitte E-Mail-Adresse bestätigen` |
| Invite user | `invite.html` | `Einladung zur Hygge Homes Analyse` |
| Reset password | `recovery.html` | `Passwort zurücksetzen` |

Die Links nutzen `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…`. Dafür müssen unter Authentication → URL Configuration die Site URL (Produktionsdomain) und die Redirect URLs (`https://<domain>/auth/callback`, für Previews `https://*-<team>.vercel.app/auth/callback`) eingetragen sein.

## 3. Selbstregistrierung einschalten
Authentication → Providers → Email: „Enable Email provider“ an, „Confirm email“ an, **„Allow new users to sign up“ an**. „Secure email change“ kann an bleiben.

## 4. Rate-Limit für E-Mails anheben
Authentication → Rate Limits → „Rate limit for sending emails“: Standard ist sehr niedrig. Mit Custom SMTP auf einen passenden Wert anheben (z. B. 30 pro Stunde), sonst scheitern mehrere Registrierungen oder Resets kurz hintereinander.

## 5. Test-Registrierung
1. Mit einer Zweitadresse unter `/registrieren` ein Konto anlegen.
2. Bestätigungsmail öffnen, Link anklicken; es muss die Startseite mit Sitzung erscheinen.
3. Abmelden und unter `/login` mit der Zweitadresse anmelden.
4. Unter `/admin` prüfen: Konto mit „E-Mail bestätigt: ja“, Plan laut `lib/config/registration.ts` (derzeit Pro, 180 Tage).
5. Gegenprobe: Vor der Bestätigung anmelden → Meldung „Bitte bestätige zuerst deine E-Mail-Adresse.“

## Hinweise
- Der Startplan neuer Konten steht in `lib/config/registration.ts`. Phase 3 (Payment) setzt `defaultPlan` auf `none`; dann landen neue Konten auf „Kein Zugang“ bzw. der Abo-Seite.
- Honeypot und Rate-Limit (10 Versuche je IP und Stunde, je Serverinstanz) schützen `/api/register`; bei Missbrauch zusätzlich Supabase-Rate-Limits nutzen.
