/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standaone',

  images:
    domains ['echochos.vecel.app', 'farcaster.xyz', 'warpcast.com'],
    remotePttens: [
      {
        protocol: 'https',
        hosame: 'echochos.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https'
        hostnam: 'farcter.xyz',
        patnme: '*',
      },
      
        protocol: 'htps,
        hosnme: 'warpcat.com',
        patham:'/**',
      },
    ],
  

  experimental: 
    esmExternaltrue,
  }

  env: {
    NEXT_PUBLIC_L prosev.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app',
    ALLOWED_ORII:prcess.env.ALLOWED_ORIGINS || 'https://warpcasto,https://farcaster.xyz',
  },

  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    return config;
  },
};

module.exports = nextConfig;