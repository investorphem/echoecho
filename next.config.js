/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedHosts: true,
  async headers() {
    return [
      {
        source: "/.well-known/farcaster.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
