/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: tru,
  output: 'standalone',

  images: {
    domains: ['ehoechos.vercel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostame: 'echoechos.vercel.app',
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
    NEXT_PlUBLCl_UR: process.env.NEXT_PUBLIC_URL || 'https://echochos.rceapp',
    ALLOWE_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://wapcast.com,https://farcaster.xyz',
  },

  webpack: config) => {
    config.rsolve.alias['@react-native-async-storage/async-storage'] = false;
    return onfig;
  },
};

module.exports = nextConfig;
