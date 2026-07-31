import type { NextConfig } from "next";

const serverActionBodySizeLimit = (process.env.VERCEL === "1"
  ? "4mb"
  : process.env.NEXT_SERVER_ACTION_BODY_SIZE_LIMIT || "90mb") as `${number}mb`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Vercel rejects function payloads above 4.5 MB before Next.js executes.
      bodySizeLimit: serverActionBodySizeLimit,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
        pathname: "/linkedin/**",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
        pathname: "/dms/image/**",
      },
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
        pathname: "/images/products/**",
      },
      {
        protocol: "https",
        hostname: "static.openfoodfacts.org",
        pathname: "/images/products/**",
      },
    ],
  },
};

export default nextConfig;
