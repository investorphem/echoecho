/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add allowed image domains if needed
  },
  experimental: {
    esmExternals: 'loose', // Handle ESM packages like wagmi
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
            value: '*', // Restrict to 'https://warpcast.com' for tighter security if needed
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
