import { DETOUR_FACTOR } from "@/lib/config/assumptions";

/**
 * Entfernungen aus Koordinaten, rein und ohne IO.
 * Luftlinie nach Haversine, Fahrstrecke als Schätzung Luftlinie × Umwegfaktor.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Mittlerer Erdradius in Kilometern. */
const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Luftlinie in Kilometern (Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Geschätzte Fahrstrecke: Luftlinie × DETOUR_FACTOR (keine manuelle Überschreibung). */
export function estimatedRouteKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * DETOUR_FACTOR;
}

/** Prüft, ob ein Koordinatenpaar vollständig und plausibel ist. */
export function isLatLng(
  value: { lat: number | null | undefined; lng: number | null | undefined } | null | undefined
): value is LatLng {
  return (
    value != null &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180
  );
}
