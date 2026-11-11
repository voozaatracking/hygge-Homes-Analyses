"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card, Notice } from "@/components/ui";
import {
  describeAuthError,
  getBrowserSupabase,
  isEmailNotConfirmed,
} from "@/lib/supabase/browser";
import { ResendConfirmation } from "@/components/resend-confirmation";

/**
 * Anmeldung mit E-Mail und Passwort über Supabase Auth.
 * Nach Erfolg geht es zur ursprünglich aufgerufenen Seite
 * (Query-Parameter "from", nur seiteninterne Pfade erlaubt).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    // Query erst im Browser lesen, damit Server- und Client-HTML übereinstimmen.
    const timeout = window.setTimeout(() => {
      setExpiredNotice(
        new URLSearchParams(window.location.search).get("reason") === "expired"
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setUnconfirmed(false);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError(
        "Supabase ist nicht konfiguriert. NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen und neu deployen."
      );
      setPending(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      // Vereinzelt meldet der Client einen Fehler, obwohl die Anmeldung
      // serverseitig gelungen ist (z. B. Abbruch nach dem Setzen der Cookies).
      // Dann nicht "fehlgeschlagen" zeigen, sondern mit der Sitzung weitergehen.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError(describeAuthError(authError.message));
        setUnconfirmed(isEmailNotConfirmed(authError.message));
        setPending(false);
        return;
      }
    }

    const from = new URLSearchParams(window.location.search).get("from");
    const target =
      from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
    // Vollständiger Seitenwechsel, damit Server-Layouts die neue Sitzung sehen.
    window.location.assign(target);
  }

  const configError =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "config";

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Anmeldung
        </h1>
        <p className="text-sm text-muted mb-5">
          Mit E-Mail-Adresse und Passwort anmelden. Neue Konten brauchen
          zuerst die Bestätigung der E-Mail-Adresse.
        </p>

        {expiredNotice ? (
          <div className="mb-4">
            <Notice kind="info">
              Du wurdest aus Sicherheitsgründen nach 12 Stunden automatisch
              abgemeldet. Bitte melde dich erneut an.
            </Notice>
          </div>
        ) : null}

        {configError ? (
          <div className="mb-4">
            <Notice kind="warning">
              Supabase ist auf dem Server nicht konfiguriert.
            </Notice>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-ink mb-1.5">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-ink mb-1.5">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? <Notice kind="warning">{error}</Notice> : null}
          {unconfirmed ? <ResendConfirmation email={email} /> : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={pending || email.trim() === "" || password === ""}
          >
            {pending ? "Wird geprüft …" : "Anmelden"}
          </Button>
        </form>

        <p className="mt-4 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/auth/forgot"
            className="underline underline-offset-2 text-taupe hover:text-ink"
          >
            Passwort vergessen
          </Link>
          <Link
            href="/registrieren"
            className="underline underline-offset-2 text-taupe hover:text-ink"
          >
            Noch kein Konto? Registrieren
          </Link>
        </p>
      </Card>
    </div>
  );
}
