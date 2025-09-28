/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains: ['assets.echoechos.xyz'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.echoechos.xyz',
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
    // REMOVED BASE_RPC_URL - USE SERVER-SIDE ONLY
    ALLOWED_ORIGINS:
      process.env.ALLOWED_ORIGINS ||
      'https://warpcast.com,https://farcaster.xyz',
  },

  // ❌ Removed headers() override for farcaster.json
  // Static files in /public are served directly with correct headers

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;