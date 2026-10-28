import { describe, expect, it, vi } from "vitest";
import {
  createNominatimProvider,
  NOMINATIM_MIN_INTERVAL_MS,
  normalizeAddressInput,
} from "@/lib/geo/geocode";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Nominatim-Provider", () => {
  it("liefert Koordinaten und normalisierte Adresse, mit User-Agent und Limit 1", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([{ lat: "53.2464", lon: "10.4115", display_name: "Lüneburg, Niedersachsen" }])
    );
    const provider = createNominatimProvider({ userAgent: "test/1.0", fetchImpl });
    const outcome = await provider.geocode("Am Sande 1, Lüneburg");
    expect(outcome).toEqual({
      ok: true,
      result: { lat: 53.2464, lng: 10.4115, displayName: "Lüneburg, Niedersachsen" },
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("nominatim.openstreetmap.org/search");
    expect(url).toContain("limit=1");
    expect(url).toContain("q=Am+Sande+1%2C+L%C3%BCneburg");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("test/1.0");
  });

  it("meldet leere Treffer, HTTP-Fehler, Ratenbegrenzung und Netzfehler verständlich", async () => {
    const empty = createNominatimProvider({ userAgent: "t", fetchImpl: async () => jsonResponse([]) });
    expect(await empty.geocode("Nirgendwo")).toMatchObject({ ok: false, error: expect.stringMatching(/keine Koordinaten/) });

    const limited = createNominatimProvider({ userAgent: "t", fetchImpl: async () => jsonResponse({}, 429) });
    expect(await limited.geocode("x y z")).toMatchObject({ ok: false, error: expect.stringMatching(/Zu viele/) });

    const broken = createNominatimProvider({ userAgent: "t", fetchImpl: async () => jsonResponse({}, 500) });
    expect(await broken.geocode("x y z")).toMatchObject({ ok: false, error: expect.stringMatching(/500/) });

    const offline = createNominatimProvider({
      userAgent: "t",
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });
    expect(await offline.geocode("x y z")).toMatchObject({ ok: false, error: expect.stringMatching(/nicht erreichbar/) });
  });

  it("hält mindestens eine Sekunde Abstand zwischen zwei Anfragen", async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const fetchImpl = vi.fn(async () => jsonResponse([{ lat: "1", lon: "2", display_name: "a" }]));
    const provider = createNominatimProvider({
      userAgent: "t",
      fetchImpl,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    });
    await provider.geocode("erste");
    clock += 200;
    await provider.geocode("zweite");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([NOMINATIM_MIN_INTERVAL_MS - 200]);
  });
});

describe("Adresseingabe", () => {
  it("bereinigt Whitespace und lehnt zu kurze oder falsche Eingaben ab", () => {
    expect(normalizeAddressInput("  Am   Sande 1 \n Lüneburg ")).toBe("Am Sande 1 Lüneburg");
    expect(normalizeAddressInput("ab")).toBeNull();
    expect(normalizeAddressInput(42)).toBeNull();
    expect(normalizeAddressInput("x".repeat(301))).toBeNull();
  });
});
