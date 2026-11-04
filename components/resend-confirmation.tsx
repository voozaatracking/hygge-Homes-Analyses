"use client";

import { useState } from "react";
import { Button, Notice } from "@/components/ui";

/**
 * Button "Bestätigungsmail erneut senden" für Registrierung und Anmeldung.
 * Ruft /api/register/resend auf und zeigt dessen neutrale Antwort an.
 */
export function ResendConfirmation({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "warning"; text: string } | null>(null);

  const resend = async () => {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;
      if (response.ok && body?.ok) {
        setMessage({ kind: "info", text: body.message ?? "Bestätigungsmail angefordert." });
      } else {
        setMessage({
          kind: "warning",
          text: body?.error ?? "Die Bestätigungsmail konnte nicht angefordert werden.",
        });
      }
    } catch {
      setMessage({ kind: "warning", text: "Keine Verbindung zum Server. Später erneut versuchen." });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={() => void resend()} disabled={pending || email.trim() === ""}>
        {pending ? "Wird gesendet …" : "Bestätigungsmail erneut senden"}
      </Button>
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
    </div>
  );
}
