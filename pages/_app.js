import { useEffect, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { OnchainKitProvider, AutoConnect } from '@coinbase/onchainkit';
import { FarcasterConnector } from '@farcaster/miniapp-wagmi-connector';
import { Component } from 'react';

// Simplified Farcaster detection
const getIsFarcasterClient = () => {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return (
    url.hostname.includes('warpcast.com') ||
    url.hostname.includes('client.warpcast.com') ||
    url.searchParams.get('miniApp') === 'true' ||
    url.pathname.includes('/miniapp') ||
    window.farcaster ||
    navigator.userAgent.includes('Farcaster')
  );
};

// Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [new FarcasterConnector()],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

// ErrorBoundary component to catch rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Hydration/Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center', color: '#f9fafb', background: '#111827', minHeight: '100vh' }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error?.message || 'Unknown error'}</p>
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
    return this.props.children;
  }
}

export default function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);

  // Handle Farcaster SDK and ready() call
  useEffect(() => {
    setIsClient(true); // Mark client-side rendering
    if (getIsFarcasterClient()) {
      console.log('MyApp: Farcaster client detected - initializing SDK');
      import('@farcaster/miniapp-sdk')
        .then(({ sdk }) => {
          console.log('MyApp: Farcaster SDK loaded');
          sdk.actions.ready()
            .then(() => console.log('MyApp: sdk.actions.ready() succeeded'))
            .catch((err) => console.error('MyApp: sdk.actions.ready() failed:', err.message));
        })
        .catch((err) => console.error('MyApp: Failed to import Farcaster SDK:', err.message));
    } else {
      console.log('MyApp: Non-Farcaster environment');
    }
  }, []); // Run once on mount

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider>
          <ErrorBoundary>
            <AutoConnect /> {/* Auto-connects Farcaster wallet */}
            {isClient && <Component {...pageProps} />}
          </ErrorBoundary>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}