import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
      },
      {
        protocol: "https",
        hostname: "static.openfoodfacts.org",
      },
    ],
  },
};

export default nextConfig;
