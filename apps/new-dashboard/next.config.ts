import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["awmt-sdk"],
  experimental: {
    esmExternals: true,
  },
  // Add proxy to GraphQL server to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: 'http://localhost:3000/graphql',
      },
    ];
  },
};

export default nextConfig;
