"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Notice } from "@/components/ui";

/**
 * Login-Seite des gemeinsamen Passwortschutzes.
 *
 * Nach erfolgreicher Anmeldung wird auf die ursprünglich aufgerufene Seite
 * weitergeleitet (Query-Parameter "from", nur seiteninterne Pfade erlaubt).
 */
export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const from = new URLSearchParams(window.location.search).get("from");
        const target =
          from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
        window.location.assign(target);
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Anmeldung fehlgeschlagen.");
      setPending(false);
    } catch {
      setError("Keine Verbindung zum Server. Später erneut versuchen.");
      setPending(false);
    }
  }

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Zugang
        </h1>
        <p className="text-sm text-muted mb-5">
          Dieser Bereich ist passwortgeschützt. Passwort eingeben, um die
          Objekt- und Standortanalyse zu öffnen.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="site-password"
              className="block text-sm text-ink mb-1.5"
            >
              Passwort
            </label>
            <input
              id="site-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe"
            />
          </div>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            className="w-full"
          >
            {pending ? "Wird geprüft …" : "Anmelden"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
