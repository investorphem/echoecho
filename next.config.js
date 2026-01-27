/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains: ['echoechos.vecel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'echoechos.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'farcater.xyz',
        pathname: '*',
      },
      
        protocol: 'https',
        hostname: 'warpcat.com',
        pathname:'/**',
      },
    ],
  }

  experimental: {
    esmExternal: true,
  },

  env: {
    NEXT_PUBLIC_URL: pros.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;