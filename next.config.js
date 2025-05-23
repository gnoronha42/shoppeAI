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
    if (isServer) {
      config.externals.push({
        'puppeteer-core': 'puppeteer-core',
        '@vercel/browserless': '@vercel/browserless',
      });
    }
    return config;
  },
};

module.exports = nextConfig;