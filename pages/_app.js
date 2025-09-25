import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { base } from 'wagmi/chains';

const isFarcasterClient = typeof window !== 'undefined' && window.location.hostname.includes('warpcast.com');

const config = createConfig({
  chains: [base],
  connectors: isFarcasterClient ? [] : [injected()],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

const WagmiHooks = dynamic(
  () =>
    import('wagmi').then(({ useAccount, useConnect }) => {
      return function WagmiHooksComponent({ children }) {
        const { address, isConnected, status } = useAccount();
        const { connect, connectors, error: connectError } = useConnect();

        useEffect(() => {
          console.log('Wallet connection status:', status);
          if (isFarcasterClient) {
            console.log('In Farcaster: Skipping wallet connect');
            return;
          }
          if (isConnected) {
            console.log('Wallet connected:', address);
          } else {
            console.warn('Wallet not connected, status:', status);
            if (connectors.length > 0 && status !== 'connecting') {
              try {
                console.log('Attempting to connect with injected wallet connector...');
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

        return children;
      };
    }),
  { ssr: false }
);

export default function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {isClient ? (
          <WagmiHooks>
            <Component {...pageProps} />
          </WagmiHooks>
        ) : (
          <Component {...pageProps} />
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}