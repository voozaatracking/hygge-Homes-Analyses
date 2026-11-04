"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card, Notice } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/registration";

/**
 * Formular der Selbstregistrierung. Legt das Konto über /api/register an;
 * kein automatischer Login, der Zugang folgt nach Bestätigung der E-Mail.
 * Das versteckte Feld "website" ist ein Honeypot gegen Bots.
 */
export function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [website, setWebsite] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
      return;
    }
    if (password !== repeat) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }
    if (!accepted) {
      setError("Bitte die AGB akzeptieren und die Datenschutzerklärung zur Kenntnis nehmen.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, website }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "Die Registrierung ist fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      setDone(true);
    } catch {
      setError("Keine Verbindung zum Server. Später erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";
  const linkClass = "underline underline-offset-2 text-taupe hover:text-ink";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Registrieren
        </h1>

        {done ? (
          <div className="space-y-4">
            <Notice kind="success">
              Wir haben dir eine E-Mail geschickt. Bestätige deine Adresse über
              den Link, danach kannst du dich anmelden.
            </Notice>
            <p className="text-sm">
              <Link href="/login" className={linkClass}>
                Zur Anmeldung
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-5">
              Konto mit E-Mail-Adresse und Passwort anlegen. Nach der
              Registrierung bestätigst du deine Adresse über einen Link per
              E-Mail.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm text-ink mb-1.5">
                  Anzeigename (optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-ink mb-1.5">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm text-ink mb-1.5">
                  Passwort (mindestens {MIN_PASSWORD_LENGTH} Zeichen)
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="repeat" className="block text-sm text-ink mb-1.5">
                  Passwort wiederholen
                </label>
                <input
                  id="repeat"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Honeypot: für Menschen unsichtbar, von Bots oft ausgefüllt. */}
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 accent-[var(--taupe)]"
                />
                <span>
                  Ich akzeptiere die{" "}
                  <Link href="/agb" className={linkClass} target="_blank">
                    AGB
                  </Link>{" "}
                  und habe die{" "}
                  <Link href="/datenschutz" className={linkClass} target="_blank">
                    Datenschutzerklärung
                  </Link>{" "}
                  gelesen.
                </span>
              </label>

              {error ? <Notice kind="warning">{error}</Notice> : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={
                  pending ||
                  email.trim() === "" ||
                  password === "" ||
                  repeat === "" ||
                  !accepted
                }
              >
                {pending ? "Wird angelegt …" : "Konto anlegen"}
              </Button>
            </form>
            <p className="mt-4 text-sm">
              <Link href="/login" className={linkClass}>
                Bereits ein Konto? Anmelden
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
