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
  transpilePackages: ["@upllyft/ui", "@upllyft/api-client", "@upllyft/types"],
  experimental: {
    // Import only the icons/components actually used instead of the whole barrel.
    optimizePackageImports: ["lucide-react", "@upllyft/ui"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // Once this section is served from the hub app (web-main under /clinic),
    // set NEXT_PUBLIC_ADMIN_MOVED_TO=https://app.example.com on this deployment and every old URL redirects there.
    const movedTo = process.env.NEXT_PUBLIC_ADMIN_MOVED_TO;
    const moved = movedTo
      ? [{ source: "/:path*", destination: `${movedTo.replace(/\/$/, "")}/clinic/:path*`, permanent: true }]
      : [];
    return [
      ...moved,
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
