import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  transpilePackages: ["@upllyft/ui", "@upllyft/api-client", "@upllyft/types"],
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
