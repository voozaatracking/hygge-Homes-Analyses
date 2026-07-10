import type { EnergyClass, ValueSource } from "@/lib/types/analysis";
import {
  ENERGY_CLASS_THRESHOLDS,
  ENERGY_CLASS_H_REPRESENTATIVE,
} from "@/lib/config/normalization-tables";

/**
 * Leitet aus dem Energieverbrauch (kWh/qm p.a.) die Energieeffizienzklasse ab.
 * Es gilt die Schwelle, deren Untergrenze zuletzt erreicht wurde.
 * Werte zwischen 0 und der ersten Schwelle (0,001) werden der besten Klasse
 * zugeordnet (dokumentierte Annahme).
 */
export function energyClassFromConsumption(
  consumption: number | null | undefined
): EnergyClass | null {
  if (consumption == null || Number.isNaN(consumption) || consumption < 0) {
    return null;
  }
  let hit: EnergyClass | null = null;
  for (const entry of ENERGY_CLASS_THRESHOLDS) {
    if (consumption >= entry.min) hit = entry.cls;
    else break;
  }
  return hit ?? ENERGY_CLASS_THRESHOLDS[0].cls;
}

export interface DerivedConsumption {
  /** Repräsentativer Verbrauchswert (Schätzwert). */
  value: number;
  /** Untergrenze des Klassenbereichs. */
  rangeMin: number;
  /** Obergrenze des Klassenbereichs, null bei Klasse H (offen nach oben). */
  rangeMax: number | null;
  isEstimate: true;
}

/**
 * Leitet aus der Energieeffizienzklasse einen repräsentativen Verbrauchswert ab.
 * Regel: Mittelwert aus der unteren und der nächsten Schwelle.
 * Klassen mit doppelten Tabelleneinträgen (C, D) werden als zusammenhängender
 * Bereich behandelt; das Ergebnis bleibt ein gekennzeichneter Schätzwert mit Bereich.
 * Klasse H hat keine obere Schwelle: repräsentativer Mindestwert laut Konfiguration.
 */
export function consumptionFromClass(
  cls: EnergyClass | null | undefined
): DerivedConsumption | null {
  if (!cls) return null;
  const indices = ENERGY_CLASS_THRESHOLDS.map((entry, i) =>
    entry.cls === cls ? i : -1
  ).filter((i) => i >= 0);
  if (indices.length === 0) return null;

  const lower = ENERGY_CLASS_THRESHOLDS[indices[0]].min;
  const lastIndex = indices[indices.length - 1];
  const next =
    lastIndex + 1 < ENERGY_CLASS_THRESHOLDS.length
      ? ENERGY_CLASS_THRESHOLDS[lastIndex + 1].min
      : null;

  if (next == null) {
    return {
      value: ENERGY_CLASS_H_REPRESENTATIVE,
      rangeMin: lower,
      rangeMax: null,
      isEstimate: true,
    };
  }
  return {
    value: (lower + next) / 2,
    rangeMin: lower,
    rangeMax: next,
    isEstimate: true,
  };
}

export interface EffectiveEnergy {
  /** Effektiver Verbrauch für alle weiteren Berechnungen. */
  consumption: number | null;
  consumptionSource: ValueSource;
  /** Nur gesetzt, wenn der Verbrauch aus der Klasse abgeleitet wurde. */
  derived: DerivedConsumption | null;
  /** Effektive Klasse für die Anzeige. */
  energyClass: EnergyClass | null;
  energyClassSource: ValueSource;
  /** Warnung, wenn manueller Verbrauch und manuelle Klasse nicht zusammenpassen. */
  conflict: string | null;
}

/**
 * Kombiniert die beiden Eingabeoptionen (Verbrauch oder Klasse) zu effektiven Werten.
 * Bei Widerspruch wird nichts stillschweigend überschrieben, sondern gewarnt.
 */
export function effectiveEnergy(input: {
  consumption: number | null;
  energyClass: EnergyClass | null;
}): EffectiveEnergy {
  const { consumption, energyClass } = input;

  const hasConsumption =
    consumption != null && !Number.isNaN(consumption) && consumption >= 0;
  const hasClass = energyClass != null;

  if (hasConsumption && hasClass) {
    const derivedClass = energyClassFromConsumption(consumption);
    const conflict =
      derivedClass !== energyClass
        ? `Der eingegebene Verbrauch von ${consumption} kWh/qm p.a. entspricht Klasse ${derivedClass}, eingegeben ist jedoch Klasse ${energyClass}. Bitte eine der beiden Angaben prüfen. Für die Berechnung wird der manuell eingegebene Verbrauch verwendet.`
        : null;
    return {
      consumption,
      consumptionSource: "manual",
      derived: null,
      energyClass,
      energyClassSource: "manual",
      conflict,
    };
  }

  if (hasConsumption) {
    return {
      consumption,
      consumptionSource: "manual",
      derived: null,
      energyClass: energyClassFromConsumption(consumption),
      energyClassSource: "derived",
      conflict: null,
    };
  }

  if (hasClass) {
    const derived = consumptionFromClass(energyClass);
    return {
      consumption: derived?.value ?? null,
      consumptionSource: derived ? "derived" : "unavailable",
      derived,
      energyClass,
      energyClassSource: "manual",
      conflict: null,
    };
  }

  return {
    consumption: null,
    consumptionSource: "unavailable",
    derived: null,
    energyClass: null,
    energyClassSource: "unavailable",
    conflict: null,
  };
}
