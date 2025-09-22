import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector(),
  ],
});

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    console.log('Initializing Farcaster SDK in _app.js...');
    sdk.connectAsync()
      .then(async () => {
        const user = await sdk.user.getAsync();
        console.log('User FID:', user.fid);
        await sdk.actions.ready();
        console.log('Farcaster Mini App ready');
        if (sdk.wallet.isConnected()) {
          console.log('Wallet connected:', sdk.wallet.address());
        } else {
          console.warn('Wallet not connected');
        }
      })
      .catch((error) => {
        console.error('Farcaster SDK Error:', error);
      });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
