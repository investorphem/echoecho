import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector';

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  },
  connectors: [
    miniAppConnector(), // Farcaster Mini App/Frame wallet connector
  ],
});

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    console.log('Initializing Farcaster SDK in _app.js...');
    if (!sdk) {
      console.error('Farcaster SDK not loaded');
      return;
    }

    // Attempt to initialize SDK (adjust based on actual SDK API)
    try {
      // Check if sdk.init or similar method exists instead of connectAsync
      if (typeof sdk.init === 'function') {
        sdk.init()
          .then(async () => {
            try {
              const user = await sdk.user?.get?.();
              console.log('User FID:', user?.fid || 'Unknown');
              await sdk.actions?.ready?.();
              console.log('Farcaster Mini App ready');
              if (sdk.wallet?.isConnected?.()) {
                console.log('Wallet connected:', sdk.wallet.address());
              } else {
                console.warn('Wallet not connected');
              }
            } catch (error) {
              console.error('Farcaster SDK initialization error:', error);
            }
          })
          .catch((error) => {
            console.error('Farcaster SDK init error:', error);
          });
      } else {
        console.warn('Farcaster SDK init method not found, skipping initialization');
      }
    } catch (error) {
      console.error('Farcaster SDK error:', error);
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
