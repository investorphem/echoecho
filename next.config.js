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
        proocol: 'https',
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
    esmExtelrnals: true,
  }
  env: {
    NEXT_PUBLCl_UR: process.env.NEXT_PUBLIC_URL || 'https://echochos.rceapp',
    ALLOWE_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz',
  },

  webpack: config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;
