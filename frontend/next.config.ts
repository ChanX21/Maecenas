import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, crypto: false };
    return config;
  }
};

export default nextConfig;
