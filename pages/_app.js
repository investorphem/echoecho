import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector';

// Wagmi configuration
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  },
  connectors: [
    miniAppConnector(),
  ],
});

const queryClient = new QueryClient();

// Client-side component for Wagmi hooks
const WagmiClient = dynamic(
  () => {
    const { useAccount, useConnect } = require('wagmi');
    return function WagmiClient({ children }) {
      const { address, isConnected, status } = useAccount();
      const { connect, connectors, error: connectError } = useConnect();
      const [mounted, setMounted] = useState(false);

      useEffect(() => {
        setMounted(true); // Ensure client-side rendering
        console.log('Wallet connection status:', status);
        if (isConnected) {
          console.log('Wallet connected:', address);
        } else {
          console.warn('Wallet not connected, status:', status);
          if (connectors.length > 0 && status !== 'connecting') {
            try {
              console.log('Attempting to connect with Farcaster wallet connector...');
              connect({ connector: connectors[0] });
            } catch (err) {
              console.error('Wagmi connect error:', err.message);
            }
          }
        }

        if (connectError) {
          console.error('Wagmi connection error:', connectError.message);
        }
      }, [address, isConnected, status, connect, connectors, connectError]);

      return mounted ? children : null;
    };
  },
  { ssr: false } // Disable SSR
);

export default function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WagmiClient>
          <Component {...pageProps} />
        </WagmiClient>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
