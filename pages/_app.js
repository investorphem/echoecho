import { useEffect, useState, Component } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import dynamic from 'next/dynamic';

// Dynamically import client-only components
const MiniKitContextProvider = dynamic(() => import('../providers/MiniKitProvider'), { ssr: false });
const AutoConnect = dynamic(() => import('@coinbase/onchainkit').then(mod => mod.AutoConnect), { ssr: false });

// Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

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
  // No longer need isClient state as dynamic imports handle SSR
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitContextProvider>
          <ErrorBoundary>
            <AutoConnect />
            <Component {...pageProps} />
          </ErrorBoundary>
        </MiniKitContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
