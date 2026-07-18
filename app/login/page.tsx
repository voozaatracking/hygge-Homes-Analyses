"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Notice } from "@/components/ui";

/**
 * Login-Seite: Benutzername und Passwort.
 * Nach erfolgreicher Anmeldung wird auf die ursprünglich aufgerufene Seite
 * weitergeleitet (Query-Parameter "from", nur seiteninterne Pfade erlaubt).
 */
export default function LoginPage() {
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({ username, password }),
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

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-1">
          Anmeldung
        </h1>
        <p className="text-sm text-muted mb-5">
          Mit dem persönlichen Zugang anmelden, um die Objekt- und
          Standortanalyse zu öffnen.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="block text-sm text-ink mb-1.5"
            >
              Benutzername
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm text-ink mb-1.5"
            >
              Passwort
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
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
