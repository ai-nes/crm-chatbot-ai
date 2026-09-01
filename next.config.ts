import type { NextConfig } from "next";

function getEmbedFrameAncestors() {
  const configuredOrigins = (process.env.NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .map((origin) => {
      if (origin === "*") return origin;

      try {
        const url = new URL(origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return null;
        }
        return url.origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));

  if (configuredOrigins.includes("*")) return "*";
  if (configuredOrigins.length === 0) return "*";

  return ["'self'", ...configuredOrigins].join(" ");
}

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the production
  // Docker image ships only the traced runtime deps instead of node_modules.
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${getEmbedFrameAncestors()}`,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
