/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add allowed image domains if needed
  },
  experimental: {
    esmExternals: true, // Enable full ESM support for wagmi and other packages
  },
  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  },
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://warpcast.com', // Restrict to Warpcast for security
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
