import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/keepalive/route";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("Keep-alive-Route", () => {
  it("lehnt Aufrufe ohne gültigen Authorization-Header mit 401 ab", async () => {
    process.env.CRON_SECRET = "geheim";

    const missing = await GET(new Request("http://localhost/api/cron/keepalive"));
    expect(missing.status).toBe(401);

    const wrong = await GET(
      new Request("http://localhost/api/cron/keepalive", {
        headers: { authorization: "Bearer falsch" },
      })
    );
    expect(wrong.status).toBe(401);
  });

  it("lehnt alle Aufrufe ab, wenn kein CRON_SECRET konfiguriert ist", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(
      new Request("http://localhost/api/cron/keepalive", {
        headers: { authorization: "Bearer irgendwas" },
      })
    );
    expect(response.status).toBe(401);
  });
});
