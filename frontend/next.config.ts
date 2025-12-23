import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: process.env.npm_package_version || "0.1.0",
  },
};

export default nextConfig;
