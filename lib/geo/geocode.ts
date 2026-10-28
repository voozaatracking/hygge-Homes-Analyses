/**
 * Geokodierung hinter einer austauschbaren Schnittstelle. Läuft nur
 * serverseitig (Route /api/geocode). Erster Anbieter: Nominatim
 * (OpenStreetMap) mit korrektem User-Agent und höchstens einer Anfrage pro
 * Sekunde je Serverinstanz. Keine neue Abhängigkeit, nur fetch.
 *
 * Bei wachsendem Volumen wird auf einen Anbieter mit Schlüssel gewechselt;
 * dazu genügt ein weiterer GeocodeProvider.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Normalisierte Adresse des Anbieters. */
  displayName: string;
}

export type GeocodeOutcome =
  | { ok: true; result: GeocodeResult }
  | { ok: false; error: string };

export interface GeocodeProvider {
  name: string;
  geocode(address: string): Promise<GeocodeOutcome>;
}

/** Nutzungsbedingungen von Nominatim: maximal eine Anfrage pro Sekunde. */
export const NOMINATIM_MIN_INTERVAL_MS = 1000;
export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface NominatimOptions {
  /** Pflicht laut Nominatim: Anwendung und Kontaktmöglichkeit. */
  userAgent: string;
  fetchImpl?: FetchLike;
  /** Zeitquelle und Wartefunktion, für Tests austauschbar. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createNominatimProvider(options: NominatimOptions): GeocodeProvider {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const now = options.now ?? (() => Date.now());
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  // Anfragen je Instanz serialisieren und den Mindestabstand einhalten.
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt: number | null = null;

  const request = async (address: string): Promise<GeocodeOutcome> => {
    if (lastRequestAt != null) {
      const wait = lastRequestAt + NOMINATIM_MIN_INTERVAL_MS - now();
      if (wait > 0) await sleep(wait);
    }
    lastRequestAt = now();

    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");

    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        headers: {
          "User-Agent": options.userAgent,
          "Accept-Language": "de",
          Accept: "application/json",
        },
      });
    } catch {
      return { ok: false, error: "Der Geokodierungsdienst ist nicht erreichbar." };
    }
    if (response.status === 429) {
      return { ok: false, error: "Zu viele Anfragen an den Geokodierungsdienst. Bitte kurz warten." };
    }
    if (!response.ok) {
      return { ok: false, error: `Der Geokodierungsdienst antwortete mit Status ${response.status}.` };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: "Die Antwort des Geokodierungsdienstes war nicht lesbar." };
    }
    if (!Array.isArray(body) || body.length === 0) {
      return { ok: false, error: "Zu dieser Adresse wurden keine Koordinaten gefunden. Bitte Schreibweise prüfen oder Ort ergänzen." };
    }
    const hit = body[0] as { lat?: unknown; lon?: unknown; display_name?: unknown };
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "Die Antwort des Geokodierungsdienstes enthielt keine gültigen Koordinaten." };
    }
    return {
      ok: true,
      result: {
        lat,
        lng,
        displayName: typeof hit.display_name === "string" ? hit.display_name : address,
      },
    };
  };

  return {
    name: "nominatim",
    geocode(address: string) {
      const run = queue.then(() => request(address));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

/** Eingabe bereinigen: Whitespace zusammenfassen, Länge begrenzen. */
export function normalizeAddressInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < 3 || text.length > 300) return null;
  return text;
}

let defaultProvider: GeocodeProvider | null = null;

/** Anbieter der Anwendung (eine Instanz je Server, wegen der Ratenbegrenzung). */
export function getGeocodeProvider(userAgent: string): GeocodeProvider {
  if (!defaultProvider) {
    defaultProvider = createNominatimProvider({ userAgent });
  }
  return defaultProvider;
}
