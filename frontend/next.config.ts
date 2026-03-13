import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "https://api.found-places.com/admin/",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "https://api.found-places.com/admin/:path*/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
