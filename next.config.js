/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { dev, isServer }) => {
    // Adiciona suporte para o Prisma
    config.externals = [...(config.externals || []), '@prisma/client'];

    if (dev && isServer) {
      config.cache = false;
    }

    // Configuração específica para o Puppeteer
    if (isServer) {
      config.externals.push({
        'puppeteer': 'puppeteer',
        'puppeteer-core': 'puppeteer-core',
        '@vercel/browserless': '@vercel/browserless',
      });
    }

    // Adiciona suporte para binários do Chrome
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
  // ++ Adicionado para normalizar URLs de middleware e proxy reverso (ngrok)
  skipMiddlewareUrlNormalize: true, 
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;