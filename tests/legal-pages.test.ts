import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { AGB_BLOCKS } from "@/lib/legal/agb";
import { DATENSCHUTZ_BLOCKS } from "@/lib/legal/datenschutz";
import { IMPRESSUM_BLOCKS } from "@/lib/legal/impressum";

const render = (blocks: typeof AGB_BLOCKS, anchorAfterRule?: string) =>
  renderToStaticMarkup(createElement(LegalDocument, { blocks, anchorAfterRule }));

describe("Rechtsseiten", () => {
  it("rendern Stand-Datum, Anbieter und Link zur Anmeldung", () => {
    for (const blocks of [IMPRESSUM_BLOCKS, DATENSCHUTZ_BLOCKS, AGB_BLOCKS]) {
      const html = render(blocks);
      expect(html).toContain("Stand: November 2026");
      expect(html).toContain("Westerwiede &amp; Westerwiede GbR");
      expect(html).toContain('href="/login"');
    }
  });

  it("AGB enthalten die Widerrufsbelehrung als eigenen Abschnitt unter #widerruf", () => {
    const html = render(AGB_BLOCKS, "widerruf");
    expect(html).toContain('id="widerruf"');
    expect(html).toContain("Widerrufsbelehrung für Verbraucher");
    expect(html).toContain("Muster-Widerrufsformular");
    expect(html).toContain("§ 17 Schlussbestimmungen");
    // Verschachtelte Liste aus § 9 Abs. 2 bleibt erhalten.
    expect(html).toContain("automatisierte Abfragen, das Umgehen von Schutzmaßnahmen");
  });

  it("zeichnet Fettdruck, Web-Adressen und Prüfhinweise aus, ohne den Wortlaut zu ändern", () => {
    const html = render(DATENSCHUTZ_BLOCKS);
    expect(html).toContain("<strong>Widerspruchsrecht (Art. 21 DSGVO):</strong>");
    expect(html).toContain('href="https://stripe.com/de/privacy"');
    expect(html).toContain("<mark");
    expect(html).toContain("[PRÜFEN: Anschrift]");
    expect(html).toContain("Entwurf: Dieser Text enthält noch Prüfhinweise");
    expect(html).not.toContain("**");
  });
});
