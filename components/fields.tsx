"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { numberToInput, parseLocaleNumber } from "@/lib/format";
import { InfoTip } from "@/components/ui";

function FieldShell({
  id,
  label,
  help,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink flex items-center">
        {label}
        {help ? <InfoTip text={help} /> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-brick" role="alert">
          {error}
        </p>
      ) : null}
      {hint && !error ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

const inputClass =
  "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

/**
 * Zahleneingabe mit deutschem Zahlenformat (Komma als Dezimaltrennzeichen).
 * Der lokale Text-State erlaubt Zwischenzustände wie "1," während des Tippens.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  help,
  error,
  placeholder,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  help?: string;
  error?: string;
  placeholder?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  const [text, setText] = useState(() => numberToInput(value));
  const [invalid, setInvalid] = useState(false);
  const lastEmitted = useRef<number | null>(value);

  // Externen Wert übernehmen (z. B. nach Import), ohne laufende Eingaben zu stören.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(numberToInput(value));
      setInvalid(false);
      lastEmitted.current = value;
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = parseLocaleNumber(raw);
    if (parsed !== null && Number.isNaN(parsed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    lastEmitted.current = parsed;
    onChange(parsed);
  };

  return (
    <FieldShell
      id={id}
      label={label}
      help={help}
      error={error ?? (invalid ? "Bitte eine gültige Zahl eingeben." : undefined)}
      hint={hint}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          aria-invalid={Boolean(error) || invalid}
          className={`${inputClass} ${unit ? "pr-16" : ""} tabular`}
        />
        {unit ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
            {unit}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

export function TextField({
  label,
  value,
  onChange,
  help,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
  type?: "text" | "url" | "date";
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} help={help}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  help,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} help={help}>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  help?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} help={help}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Radiogruppe, z. B. für die eindeutige Nachtpreis-Variante. */
export function RadioGroup({
  legend,
  value,
  onChange,
  options,
  help,
}: {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  help?: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm text-ink mb-1.5 flex items-center">
        {legend}
        {help ? <InfoTip text={help} /> : null}
      </legend>
      <div className="flex flex-col sm:flex-row gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
              value === o.value
                ? "border-taupe bg-card-soft text-ink"
                : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="accent-[var(--taupe)]"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm text-ink cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--taupe)] w-4 h-4"
      />
      {label}
      {help ? <InfoTip text={help} /> : null}
    </label>
  );
}
