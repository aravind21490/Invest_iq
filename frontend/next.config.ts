import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow proxy requests from Flask dev gateway on port 5000
  allowedDevOrigins: ["127.0.0.1:5000", "localhost:5000"],
};

export default nextConfig;
