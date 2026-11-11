/**
 * Absolute Höchstdauer einer Sitzung ab Anmeldung in Stunden. Kein
 * Inaktivitäts-Timer: Nach Ablauf wird serverseitig abgemeldet, unabhängig
 * davon, ob gerade gearbeitet wird. Prüfung in proxy.ts und lib/access.ts,
 * weil die Sitzungsgrenzen des Supabase-Dashboards im Free-Plan fehlen.
 */
export const SESSION_MAX_HOURS = 0.05; // TEMP: 3 Minuten für Preview-Test, vor Merge auf 12 zurücksetzen
export const SESSION_MAX_MS = SESSION_MAX_HOURS * 60 * 60 * 1000;
