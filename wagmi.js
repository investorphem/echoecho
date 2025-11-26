// src/wagmi.js
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';

let configInstance = null;

export const getWagmiConfig = async () => {
  if (configInstance) return configInstance;

  // This is the ONLY way that works in 2025
  const { farcasterMiniApp } = await import('@farcaster/miniapp-wagmi-connector');

  configInstance = createConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    connectors: [farcasterMiniApp()],
    ssr: true,
  });

  return configInstance;
};

// Export null on server — safe
export const wagmiConfig = typeof window === 'undefined' ? null : null;