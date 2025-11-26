// components/MiniAppComponentInner.js
'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// NOW safe to import wagmi — only runs after dynamic load
import { WagmiConfig, useAccount, useConnect, useSignMessage } from 'wagmi';
import { wagmiConfig } from '../wagmi';

export function MiniAppComponentInner({ onMiniAppReady, onFarcasterReady }) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, address } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const init = async () => {
      try {
        console.log('MiniApp initializing...');

        const context = await sdk.getLocationContext().catch(() => ({ type: 'unknown' }));
        const isMiniApp = context?.type === 'open_miniapp' || await sdk.isInMiniApp().catch(() => false);

        if (!isMiniApp) {
          setError('Please open in Warpcast or Base App');
          onFarcasterReady?.({ error: 'Not in miniapp' });
          onMiniAppReady?.();
          setInitializing(false);
          return;
        }

        await sdk.actions.ready();

        if (!isConnected && connectors[0]) {
          connect({ connector: connectors[0] });
        }

        if (!address) {
          setError('Wallet not connected');
          onFarcasterReady?.({ error: 'No wallet' });
          onMiniAppReady?.();
          setInitializing(false);
          return;
        }

        const user = await sdk.getUser().catch(() => ({ address }));
        if (!user?.address) {
          setError('Failed to get Farcaster user');
          onFarcasterReady?.({ error: 'No user' });
          onMiniAppReady?.();
          setInitializing(false);
          return;
        }

        const message = `Login to EchoEcho at ${new Date().toISOString()}`;
        const signature = await signMessageAsync({ message });

        const res = await fetch('/api/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            signature,
            address: user.address,
            fid: user.fid || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Auth failed');

        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('wallet_address', data.address);

        onFarcasterReady?.({
          fid: user.fid,
          address: data.address,
          token: data.token,
          tier: data.tier || 'free',
          subscription: data.subscription,
        });

        onMiniAppReady?.();
      } catch (err) {
        console.error('Init error:', err);
        setError(err.message);
        onFarcasterReady?.({ error: err.message });
        onMiniAppReady?.();
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [isConnected, address, connect, connectors, isConnecting, signMessageAsync, onMiniAppReady, onFarcasterReady]);

  if (error || initializing) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', zIndex: 9999, padding: 20, textAlign: 'center'
      }}>
        {initializing ? (
          <>
            <div style={{ fontSize: 24, marginBottom: 20 }}>EchoEcho</div>
            <div>Loading...</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, marginBottom: 20, color: '#ef4444' }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{
              background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px',
              borderRadius: 8, fontSize: 16, cursor: 'pointer'
            }}>
              Retry
            </button>
            <div style={{ marginTop: 20, fontSize: 14 }}>
              <a href="https://warpcast.com/~/apps/echoecho" style={{ color: '#60a5fa' }}>Open in Warpcast</a>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// Wrap with WagmiConfig only here — safe because it's dynamically loaded
export default function WrappedMiniAppComponentInner(props) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <MiniAppComponentInner {...props} />
    </WagmiConfig>
  );
}
