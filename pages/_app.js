import { useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import dynamic from 'next/dynamic';

// Direct import of MiniKit from the package
import { MiniKit } from '@coinbase/onchainkit';

// AutoConnect is still valid
import { AutoConnect } from '@coinbase/onchainkit';

// Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

// Error Boundary Component
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle global errors if needed
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#f9fafb', background: '#111827', minHeight: '100vh' }}>
        <h2>Something went wrong.</h2>
        <p>{error?.message || 'Unknown error'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  return children;
};

export default function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <MiniKit
            appName="My App"
            chains={[{ chainId: base.id, name: 'Base' }]}
            connectors={[
              { name: 'MetaMask', type: 'injected' },
              { name: 'Coinbase Wallet', type: 'injected' },
            ]}
          >
            <AutoConnect />
            <Component {...pageProps} />
          </MiniKit>
        </ErrorBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
