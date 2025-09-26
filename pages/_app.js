import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { base } from 'wagmi/chains';
import { Component } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// Improved Farcaster detection
const getIsFarcasterClient = () => {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return (
    url.hostname.includes('warpcast.com') ||
    url.hostname.includes('client.warpcast.com') ||
    url.searchParams.get('miniApp') === 'true' ||
    url.pathname.includes('/miniapp')
  );
};

const isFarcasterClient = getIsFarcasterClient();

// Wagmi config
const config = createConfig({
  chains: [base],
  connectors: isFarcasterClient ? [] : [injected()],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
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
            // Signal readiness to Warpcast with retries
            const signalReady = async (attempt = 1) => {
              try {
                await sdk.actions.ready();
                console.log('Farcaster SDK signaled ready (attempt', attempt, ')');
              } catch (err) {
                console.error('Failed to signal ready (attempt', attempt, '):', err);
                if (attempt < 3) {
                  setTimeout(() => signalReady(attempt + 1), 1000);
                } else {
                  console.error('Max retries reached for ready signal');
                }
              }
            };
            signalReady();
            return;
          }
          if (isConnected) {
            console.log('Wallet connected:', address);
          } else {
            console.warn('Wallet not connected, status:', status);
            if (connectors.length > 0 && status !== 'connecting' && typeof window !== 'undefined' && window.ethereum) {
              try {
                console.log('Attempting to connect with injected wallet connector...');
                connect({ connector: connectors[0] });
              } catch (err) {
                console.error('Wagmi connect error:', err.message);
              }
            } else {
              console.log('No web3 provider detected, skipping auto-connect');
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
    if (getIsFarcasterClient()) {
      console.log('MyApp: Farcaster detected on client mount - signaling ready');
      // Early ready signal for immediate iframe load
      const signalReady = async (attempt = 1) => {
        try {
          await sdk.actions.ready();
          console.log('MyApp: Early ready signaled (attempt', attempt, ')');
        } catch (err) {
          console.error('MyApp: Early ready failed (attempt', attempt, '):', err);
          if (attempt < 3) {
            setTimeout(() => signalReady(attempt + 1), 1000);
          }
        }
      };
      signalReady();
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {isClient ? (
            <WagmiHooks>
              <Component {...pageProps} />
            </WagmiHooks>
          ) : (
            <Component {...pageProps} />
          )}
        </ErrorBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  );
}