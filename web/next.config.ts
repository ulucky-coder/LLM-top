import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external dev connections - specify all possible origins
  allowedDevOrigins: [
    "80.209.241.23",
    "80.209.241.23:3000",
    "80.209.241.23:3001",
    "82.26.93.78",
    "82.26.93.78:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],

  // Ensure proper compilation
  reactStrictMode: true,
};

export default nextConfig;
