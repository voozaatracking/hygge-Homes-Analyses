"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card, Notice } from "@/components/ui";
import { describeAuthError, getBrowserSupabase } from "@/lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Passwort setzen nach Einladung oder Reset.
 *
 * Die Sitzung stammt entweder aus /auth/callback (Cookie bereits gesetzt)
 * oder aus dem URL-Fragment des Einladungslinks, das der Browser-Client beim
 * Laden selbst übernimmt. Ohne Sitzung ist der Link ungültig oder abgelaufen.
 */
export default function SetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "session" | "none">(
    "checking"
  );
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    // Entkoppelt vom Render-Zyklus; alle setState-Aufrufe folgen asynchron.
    const check = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setReady("none");
        setError("Supabase ist nicht konfiguriert.");
        return;
      }
      if (new URLSearchParams(window.location.search).get("error") === "link") {
        setReady("none");
        return;
      }

      // Fragment-Sitzungen treffen asynchron ein, deshalb auf das Ereignis
      // hören und zusätzlich einmal direkt nachsehen.
      const { data: subscription } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!cancelled && session) setReady("session");
        }
      );
      unsubscribe = () => subscription.subscription.unsubscribe();

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady("session");
        return;
      }
      // Kurze Gnadenfrist für die Übernahme aus dem Fragment.
      window.setTimeout(() => {
        if (!cancelled) {
          setReady((current) => (current === "checking" ? "none" : current));
        }
      }, 1500);
    };
    const timeout = window.setTimeout(() => void check(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
      return;
    }
    if (password !== repeat) {
      setError("Die beiden Eingaben stimmen nicht überein.");
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setPending(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(describeAuthError(authError.message));
      setPending(false);
      return;
    }
    setDone(true);
    window.setTimeout(() => window.location.assign("/"), 1200);
  }

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Passwort setzen
        </h1>

        {ready === "checking" ? (
          <p className="text-sm text-muted">Link wird geprüft …</p>
        ) : ready === "none" ? (
          <div className="space-y-4">
            <Notice kind="warning">
              {error ??
                "Der Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern oder erneut einladen lassen."}
            </Notice>
            <p className="text-sm">
              <Link
                href="/auth/forgot"
                className="underline underline-offset-2 text-taupe hover:text-ink"
              >
                Neuen Link anfordern
              </Link>
            </p>
          </div>
        ) : done ? (
          <Notice kind="info">Passwort gespeichert. Weiter zur Anwendung …</Notice>
        ) : (
          <>
            <p className="text-sm text-muted mb-5">
              Bitte ein neues Passwort mit mindestens {MIN_PASSWORD_LENGTH}{" "}
              Zeichen vergeben.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm text-ink mb-1.5">
                  Neues Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
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
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className={inputClass}
                />
              </div>
              {error ? <Notice kind="warning">{error}</Notice> : null}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={pending || password === "" || repeat === ""}
              >
                {pending ? "Wird gespeichert …" : "Passwort speichern"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
