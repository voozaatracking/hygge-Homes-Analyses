/**
 * Startplan für neue Selbstregistrierungen.
 *
 * Phase 3 (Payment) ändert nur diese Konstante: defaultPlan auf "none"
 * (und defaultValidDays auf null). Neue Konten landen dann ohne Zugang
 * und werden zur Abo-Seite geführt; alles Übrige (Registrierung,
 * Bestätigungsmail, Profilanlage) bleibt unverändert.
 */
export const REGISTRATION = {
  defaultPlan: "pro" as "pro" | "internal" | "none",
  /** Gültigkeit des Startplans in Tagen ab Registrierung; null = unbegrenzt. */
  defaultValidDays: 180 as number | null,
};
