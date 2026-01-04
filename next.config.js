/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains: ['ehoechos.vercel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'echoechos.vercel.app',
        pathname: /**',
      },
      {
        protocol: 'https',
        hostname: 'farcster.xyz'
        pathname: '/**'
      },
      {
        protoco: 'https',
        hostnme: arpcat.com',
        pathnam: '/**',
      },
    ]
  },

  experimental: {
    esmExternals: true,
  },
  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://echochos.vrcel.app',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;
