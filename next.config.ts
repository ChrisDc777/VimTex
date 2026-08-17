import type { NextConfig } from "next";
import os from "node:os";

function localLanHosts(): string[] {
  const hosts = new Set<string>(["127.0.0.1", "localhost"]);
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        hosts.add(net.address);
      }
    }
  }
  const extra = process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  for (const host of extra ?? []) hosts.add(host);
  return [...hosts];
}

const nextConfig: NextConfig = {
  // Custom server binds 0.0.0.0; browsers use 127.0.0.1/LAN IPs for HMR websockets.
  allowedDevOrigins: localLanHosts(),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const origin = process.env.ROOM_SERVICE_ORIGIN?.replace(/\/$/, "");
    if (!origin) return [];
    return {
      beforeFiles: [
        {
          source: "/api/rooms/:path*",
          destination: `${origin}/api/rooms/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
