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
      }
    ],
  },
  
  experimental: {
    esmExternals: true,
  },
  
  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    // REMOVED BASE_RPC_URL - USE SERVER-SIDE ONLY
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
            value: process.env.NODE_ENV === 'development'
              ? '*'
              : process.env.ALLOWED_ORIGINS || 'https://warpcast.com,https://farcaster.xyz'
          },
          // Add CSP header for production
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Content-Security-Policy',
            value: "default-src 'self'; frame-src 'self' https://warpcast.com;"
          }] : [])
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
