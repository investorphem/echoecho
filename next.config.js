/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add allowed image domains if needed
  },
  async headers() {
    return [
      {
        source: "/.well-known/farcaster.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Or specify a domain for security
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;