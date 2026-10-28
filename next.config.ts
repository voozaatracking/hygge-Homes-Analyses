import type { NextConfig } from "next";
import { buildSecurityHeaders, detectEnv } from "./lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
          env: detectEnv(process.env.VERCEL_ENV, process.env.NODE_ENV),
        }),
      },
    ];
  },
};

export default nextConfig;
