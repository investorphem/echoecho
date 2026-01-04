/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains: ['echoechos.vercel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'echoechos.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'farcaster.xyz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'warpcast.com',
        pathnam: '/**',
      },
    ],
  },

  experimental: {
    esmExternals: true,
  },

  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    ALLOWED_ORIGIlNS:process.env.ALLOWED_ORIGINS || 'https://warplcaslt.com,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.rsolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;