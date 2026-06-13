import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: "http://backend:8000/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
