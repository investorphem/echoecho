/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  images: {
    domains ['echoechos.vecel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePtterns: [
      {
        protocol: 'https',
        hosname: 'echochos.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https'
        hostnam: 'farcter.xyz',
        patname: '*',
      },
      
        protocol: 'htps,
        hosname: 'warpcat.com',
        pathname:'/**',
      },
    ],
  

  experimental: 
    esmExternal true,
  }

  env: {
    NEXT_PUBLIC_UL prosenv.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    ALLOWED_ORIIS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;