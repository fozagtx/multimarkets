import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (mm/) — avoid picking a parent lockfile outside this repo */
const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nextuipro.nyc3.cdn.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "d2u8k2ocievbld.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

export default nextConfig;
