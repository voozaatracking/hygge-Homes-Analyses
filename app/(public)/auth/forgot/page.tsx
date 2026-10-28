"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card, Notice } from "@/components/ui";
import { describeAuthError, getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Passwort-Reset anfordern. Die Antwort ist bewusst neutral, damit sich
 * nicht ermitteln lässt, ob eine Adresse ein Konto hat.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      setPending(false);
      return;
    }

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
      }
    );
    if (authError && /rate limit|too many/i.test(authError.message)) {
      setError(describeAuthError(authError.message));
      setPending(false);
      return;
    }
    // Andere Fehler (z. B. unbekannte Adresse) bewusst nicht unterscheiden.
    setSent(true);
    setPending(false);
  }

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Passwort zurücksetzen
        </h1>
        <p className="text-sm text-muted mb-5">
          Wenn zu dieser Adresse ein Konto existiert, kommt eine E-Mail mit
          einem Link zum Setzen eines neuen Passworts.
        </p>

        {sent ? (
          <Notice kind="info">
            Falls ein Konto existiert, wurde die E-Mail versendet. Bitte auch
            den Spam-Ordner prüfen. Der Link ist zeitlich begrenzt gültig.
          </Notice>
        ) : (
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
            {error ? <Notice kind="warning">{error}</Notice> : null}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={pending || email.trim() === ""}
            >
              {pending ? "Wird gesendet …" : "Link anfordern"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-sm">
          <Link
            href="/login"
            className="underline underline-offset-2 text-taupe hover:text-ink"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      </Card>
    </div>
  );
}
