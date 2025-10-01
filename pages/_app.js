import { useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Wagmi config with Farcaster connector only
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()], // Only Farcaster connector
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
    // Optional: Add global error handling logic
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
          {/* No MiniKit or AutoConnect needed for Farcaster-only apps */}
          <Component {...pageProps} />
        </ErrorBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
