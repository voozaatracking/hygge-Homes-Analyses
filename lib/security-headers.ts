/**
 * Security-Header für alle Antworten (next.config.ts). Rein und testbar.
 *
 * Content-Security-Policy: Next.js benötigt Inline-Skripte und -Styles;
 * Supabase (Auth-Endpunkte aus dem Browser) und Nominatim sind als Ziele
 * erlaubt. Vercel-Preview lädt zusätzlich die Toolbar von vercel.live, in
 * der Entwicklung braucht React Refresh 'unsafe-eval'. HSTS nur in Produktion.
 */
export interface HeaderOptions {
  /** NEXT_PUBLIC_SUPABASE_URL, falls gesetzt; sonst *.supabase.co. */
  supabaseUrl?: string | null;
  /** VERCEL_ENV: "production" | "preview" | "development" oder NODE_ENV. */
  env: "production" | "preview" | "development";
}

export interface HeaderEntry {
  key: string;
  value: string;
}

function supabaseOrigins(url: string | null | undefined): string[] {
  if (!url) return ["https://*.supabase.co", "wss://*.supabase.co"];
  try {
    const host = new URL(url).host;
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
}

export function buildContentSecurityPolicy(options: HeaderOptions): string {
  const supabase = supabaseOrigins(options.supabaseUrl);
  const preview = options.env === "preview";
  const dev = options.env === "development";

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (dev) scriptSrc.push("'unsafe-eval'");
  if (preview) scriptSrc.push("https://vercel.live");

  const connectSrc = ["'self'", ...supabase, "https://nominatim.openstreetmap.org"];
  if (preview) connectSrc.push("https://vercel.live", "wss://*.pusher.com", "https://*.pusher.com");
  if (dev) connectSrc.push("ws://localhost:*", "http://localhost:*");

  const frameSrc = preview ? ["https://vercel.live"] : ["'none'"];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    // Logos liegen als Data-URL im Profil; Blob für die clientseitige Verkleinerung.
    `img-src ${["'self'", "data:", "blob:", ...(preview ? ["https://vercel.live", "https://vercel.com"] : [])].join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (!dev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function buildSecurityHeaders(options: HeaderOptions): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
  if (options.env === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}

/** Umgebung aus Vercel- und Node-Variablen ableiten. */
export function detectEnv(
  vercelEnv: string | undefined,
  nodeEnv: string | undefined
): HeaderOptions["env"] {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return nodeEnv === "production" ? "production" : "development";
}
