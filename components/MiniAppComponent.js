'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiConfig, useAccount, useConnect, useSignMessage } from 'wagmi';
import { wagmiConfig } from '../wagmi';

function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [trending, setTrending] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const pollForLocationContext = async (maxAttempts = 5, baseDelay = 2000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const context = await sdk.getLocationContext({ timeoutMs: 5000 });
        if (context?.type === 'open_miniapp') return context;
        const isMiniApp = await sdk.isInMiniApp({ timeoutMs: 5000 });
        return { type: 'standard', isMiniApp, client: { clientFid: null, platformType: 'unknown' } };
      } catch {
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return { type: 'unknown', isMiniApp: false };
  };

  const pollForUser = async (wagmiAddress, maxAttempts = 5, baseDelay = 2000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const user = await sdk.getUser();
        if (user && user.address) return user;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * baseDelay));
      } catch {}
    }
    if (wagmiAddress) return { address: wagmiAddress, username: 'wagmi_user' };
    const cachedAddress = localStorage.getItem('wallet_address');
    if (cachedAddress) return { address: cachedAddress, username: 'cached_user' };
    return null;
  };

  const fetchTrending = async () => {
    try {
      setLoadingFeed(true);
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTrending(data.casts || []);
    } catch (err) {
      console.error('Error loading trending feed:', err);
      setTrending([]);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const locationContext = await pollForLocationContext();
        const isMiniApp = locationContext.isMiniApp || locationContext.type === 'open_miniapp';
        if (!isMiniApp) {
          const msg = 'Please open this in Warpcast.';
          setError(msg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: msg });
          return;
        }

        await sdk.actions.ready();

        if (!isConnected && connectors[0]) {
          try {
            connect({ connector: connectors[0] });
          } catch (err) {
            throw new Error(`Wallet connect failed: ${err.message}`);
          }
        }

        if (!isConnected || !address) {
          const msg = 'Wallet not connected in Warpcast.';
          setError(msg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: msg });
          return;
        }

        const user = await pollForUser(address);
        if (!user?.address) {
          const msg = 'No valid user found.';
          setError(msg);
          return;
        }

        const message = `Login to EchoEcho for ${user.address}`;
        const signature = await signMessageAsync({ message });

        const response = await fetch('/api/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            signature,
            address: user.address,
            username: user.username || 'unknown',
            fid: user.fid || null,
          }),
        });

        if (!response.ok) throw new Error(`Auth failed: ${response.statusText}`);
        const data = await response.json();

        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('wallet_address', data.address);

        onFarcasterReady?.(data);
        onMiniAppReady?.();

        setReady(true);
        await fetchTrending(); // ✅ Fetch trending feed right away
      } catch (err) {
        console.error('MiniApp init error:', err);
        setError(err.message);
        onMiniAppReady?.();
        onFarcasterReady?.({ error: err.message });
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [isConnected, address, connect, connectors, signMessageAsync]);

  // === UI States ===
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: '#ef4444' }}>
        {error}
        <div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 10,
              background: '#3b82f6',
              color: '#fff',
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div style={{ textAlign: 'center', padding: 30, color: '#f9fafb' }}>
        Initializing MiniApp...
        <div
          style={{
            margin: '20px auto',
            width: 30,
            height: 30,
            border: '3px solid #3b82f6',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (ready && loadingFeed) {
    return (
      <div style={{ textAlign: 'center', padding: 30, color: '#22c55e' }}>
        ✅ Connected! Loading trending feed...
      </div>
    );
  }

  if (ready && trending) {
    return (
      <div style={{ padding: '10px 20px', color: '#fff', backgroundColor: '#111827', minHeight: '100vh' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>🔥 Trending Echoes</h2>
        {trending.length === 0 ? (
          <p>No trending posts found.</p>
        ) : (
          trending.map((cast, i) => (
            <div
              key={i}
              style={{
                background: '#1f2937',
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <strong>{cast.author?.username || 'Unknown'}</strong>
              <p style={{ marginTop: 6 }}>{cast.text || '(no text)'}</p>
            </div>
          ))
        )}
      </div>
    );
  }

  return null;
}

export default function WrappedMiniAppComponent(props) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <MiniAppComponent {...props} />
    </WagmiConfig>
  );
}