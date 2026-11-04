/**
 * Reine Helfer der Selbstregistrierung, ohne IO.
 */

/** Ablaufdatum des Startplans: jetzt plus Tage; null, wenn keine Tage gesetzt sind. */
export function planValidUntil(
  days: number | null,
  now: Date = new Date()
): string | null {
  if (days == null) return null;
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return until.toISOString();
}

/** Passwortregel, identisch zu /auth/set-password. */
export const MIN_PASSWORD_LENGTH = 8;
