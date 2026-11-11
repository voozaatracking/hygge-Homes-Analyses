/** Struktur der Rechtstexte: Überschriften, Absätze, Listen, Trennlinie. */
export type LegalBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: { text: string; sub: string[] }[] };
