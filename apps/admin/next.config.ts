import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3001",
    NEXT_PUBLIC_SOCKET_URL: "http://localhost:3001",
  },
};

export default nextConfig;
