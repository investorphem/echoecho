import { useEffect, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()], // Farcaster SDK
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

// Detect Farcaster client environment
const isFarcasterClient = () => {
  const isBaseApp = navigator.userAgent.includes('BaseApp');
  const isWarpcast = window.location.hostname === 'warpcast.com';
  const isFarcasterXYZ = window.location.hostname === 'farcaster.xyz';
  return isBaseApp || isWarpcast || isFarcasterXYZ;
};

export default function MyApp({ Component, pageProps }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const sdk = farcasterMiniApp();

    // Detect Farcaster client
    const isClient = isFarcasterClient();
    if (!isClient) {
      console.warn('This app works best in Farcaster clients (Base app, warpcast.com, farcaster.xyz).');
      return;
    }

    // SDK ready event
    const handleSdkReady = () => {
      console.log('Farcaster SDK is ready!');
      setSdkReady(true);
    };

    // Wallet connection event
    const handleWalletConnect = () => {
      console.log('Wallet connected!');
      setWalletConnected(true);
    };

    // SDK error handling
    const handleSdkError = (error) => {
      console.error('Farcaster SDK error:', error);
    };

    // Initialize SDK listeners
    sdk.on('ready', handleSdkReady);
    sdk.on('connect', handleWalletConnect);
    sdk.on('error', handleSdkError);

    // Clean up listeners
    return () => {
      sdk.off('ready', handleSdkReady);
      sdk.off('connect', handleWalletConnect);
      sdk.off('error', handleSdkError);
    };
  }, []);

  // Fallback UI for non-Farcaster clients
  if (!isFarcasterClient()) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
        <h2>Open in Farcaster</h2>
        <p>This app works best in the Base app, warpcast.com, or farcaster.xyz.</p>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {sdkReady && walletConnected ? (
          <Component {...pageProps} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
            <h2>Initializing Farcaster SDK...</h2>
            <p>Please connect your wallet in the Farcaster client.</p>
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
