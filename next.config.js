/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add allowed image domains if needed (e.g., ['api.farcaster.xyz'])
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: process.env.FARCASTER_MANIFEST_URL || 'https://api.farcaster.xyz/miniapps/hosted-manifest/0199409c-b991-9a61-b1d8-fef2086f7533',
        permanent: false,
      },
    ];
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
