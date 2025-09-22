import { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
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
  const { address, isConnected, status } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();

  useEffect(() => {
    console.log('Wallet connection status:', status);
    if (isConnected) {
      console.log('Wallet connected:', address);
    } else {
      console.warn('Wallet not connected, status:', status);
      // Attempt to connect to the Farcaster wallet
      if (connectors.length > 0 && status !== 'connecting') {
        try {
          connect({ connector: connectors[0] }); // Use the first connector (farcasterFrame)
        } catch (err) {
          console.error('Wagmi connect error:', err);
        }
      }
    }

    if (connectError) {
      console.error('Wagmi connection error:', connectError.message);
    }
  }, [address, isConnected, status, connect, connectors, connectError]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
