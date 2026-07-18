import type { LocationInput, PropertyInput } from "@/lib/types/analysis";
import {
  emptyListing,
  emptyLocation,
  emptyProperty,
  fillWeeklyPricesRight,
} from "@/lib/utils";

/**
 * Fiktive Beispieldaten zur Demonstration der Anwendung.
 * Die Original-Excel-Dateien lagen beim Neubau nicht vor; sobald echte
 * Beispielobjekte verfügbar sind, können sie hier ergänzt oder per
 * Excel-Import geladen werden.
 */

export function sampleProperties(): PropertyInput[] {
  const a = emptyProperty("Beispiel: Apartment Altstadt (65 qm)");
  a.address = "Lüneburg, Altstadt";
  a.areaSqm = 65;
  a.bedrooms = 3;
  a.beds = 5;
  a.energy = { consumption: 120, energyClass: null };
  a.pricing = { mode: "perUnit", nightPrice: 120, rentedDaysPerMonth: 18 };
  a.costs.coldRent = 700;
  a.costs.internet = 40;
  a.costs.ancillary = 180;
  a.costs.streaming = 15;
  a.costs.gez = 18.36;
  a.costs.gema = 10;
  a.costs.laundry = 60;
  a.marketRentPerSqm = 11;

  const b = emptyProperty("Beispiel: Ferienhaus am Wasser (90 qm)");
  b.address = "Nordniedersachsen";
  b.areaSqm = 90;
  b.bedrooms = 4;
  b.beds = 8;
  b.energy = { consumption: null, energyClass: "C" };
  b.pricing = { mode: "perBed", nightPrice: 32, rentedDaysPerMonth: 15 };
  b.costs.coldRent = 1150;
  b.costs.internet = 45;
  b.costs.ancillary = 240;
  b.costs.streaming = 15;
  b.costs.gez = 18.36;
  b.costs.gema = 10;
  b.costs.laundry = 90;
  b.marketRentPerSqm = 12.5;

  return [a, b];
}

export function sampleLocations(): LocationInput[] {
  const l = emptyLocation("Beispiel: Ostseeküste (Region)");
  l.dataSource = "AirDNA (fiktive Beispieldaten)";
  l.collectedAt = "2025-06-01";
  l.occupancyPct = 62;
  l.avgAnnualRevenue = 32000;
  l.avgRevenuePerNight = 145;
  l.avgCleaningCost = 65;
  l.extraPersonCost = 15;
  l.notes =
    "Fiktive Beispieldaten zur Demonstration. Eigene Werte aus AirDNA oder anderer Quelle eintragen.";

  // Zwei fiktive Inserate mit Wochenpreisen für die KW-Analyse.
  const listingA = emptyListing("Beispiel: Strandnahes Apartment (4 Pers.)");
  listingA.rating = 8.9;
  listingA.persons = 4;
  listingA.cleaningCost = 80;
  listingA.extraCostPerPerson = 12;
  listingA.weeklyPrices[0] = 890;
  listingA.weeklyPrices[21] = 1190; // Sommerpreise ab KW 22
  listingA.weeklyPrices[35] = 890; // ab KW 36 wieder Nebensaison
  listingA.weeklyPrices = fillWeeklyPricesRight(listingA.weeklyPrices);

  const listingB = emptyListing("Beispiel: Ferienhaus mit Garten (6 Pers.)");
  listingB.rating = 9.3;
  listingB.persons = 6;
  listingB.cleaningCost = 110;
  listingB.weeklyPrices[0] = 1250;
  listingB.weeklyPrices[21] = 1650;
  listingB.weeklyPrices[35] = 1250;
  listingB.weeklyPrices = fillWeeklyPricesRight(listingB.weeklyPrices);

  l.listings = [listingA, listingB];
  return [l];
}
