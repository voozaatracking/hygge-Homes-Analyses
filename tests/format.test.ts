import { describe, expect, it } from "vitest";
import { fmtPctLabel } from "@/lib/format";

describe("Prozentbeschriftung (fmtPctLabel)", () => {
  it("zeigt ganze Zahlen ohne und Dezimalwerte mit einer Nachkommastelle", () => {
    expect(fmtPctLabel(5)).toBe("5 %");
    expect(fmtPctLabel(15)).toBe("15 %");
    expect(fmtPctLabel(2.5)).toBe("2,5 %");
    expect(fmtPctLabel(2.75)).toBe("2,8 %");
  });

  it("liefert einen Platzhalter für fehlende Werte", () => {
    expect(fmtPctLabel(null)).toBe("–");
    expect(fmtPctLabel(Number.NaN)).toBe("–");
  });
});
