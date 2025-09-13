/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/0199409c-b991-9a61-b1d8-fef2086f7533',
        permanent: false, // false → 307
      },
    ];
  },
};

module.exports = nextConfig;
