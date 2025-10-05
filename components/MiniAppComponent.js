'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  _walletConnected, // Prefixed with _ to satisfy no-unused-vars
  _walletAddress,   // Prefixed with _ to satisfy no-unused-vars
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if in Mini App context with longer timeout
        // eslint-disable-next-line no-console
        console.log('Checking Mini App context...');
        const _isMiniApp = await sdk.isInMiniApp({ timeoutMs: 500 }); // Increased timeout to 500ms
        // eslint-disable-next-line no-console
        console.log('Mini App context:', _isMiniApp);

        if (_isMiniApp) {
          // Immediately call sdk.actions.ready() for Farcaster environment
          // eslint-disable-next-line no-console
          console.log('Calling sdk.actions.ready()...');
          await sdk.actions.ready();
          // eslint-disable-next-line no-console
          console.log('Farcaster SDK initialized');

          setInitializing(true); // Show "Farcaster initializing" message

          // Get user data
          const user = await sdk.getUser();
          setInitializing(false); // Hide initializing message

          if (!user?.address) {
            setError('No user address found');
            onFarcasterReady({ error: 'No user address found' });
            return;
          }

          // Generate message to sign
          const message = `Login to EchoEcho for ${user.address} at ${new Date().toISOString()}`;
          const { signature } = await sdk.actions.signMessage({ message });

          // Authenticate with /api/me
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              signature,
              address: user.address,
              username: user.username || 'unknown',
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          const data = await response.json();
          // Store data in localStorage
          localStorage.setItem('jwt_token', data.token);
          localStorage.setItem('wallet_address', data.address);
          localStorage.setItem('tier', data.tier);
          localStorage.setItem('subscription', JSON.stringify(data.subscription));

          // Notify parent component
          onFarcasterReady({
            username: data.username,
            address: data.address,
            token: data.token,
            tier: data.tier,
            subscription: data.subscription,
          });
        } else {
          // Non-Mini App context (e.g., browser)
          // eslint-disable-next-line no-console
          console.log('Not in Mini App context. Skipping Farcaster authentication.');
          setError('Not in Farcaster Mini App context. Please open in Warpcast.');
          onFarcasterReady({ error: 'Not in Mini App context' });
        }

        // Signal that MiniAppComponent is ready
        onMiniAppReady();
      } catch (err) {
        // Error: MiniAppComponent error: ${err.message}
        // eslint-disable-next-line no-console
        console.error('MiniAppComponent error:', err);
        setError(`Failed to initialize Farcaster: ${err.message}`);
        setInitializing(false);
        onFarcasterReady({ error: err.message });
        onMiniAppReady();
      }
    };

    initialize();
  }, [onMiniAppReady, onFarcasterReady]);

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

  return null; // No UI when not initializing or in error state
}