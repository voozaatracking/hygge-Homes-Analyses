import { describe, expect, it } from "vitest";
import { planValidUntil } from "@/lib/registration";
import { REGISTRATION } from "@/lib/config/registration";

describe("Startplan der Registrierung", () => {
  it("berechnet das Ablaufdatum aus Tagen ab jetzt", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    expect(planValidUntil(180, now)).toBe("2027-05-03T10:00:00.000Z");
    expect(planValidUntil(1, now)).toBe("2026-11-05T10:00:00.000Z");
  });

  it("liefert null ohne Tage", () => {
    expect(planValidUntil(null)).toBeNull();
  });

  it("hat einen gültigen Startplan als Konstante", () => {
    expect(["pro", "internal", "none"]).toContain(REGISTRATION.defaultPlan);
    expect(
      REGISTRATION.defaultValidDays === null || REGISTRATION.defaultValidDays > 0
    ).toBe(true);
  });
});
