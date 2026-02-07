import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@upllyft/ui", "@upllyft/api-client", "@upllyft/types"],
};

export default nextConfig;
