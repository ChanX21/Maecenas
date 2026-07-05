import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime === "edge") {
      config.resolve.alias = {
        ...config.resolve.alias,
        crypto: "node:crypto",
      };
    }
    return config;
  },
};

export default nextConfig;
