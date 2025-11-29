// components/MiniAppComponent.js
'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiConfig, useAccount, useConnect, useSignMessage } from 'wagmi';
import { wagmiConfig } from '../wagmi';

function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const { isConnected, address } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const initSDK = async () => {
      try {
        console.log('Initializing SDK...');
        await sdk.actions.ready();
        setSdkReady(true);
        console.log('SDK ready!');
      } catch (err) {
        console.error('SDK ready error:', err);
        setError(`SDK initialization failed: ${err.message}`);
        setInitializing(false);
      }
    };
    initSDK();
  }, []);

  useEffect(() => {
    if (!sdkReady) return;

    const init = async () => {
      try {
        console.log('Starting app initialization...');

        // Safe SDK methods with error handling
        let locationContext = null;
        try {
          locationContext = await sdk.getLocationContext({ timeoutMs: 5000 });
        } catch (contextErr) {
          console.error('getLocationContext failed:', contextErr);
          // Fallback to isInMiniApp
          const isMiniApp = await sdk.isInMiniApp({ timeoutMs: 5000 }).catch(() => false);
          locationContext = { type: 'standard', isMiniApp };
        }

        console.log('Location context:', locationContext);
        const isMiniApp = locationContext?.isMiniApp || locationContext?.type === 'open_miniapp';
        if (!isMiniApp) {
          const errorMsg = 'Not running in Farcaster. Open in Warpcast or Base App.';
          setError(errorMsg);
          onFarcasterReady?.({ error: errorMsg });
          onMiniAppReady?.();
          return;
        }

        // Connect wallet if not connected
        if (!isConnected && connectors[0] && !isConnecting) {
          console.log('Connecting wallet...');
          connect({ connector: connectors[0] });
        }

        // Wait for wallet
        if (!isConnected || !address) {
          const errorMsg = 'Wallet not connected. Connect in Warpcast/Base App.';
          setError(errorMsg);
          onFarcasterReady?.({ error: errorMsg });
          onMiniAppReady?.();
          return;
        }

        // Safe getUser with fallback
        let user = null;
        try {
          user = await sdk.getUser();
        } catch (userErr) {
          console.error('getUser failed:', userErr);
          user = { address, fid: null, username: 'fallback_user' };
        }

        if (!user || !user.address) {
          const errorMsg = 'Failed to fetch Farcaster user. Using wallet address.';
          console.error(errorMsg);
          user = { address, fid: null, username: 'wallet_user' };
        }

        console.log('User data:', user);

        // Verify address match
        if (address.toLowerCase() !== user.address.toLowerCase()) {
          const errorMsg = `Address mismatch: Wallet \( {address} vs Farcaster \){user.address}`;
          setError(errorMsg);
          onFarcasterReady?.({ error: errorMsg });
          onMiniAppReady?.();
          return;
        }

        // Cache data
        localStorage.setItem('wallet_address', user.address);
        if (user.fid) localStorage.setItem('fid', user.fid.toString());

        // Sign message for /api/me
        const message = `Login to EchoEcho for \( {user.address} at \){new Date().toISOString()}`;
        let signature;
        try {
          signature = await signMessageAsync({ message });
        } catch (signErr) {
          const errorMsg = signErr.message.includes('rejected')
            ? 'User rejected signature'
            : `Signature failed: ${signErr.message}`;
          setError(errorMsg);
          onFarcasterReady?.({ error: errorMsg });
          onMiniAppReady?.();
          return;
        }

        // Auth with /api/me
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Auth failed:', errorText);
          setError(`Auth failed: \( {response.status} - \){errorText}`);
          onMiniAppReady?.();
          return;
        }

        const data = await response.json();
        console.log('Auth success:', data);
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('tier', data.tier || 'free');
        localStorage.setItem('subscription', JSON.stringify(data.subscription || null));

        onFarcasterReady?.({
          fid: data.fid || user.fid || null,
          username: data.username || user.username || 'unknown',
          address: data.address,
          token: data.token,
          tier: data.tier || 'free',
          subscription: data.subscription,
          referrerDomain: locationContext?.referrerDomain || null,
          clientFid: locationContext?.client?.clientFid || null,
          platformType: locationContext?.client?.platformType || 'unknown',
        });

      } catch (err) {
        console.error('Initialization failed:', err);
        setError(`App initialization failed: ${err.message}`);
      } finally {
        setInitializing(false);
        onMiniAppReady?.();
      }
    };

    init();
  }, [sdkReady, isConnected, address, connect, connectors, isConnecting, signMessageAsync, onMiniAppReady, onFarcasterReady]);

  if (error) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#ef4444',
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <div>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 12,
              fontSize: 14,
            }}
          >
            Retry
          </button>
          {error.includes('Wallet not connected') && connectors[0] && (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isConnecting}
              style={{
                background: isConnecting ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                marginTop: 12,
                fontSize: 14,
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          <div style={{ marginTop: 12 }}>
            <p>Please open in a Farcaster client:</p>
            <a
              href="https://warpcast.com/~/apps/echoecho"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                marginRight: 12,
                fontSize: 14,
              }}
            >
              Open in Warpcast
            </a>
            <a
              href="https://wallet.coinbase.com/base-app"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                fontSize: 14,
              }}
            >
              Open in Base App
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#f9fafb',
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div>Loading EchoEcho...</div>
          <div
            style={{
              width: 40,
              height: 40,
              border: '4px solid #3b82f6',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
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