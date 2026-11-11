/**
 * Schalter für die Browser-Warnung "Seite verlassen?" (beforeunload).
 * Die Warnung schützt vor Datenverlust bei ungespeicherten Änderungen. Bei
 * einer gewollten Weiterleitung, deren Stand bereits im Browser gesichert
 * ist (Ablauf der Sitzung), wird sie unterdrückt, damit die Anmeldeseite
 * ohne Rückfrage erscheint.
 */
let suppressed = false;

export function suppressUnloadGuard(): void {
  suppressed = true;
}

export function isUnloadGuardSuppressed(): boolean {
  return suppressed;
}
