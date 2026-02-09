import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@upllyft/ui", "@upllyft/api-client", "@upllyft/types"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/api/:path*" },
    ];
  },
};

export default nextConfig;
