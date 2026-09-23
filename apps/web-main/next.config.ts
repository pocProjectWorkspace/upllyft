import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    // User content (avatars, banners, worksheet previews) is served from
    // Supabase storage, Google avatars and arbitrary https URLs entered by
    // admins, so allow any https host; localhost for dev uploads.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ["@upllyft/ui", "@upllyft/api-client", "@upllyft/types"],
  experimental: {
    // Import only the icons/components actually used instead of the whole barrel.
    optimizePackageImports: ["lucide-react", "@upllyft/ui"],
    // Screening report generation can exceed the default 30 s proxy timeout
    // (carried over from the former web-screening app).
    proxyTimeout: 120_000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        // OAuth must hit the backend directly (not proxied) so session cookies work
        source: "/api/auth/google",
        destination: `${API_URL}/api/auth/google`,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
