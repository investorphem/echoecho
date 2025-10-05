'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [isMiniApp, setIsMiniApp] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if in Mini App context
        const isInMiniApp = await sdk.isInMiniApp({ timeoutMs: 100 });
        setIsMiniApp(isInMiniApp);

        if (isInMiniApp) {
          // Initialize Farcaster SDK
          await sdk.actions.ready();

          // Get user data
          const user = await sdk.getUser();
          if (!user?.address) {
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
          console.log('Not in Mini App context. Skipping Farcaster authentication.');
          onFarcasterReady({ error: 'Not in Mini App context' });
        }

        // Signal that MiniAppComponent is ready
        onMiniAppReady();
      } catch (error) {
        console.error('MiniAppComponent error:', error);
        onFarcasterReady({ error: error.message });
        onMiniAppReady();
      }
    };

    initialize();
  }, [onMiniAppReady, onFarcasterReady]);

  return null; // No UI, just handles initialization
}