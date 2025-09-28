/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  images: {
    domains: ['assets.echoechos.xyz'], 
  },
  
  experimental: {
    esmExternals: true,
  },
  
  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    // Add new environment variable for allowed origins
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz'
  },
  
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { 
            key: 'Content-Type', 
            value: 'application/json' 
          },
          { 
            key: 'Access-Control-Allow-Origin', 
            // Use environment variable with fallback
            value: process.env.ALLOWED_ORIGINS || 
                   (process.env.NODE_ENV === 'development' 
                     ? '*' 
                     : 'https://warpcast.com,https://farcaster.xyz')
          },
        ],
      },
    ];
  },
  
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;
