'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useSignMessage } from 'wagmi';

export default function MiniAppComponent({
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Checking Mini App context...');
        const isMiniApp = await sdk.isInMiniApp({ timeoutMs: 5000 }); // Increased timeout to 5s
        console.log('Mini App context:', isMiniApp);

        if (!isMiniApp) {
          setError('Not running in a Farcaster client. Please open in Warpcast.');
          onMiniAppReady?.();
          onFarcasterReady?.({ error: 'Not in Mini App context' });
          return;
        }

        // Signal SDK ready
        try {
          await sdk.actions.ready();
          console.log('Farcaster SDK initialized');
        } catch (err) {
          console.error('SDK ready error:', err);
          throw new Error(`Failed to signal SDK ready: ${err.message}`);
        }

        // Connect wallet if not connected
        if (!isConnected && connectors[0]) {
          console.log('Connecting to wallet...');
          try {
            connect({ connector: connectors[0] });
          } catch (connectErr) {
            throw new Error(`Wallet connection failed: ${connectErr.message}`);
          }
        }

        // Wait for wallet connection
        if (!isConnected || !address) {
          setError('Wallet not connected');
          onMiniAppReady?.();
          onFarcasterReady?.({ error: 'Wallet not connected' });
          return;
        }

        // Get user data with exponential backoff retries
        let user;
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            user = await sdk.getUser();
            if (user && user.fid && user.address) break;
            console.log(`Attempt ${attempt}: Invalid user data, retrying...`);
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (userErr) {
            console.log(`Attempt ${attempt}: Error fetching user: ${userErr.message}`);
          }
        }

        if (!user || !user.fid || !user.address) {
          throw new Error('Failed to fetch user data: Invalid or missing user information');
        }
        console.log('User data:', user);

        // Verify wallet address matches Farcaster user
        if (address.toLowerCase() !== user.address.toLowerCase()) {
          throw new Error('Connected wallet address does not match Farcaster user address');
        }

        // Generate and sign message
        const message = `Login to EchoEcho for ${user.address} at ${new Date().toISOString()}`;
        let signature;
        try {
          signature = await signMessageAsync({ message });
        } catch (signErr) {
          if (signErr.message.includes('rejected')) {
            throw new Error('Authentication failed: User rejected the signature request');
          }
          throw new Error(`Authentication failed: ${signErr.message}`);
        }

        // Authenticate with /api/me
        const response = await fetch('/api/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            signature,
            address: user.address,
            username: user.username || 'unknown',
            fid: user.fid,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Authentication failed: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('wallet_address', data.address);
        localStorage.setItem('tier', data.tier);
        localStorage.setItem('subscription', JSON.stringify(data.subscription));

        onFarcasterReady?.({
          fid: data.fid,
          username: data.username,
          address: data.address,
          token: data.token,
          tier: data.tier,
          subscription: data.subscription,
        });

        onMiniAppReady?.();
      } catch (err) {
        console.error('MiniAppComponent error:', err);
        setError(`Initialization error: ${err.message}`);
        onMiniAppReady?.();
        onFarcasterReady?.({ error: err.message });
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [isConnected, address, connect, connectors, signMessageAsync, onMiniAppReady, onFarcasterReady]);

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
          background: 'rgba(0, 0, 0, 0.5)',
          color: '#ef4444',
          fontSize: 16,
          zIndex: 1000,
          padding: 16,
          textAlign: 'center',
        }}
      >
        {error}
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
          background: 'rgba(0, 0, 0, 0.5)',
          color: '#f9fafb',
          fontSize: 16,
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div>Farcaster initializing...</div>
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