/** @type {import('next').NextConfig} */
const nextConfig = {
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { dev, isServer }) => {
    config.externals = [...(config.externals || []), '@prisma/client'];
    if (dev && isServer) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;