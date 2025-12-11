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
        'puppeteer': 'puppeteer',
        'puppeteer-core': 'puppeteer-core',
        '@vercel/browserless': '@vercel/browserless',
      });
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
  },
  skipMiddlewareUrlNormalize: true, 
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;