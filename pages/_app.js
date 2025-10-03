import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import MiniAppComponent from '../components/MiniAppComponent';

// Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

function AppContent({ Component, pageProps }) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  // Update wallet state based on MiniAppComponent data
  const handleFarcasterReady = (data) => {
    if (data?.address) {
      setWalletAddress(data.address);
      setWalletConnected(true);
    } else {
      setWalletConnected(false);
      setWalletAddress(null);
    }
  };

  if (!isMiniApp) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#111827',
          color: '#f9fafb',
        }}
      >
        <h2>Open in Farcaster</h2>
        <p>This app works best in the Base app, warpcast.com, or farcaster.xyz.</p>
      </div>
    );
  }

  return (
    <>
      <MiniAppComponent
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onMiniAppReady={() => {
          setIsMiniApp(true);
          setSdkReady(true);
        }}
        onFarcasterReady={handleFarcasterReady}
      />
      {sdkReady ? (
        walletConnected && walletAddress ? (
          <Component {...pageProps} walletAddress={walletAddress} />
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#111827',
              color: '#f9fafb',
            }}
          >
            <h2>Connect Wallet</h2>
            <p>Waiting for automatic wallet connection in Warpcast...</p>
          </div>
        )
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#111827',
            color: '#f9fafb',
          }}
        >
          <h2>Initializing Farcaster SDK...</h2>
          <p>Please open this app in Warpcast, base.org, or farcaster.xyz.</p>
        </div>
      )}
    </>
  );
}

export default function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent Component={Component} pageProps={pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}