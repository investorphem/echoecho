// src/wagmi.js
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';

// DO NOT import farcasterMiniApp here — it crashes iframe
let config = null;

export const getWagmiConfig = () => {
  if (config) return config;

  // Only now, inside a function, import the connector safely
  let connectors = [];

  // Safe dynamic import — only runs when called inside iframe
  if (typeof window !== 'undefined') {
    import('@farcaster/miniapp-wagmi-connector').then((module) => {
      connectors = [module.farcasterMiniApp()];
    });
  }

  config = createConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    connectors, // will be empty on SSR, filled on client
    ssr: true,
  });

  return config;
};

// Export null on server, real config on client
export const wagmiConfig = typeof window !== 'undefined' ? getWagmiConfig() : null;