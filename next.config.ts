import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import type { NextConfig } from "next";

const jiti = createJiti(fileURLToPath(import.meta.url));

jiti.import("./env/server.ts");
jiti.import("./env/client.ts");

const nextConfig: NextConfig = {
  compiler: {
    // if NODE_ENV is production, remove console.log
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
  experimental: {
    // Enable Turbopack filesystem caching for faster builds (Next.js 16 beta)
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: [
      "@phosphor-icons/react",
      "lucide-react",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "date-fns",
      "recharts",
      "@radix-ui/react-icons",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
      "framer-motion",
    ],
    serverActions: {
      bodySizeLimit: "20mb",
    },
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: ["@aws-sdk/client-s3", "@aws-sdk/lib-storage"],
  transpilePackages: [
    "geist",
    "shiki",
    "resumable-stream",
    "@t3-oss/env-nextjs",
    "@t3-oss/env-core",
  ],
  // Optimize production builds
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/ph",
        destination: "https://www.producthunt.com/posts/scira",
        permanent: true,
      },
      {
        source: "/plst",
        destination: "https://peerlist.io/zaidmukaddam/project/scira-ai-30",
        permanent: true,
      },
      {
        source: "/blog",
        destination: "https://draftpen.com/blog",
        permanent: true,
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      // Google Favicon Service - comprehensive patterns
      {
        protocol: "https",
        hostname: "www.google.com",
        port: "",
        pathname: "/s2/favicons/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        port: "",
        pathname: "/s2/favicons",
      },
      {
        protocol: "https",
        hostname: "api.producthunt.com",
        port: "",
        pathname: "/widgets/embed-image/v1/featured.svg",
      },
      {
        protocol: "https",
        hostname: "metwm7frkvew6tn1.public.blob.vercel-storage.com",
        port: "",
        pathname: "**",
      },
      // upload.wikimedia.org
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "**",
      },
      // media.theresanaiforthat.com
      {
        protocol: "https",
        hostname: "media.theresanaiforthat.com",
        port: "",
        pathname: "**",
      },
      // www.uneed.best
      {
        protocol: "https",
        hostname: "www.uneed.best",
        port: "",
        pathname: "**",
      },
    ],
    // Add additional settings for better image loading
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp"],
    // Next.js 16 default is 14400s (4 hours) - align with new defaults
    minimumCacheTTL: 14_400,
    unoptimized: false,
  },
};

export default nextConfig;
