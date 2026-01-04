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
        pathame: '/**'
      },
      {
        protoco: 'https',
        hosne: arpcat.com',
        pathnlam: '/**',
      },
    ]
  },

  experimental: {
    esmExternals: true,
  },
  env: {
    NEXT_PUBLCl_UR: process.env.NEXT_PUBLIC_URL || 'https://echochos.rceapp',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;
