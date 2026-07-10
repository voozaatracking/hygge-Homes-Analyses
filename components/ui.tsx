"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ValueSource } from "@/lib/types/analysis";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-card border border-line rounded-xl p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-display text-base tracking-[0.12em] uppercase text-ink">
        {children}
      </h3>
      {hint ? <p className="text-sm text-muted mt-1">{hint}</p> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-ink text-cream hover:bg-ink/90 border border-ink disabled:opacity-40",
    secondary:
      "bg-card text-ink border border-line hover:bg-card-soft disabled:opacity-40",
    ghost: "text-muted hover:text-ink hover:bg-card-soft disabled:opacity-40",
    danger:
      "bg-card text-brick border border-brick/40 hover:bg-brick-soft disabled:opacity-40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 text-sm rounded-lg transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Kennzeichnung der Wertherkunft: manuell eingegeben oder automatisch berechnet.
 * Information wird über Text vermittelt, nicht nur über Farbe.
 */
export function SourceBadge({
  source,
  className = "",
}: {
  source: ValueSource;
  className?: string;
}) {
  const map: Record<ValueSource, { text: string; cls: string }> = {
    manual: { text: "manuell eingegeben", cls: "bg-greige text-ink" },
    derived: {
      text: "automatisch berechnet",
      cls: "bg-sage-soft text-sage",
    },
    unavailable: {
      text: "nicht verfügbar",
      cls: "bg-card-soft text-muted",
    },
  };
  const item = map[source];
  return (
    <span
      className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${item.cls} ${className}`}
    >
      {item.text}
    </span>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: "warning" | "error" | "info" | "success";
  children: ReactNode;
}) {
  const map = {
    warning: "bg-ochre-soft border-ochre/40 text-ochre",
    error: "bg-brick-soft border-brick/40 text-brick",
    info: "bg-card-soft border-line text-muted",
    success: "bg-sage-soft border-sage/40 text-sage",
  } as const;
  const prefix = {
    warning: "Hinweis",
    error: "Fehler",
    info: "Info",
    success: "OK",
  } as const;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`border rounded-lg px-3 py-2 text-sm ${map[kind]}`}
    >
      <span className="font-medium mr-1">{prefix[kind]}:</span>
      {children}
    </div>
  );
}

/** Kleiner Erklärungs-Tooltip, per Klick oder Tastatur bedienbar. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <span className="relative inline-block align-middle" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Erklärung anzeigen"
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 inline-flex items-center justify-center w-4.5 h-4.5 w-[18px] h-[18px] text-[11px] rounded-full border border-line text-muted hover:text-ink hover:border-taupe"
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute z-20 left-0 top-6 w-64 bg-card border border-line rounded-lg p-3 text-xs text-ink shadow-sm"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

/** Bestätigung vor destruktiven Aktionen (Zurücksetzen, Entfernen). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-card border border-line rounded-xl p-6 max-w-md w-full">
        <h3 className="font-display text-lg tracking-wide text-ink mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
