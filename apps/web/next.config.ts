import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['0.0.0.0', '10.5.1.63'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
