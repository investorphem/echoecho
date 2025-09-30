const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains: ['echoechos.vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'echoechos.vercel.app',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    esmExternals: true,
  },

  env: {
    NEXT_PUBLIC_URL:
      process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    ALLOWED_ORIGINS:
      process.env.ALLOWED_ORIGINS ||
      'https://warpcast.com,https://farcaster.xyz',
  },

  // Static files in /public are served directly with correct headers
  // No need for headers() override for farcaster.json

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      '@coinbase/onchainkit/minikit': path.resolve(
        __dirname,
        'node_modules/@coinbase/onchainkit/minikit'
      ),
    };
    return config;
  },
};

module.exports = nextConfig;