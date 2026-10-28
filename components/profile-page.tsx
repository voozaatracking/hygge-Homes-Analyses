"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAnalysis } from "@/components/providers";
import { NumberField, SelectField, TextField } from "@/components/fields";
import { Button, Card, Notice, SectionTitle } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { fmtDateTime } from "@/lib/format";
import {
  LOGO_MAX_BYTES,
  type ProfileSettings,
} from "@/lib/profile/settings";
import { describeAuthError, getBrowserSupabase } from "@/lib/supabase/browser";

const PLAN_LABEL: Record<string, string> = {
  none: "kein Plan",
  internal: "Intern",
  pro: "Pro",
};

const MIN_PASSWORD_LENGTH = 8;
/** Längste Kante des Logos nach clientseitiger Verkleinerung. */
const LOGO_MAX_EDGE = 600;

type Message = { kind: "success" | "error"; text: string } | null;

/**
 * Profilseite: Konto, Standardannahmen für neue Objekte, Firmendaten.
 * Einstellungen werden gesammelt über PUT /api/profile gespeichert; die
 * Passwortänderung läuft direkt über Supabase Auth (Browser-Client, nur Auth).
 */
export function ProfilePage() {
  const { profile, refreshProfile } = useAnalysis();
  const [displayName, setDisplayName] = useState("");
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const initializedRef = useRef(false);

  // Formular einmalig aus dem geladenen Profil befüllen.
  useEffect(() => {
    if (!profile || initializedRef.current) return;
    initializedRef.current = true;
    const timeout = window.setTimeout(() => {
      setDisplayName(profile.displayName ?? "");
      setSettings(structuredClone(profile.settings));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [profile]);

  const update = (updater: (draft: ProfileSettings) => void) => {
    setSettings((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      updater(next);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, settings }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        setMessage({ kind: "error", text: body?.error ?? "Speichern fehlgeschlagen." });
      } else {
        setMessage({ kind: "success", text: "Profil gespeichert." });
        setDirty(false);
        await refreshProfile();
      }
    } catch {
      setMessage({ kind: "error", text: "Speichern fehlgeschlagen." });
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !settings) {
    return (
      <div className="py-8">
        <p className="text-sm text-muted">Profil wird geladen …</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
          Profil
        </h1>
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="text-xs text-muted">Ungespeicherte Änderungen</span>
          ) : null}
          <Button variant="primary" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Wird gespeichert …" : "Profil speichern"}
          </Button>
        </div>
      </div>

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <AccountSection
        email={profile.email}
        plan={profile.plan}
        planValidUntil={profile.planValidUntil}
        displayName={displayName}
        onDisplayName={(value) => {
          setDisplayName(value);
          setDirty(true);
        }}
      />

      <DefaultsSection settings={settings} update={update} />

      <CompanySection settings={settings} update={update} setMessage={setMessage} />
    </div>
  );
}

function AccountSection({
  email,
  plan,
  planValidUntil,
  displayName,
  onDisplayName,
}: {
  email: string;
  plan: string;
  planValidUntil: string | null;
  displayName: string;
  onDisplayName: (value: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pwMessage, setPwMessage] = useState<Message>(null);
  const [pending, setPending] = useState(false);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPwMessage(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPwMessage({
        kind: "error",
        text: `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
      });
      return;
    }
    if (password !== repeat) {
      setPwMessage({ kind: "error", text: "Die beiden Eingaben stimmen nicht überein." });
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setPwMessage({ kind: "error", text: "Supabase ist nicht konfiguriert." });
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setPwMessage({ kind: "error", text: describeAuthError(error.message) });
      return;
    }
    setPassword("");
    setRepeat("");
    setPwMessage({ kind: "success", text: "Passwort geändert." });
  };

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

  return (
    <Card>
      <SectionTitle hint="E-Mail-Adresse und Plan verwaltet der Administrator.">
        Konto
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TextField
          label="Anzeigename"
          value={displayName}
          onChange={onDisplayName}
          placeholder="z. B. Anna"
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink">E-Mail-Adresse</span>
          <span className="text-sm text-muted py-2">{email}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink">Plan</span>
          <span className="text-sm text-muted py-2">{PLAN_LABEL[plan] ?? plan}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink">Gültig bis</span>
          <span className="text-sm text-muted py-2">
            {plan === "pro"
              ? planValidUntil
                ? fmtDateTime(planValidUntil).slice(0, 10)
                : "unbegrenzt"
              : "–"}
          </span>
        </div>
      </div>

      <form onSubmit={changePassword} className="mt-6 space-y-3">
        <h4 className="text-sm font-medium text-ink">Passwort ändern</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="pw-new" className="text-sm text-ink">
              Neues Passwort
            </label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pw-repeat" className="text-sm text-ink">
              Passwort wiederholen
            </label>
            <input
              id="pw-repeat"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button type="submit" disabled={pending || password === "" || repeat === ""}>
            {pending ? "Wird geändert …" : "Passwort ändern"}
          </Button>
        </div>
        {pwMessage ? <Notice kind={pwMessage.kind}>{pwMessage.text}</Notice> : null}
      </form>

      <div className="mt-6 flex justify-end">
        <LogoutButton />
      </div>
    </Card>
  );
}

function DefaultsSection({
  settings,
  update,
}: {
  settings: ProfileSettings;
  update: (updater: (draft: ProfileSettings) => void) => void;
}) {
  const d = settings.defaults;
  return (
    <Card>
      <SectionTitle hint="Gilt für neue Objekte. Bestehende Objekte und importierte Dateien behalten ihre Werte; je Objekt bleibt alles editierbar.">
        Standardannahmen
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumberField
          label="Strompreis"
          unit="€/kWh"
          value={d.electricity.pricePerKwh}
          onChange={(v) => update((s) => (s.defaults.electricity.pricePerKwh = v))}
        />
        <NumberField
          label="Aufschlag Strom"
          unit="%"
          value={d.electricity.surchargePct}
          onChange={(v) => update((s) => (s.defaults.electricity.surchargePct = v))}
        />
        <NumberField
          label="Plattformprovision"
          unit="%"
          value={d.revenue.platformCommissionPct}
          onChange={(v) => update((s) => (s.defaults.revenue.platformCommissionPct = v))}
        />
        <NumberField
          label="Reinigungszeit"
          unit="Min/qm"
          value={d.cleaning.minutesPerSqm}
          onChange={(v) => update((s) => (s.defaults.cleaning.minutesPerSqm = v))}
        />
        <NumberField
          label="Stundenlohn Reinigung"
          unit="€/Std."
          value={d.cleaning.hourlyWage}
          onChange={(v) => update((s) => (s.defaults.cleaning.hourlyWage = v))}
        />
        <NumberField
          label="Reinigungen / Gästewechsel"
          unit="pro Monat"
          value={d.cleaning.changesPerMonth}
          onChange={(v) => update((s) => (s.defaults.cleaning.changesPerMonth = v))}
        />
        <SelectField
          label="Kurtaxe-Modus"
          value={d.touristTax.mode}
          onChange={(v) => update((s) => (s.defaults.touristTax.mode = v))}
          options={[
            { value: "perPersonNight", label: "€/Person/Nacht" },
            { value: "percentOfPrice", label: "% vom Preis" },
          ]}
        />
        {d.touristTax.mode === "percentOfPrice" ? (
          <NumberField
            label="Kurtaxe"
            unit="%"
            value={d.touristTax.pct}
            onChange={(v) => update((s) => (s.defaults.touristTax.pct = v))}
          />
        ) : (
          <NumberField
            label="Kurtaxe"
            unit="€/Person/Nacht"
            value={d.touristTax.perPersonNight}
            onChange={(v) => update((s) => (s.defaults.touristTax.perPersonNight = v))}
          />
        )}
        <NumberField
          label="Gästewechsel (Standortanalyse)"
          unit="pro Woche"
          value={d.listing.changesPerWeek}
          onChange={(v) => update((s) => (s.defaults.listing.changesPerWeek = v))}
          help="Startwert der KW-Analyse neuer Standorte."
        />
      </div>
    </Card>
  );
}

/** Bild clientseitig verkleinern und als Data-URL liefern; SVG unverändert prüfen. */
async function prepareLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    if (file.size > LOGO_MAX_BYTES) {
      throw new Error("Die SVG-Datei ist größer als 300 KB.");
    }
    const text = await file.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    throw new Error("Erlaubt sind PNG, JPEG und SVG.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Bild konnte nicht verarbeitet werden.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // PNG behält Transparenz; JPEG mit moderater Qualität, bei Bedarf weiter reduzieren.
  let dataUrl =
    file.type === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.85);
  let quality = 0.75;
  while (dataUrl.length * 0.75 > LOGO_MAX_BYTES && quality >= 0.4) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    quality -= 0.1;
  }
  if (dataUrl.length * 0.75 > LOGO_MAX_BYTES) {
    throw new Error("Das Logo ist auch nach Verkleinerung größer als 300 KB.");
  }
  return dataUrl;
}

function CompanySection({
  settings,
  update,
  setMessage,
}: {
  settings: ProfileSettings;
  update: (updater: (draft: ProfileSettings) => void) => void;
  setMessage: (message: Message) => void;
}) {
  const c = settings.company;
  const [geocoding, setGeocoding] = useState(false);
  const [geoMessage, setGeoMessage] = useState<Message>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onLogoFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await prepareLogo(file);
      update((s) => (s.company.logoDataUrl = dataUrl));
      setMessage(null);
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Das Logo konnte nicht geladen werden.",
      });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const geocode = async () => {
    if (geocoding) return;
    setGeocoding(true);
    setGeoMessage(null);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: settings.hq.address }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        lat?: number;
        lng?: number;
        displayName?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok || body.lat == null || body.lng == null) {
        setGeoMessage({
          kind: "error",
          text: body?.error ?? "Die Koordinaten konnten nicht ermittelt werden.",
        });
        return;
      }
      const lat = body.lat;
      const lng = body.lng;
      update((s) => {
        s.hq.lat = lat;
        s.hq.lng = lng;
      });
      setGeoMessage({
        kind: "success",
        text: `Gefunden: ${body.displayName ?? settings.hq.address} (${lat.toFixed(5)}, ${lng.toFixed(5)}). Mit „Profil speichern“ übernehmen.`,
      });
    } catch {
      setGeoMessage({ kind: "error", text: "Die Koordinaten konnten nicht ermittelt werden." });
    } finally {
      setGeocoding(false);
    }
  };

  const colorField = (
    label: string,
    value: string | null,
    onChange: (value: string | null) => void
  ) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} wählen`}
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-md border border-line bg-card"
        />
        <input
          type="text"
          aria-label={`${label} als Hex-Wert`}
          value={value ?? ""}
          placeholder="#RRGGBB"
          onChange={(e) => onChange(e.target.value.trim() === "" ? null : e.target.value.trim())}
          className="w-28 bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted hover:text-ink underline underline-offset-2"
          >
            zurücksetzen
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card>
      <SectionTitle hint="Alle Angaben optional; sie erscheinen im gebrandeten Report. Fehlende Felder werden dort nicht angezeigt.">
        Firmendaten
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <TextField label="Firmenname" value={c.name} onChange={(v) => update((s) => (s.company.name = v))} />
        <TextField label="Straße und Hausnummer" value={c.street} onChange={(v) => update((s) => (s.company.street = v))} />
        <TextField label="PLZ" value={c.zip} onChange={(v) => update((s) => (s.company.zip = v))} />
        <TextField label="Ort" value={c.city} onChange={(v) => update((s) => (s.company.city = v))} />
        <TextField label="Land" value={c.country} onChange={(v) => update((s) => (s.company.country = v))} />
        <TextField label="Telefon" value={c.phone} onChange={(v) => update((s) => (s.company.phone = v))} />
        <TextField label="E-Mail (Kontakt)" value={c.email} onChange={(v) => update((s) => (s.company.email = v))} type="email" />
        <TextField label="Website" value={c.website} onChange={(v) => update((s) => (s.company.website = v))} type="url" placeholder="https://" />
        <TextField
          label="Registerangaben"
          value={c.registerInfo}
          onChange={(v) => update((s) => (s.company.registerInfo = v))}
          placeholder="z. B. HRB 12345, USt-ID DE…"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <span className="text-sm text-ink">Logo</span>
          <div className="flex items-center gap-3">
            {c.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoDataUrl}
                alt="Firmenlogo"
                className="h-16 max-w-[12rem] object-contain border border-line rounded-md bg-card p-1"
              />
            ) : (
              <span className="text-sm text-muted">Kein Logo hinterlegt.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={(e) => void onLogoFile(e.target.files?.[0])}
              className="text-sm text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-line file:bg-card file:text-ink file:text-sm"
            />
            {c.logoDataUrl ? (
              <Button variant="ghost" onClick={() => update((s) => (s.company.logoDataUrl = null))}>
                Logo entfernen
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">PNG, JPEG oder SVG, maximal 300 KB. Bilder werden vor dem Speichern verkleinert.</p>
        </div>
        {colorField("Primärfarbe", c.primaryColor, (v) => update((s) => (s.company.primaryColor = v)))}
        {colorField("Sekundärfarbe", c.secondaryColor, (v) => update((s) => (s.company.secondaryColor = v)))}
      </div>

      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-medium text-ink">Firmensitz (Ausgangspunkt für Entfernungen)</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <TextField
              label="Adresse"
              value={settings.hq.address}
              onChange={(v) =>
                update((s) => {
                  // Koordinaten gelten nur für den Adresstext, zu dem sie ermittelt wurden.
                  if (v !== s.hq.address) {
                    s.hq.lat = null;
                    s.hq.lng = null;
                  }
                  s.hq.address = v;
                })
              }
              placeholder="Straße Hausnummer, PLZ Ort"
            />
          </div>
          <Button onClick={() => void geocode()} disabled={geocoding || settings.hq.address.trim().length < 3}>
            {geocoding ? "Wird ermittelt …" : "Koordinaten ermitteln"}
          </Button>
        </div>
        <p className="text-sm text-muted">
          {settings.hq.lat != null && settings.hq.lng != null
            ? `Koordinaten: ${settings.hq.lat.toFixed(5)}, ${settings.hq.lng.toFixed(5)}`
            : "Noch keine Koordinaten ermittelt. Ohne Koordinaten kann keine Entfernung zu Objekten berechnet werden."}
        </p>
        {geoMessage ? <Notice kind={geoMessage.kind}>{geoMessage.text}</Notice> : null}
      </div>
    </Card>
  );
}
