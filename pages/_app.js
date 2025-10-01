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

export default function MyApp({ Component, pageProps }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isClientEnv, setIsClientEnv] = useState(null); // null = not detected yet
  const [loading, setLoading] = useState(true);

  // Detect Farcaster client safely
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const isBaseApp = navigator.userAgent.includes('BaseApp');
      const hostname = window.location.hostname;
      const isWarpcast = hostname === 'warpcast.com';
      const isFarcasterXYZ = hostname === 'farcaster.xyz';

      const detected = isBaseApp || isWarpcast || isFarcasterXYZ;
      setIsClientEnv(detected);

      if (!detected) setLoading(false);
    }
  }, []);

  // Initialize Farcaster SDK
  useEffect(() => {
    if (!isClientEnv) return;

    const sdk = farcasterMiniApp();

    const handleSdkReady = () => {
      console.log('Farcaster SDK is ready!');
      setSdkReady(true);
      setLoading(false);
    };

    const handleWalletConnect = () => {
      console.log('Wallet connected!');
      setWalletConnected(true);
    };

    const handleSdkError = (error) => {
      console.error('Farcaster SDK error:', error);
      setLoading(false);
    };

    sdk.on('ready', handleSdkReady);
    sdk.on('connect', handleWalletConnect);
    sdk.on('error', handleSdkError);

    return () => {
      sdk.off('ready', handleSdkReady);
      sdk.off('connect', handleWalletConnect);
      sdk.off('error', handleSdkError);
    };
  }, [isClientEnv]);

  // 🚩 Fallback for non-Farcaster environments
  if (isClientEnv === false) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
        <h2>Open in Farcaster</h2>
        <p>This app works best in the Base app, warpcast.com, or farcaster.xyz.</p>
        <p>You’re currently viewing it in a regular browser.</p>
      </div>
    );
  }

  // 🚩 Loading screen while initializing
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f9fafb',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
        <h2>Initializing Farcaster SDK...</h2>
        <p>Please wait while we connect your wallet.</p>

        {/* Inline spinner animation */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 🚩 App rendering once SDK + wallet ready
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {sdkReady && walletConnected ? (
          <Component {...pageProps} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
            <h2>Waiting for wallet connection...</h2>
            <p>Please connect your wallet in the Farcaster client.</p>
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}