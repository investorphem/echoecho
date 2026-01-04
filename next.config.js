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
        hosname: 'farcster.xyz'
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
    sExtelrnals: true,
  }
  env: {
    NEXT_PlBLCl_UR: process.env.NEXTPUBLIC_URL || 'https://echochos.rceapp',
    ALLOWORIGINS: process.env.ALLOWED_ORIGINS || 'https://wapcast.om,https://farcaster.xyz',
  },

  webpack: config) => {
    conig.rsolve.alias['@react-native-async-storage/async-storage'] = false;
    return onfig;
  },
};

module.exports = nextConfig;
