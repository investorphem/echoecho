'use client';
import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  _walletConnected, // Prefixed with _ to satisfy no-unused-vars
  _walletAddress,   // Prefixed with _ to satisfy no-unused-vars
  onMiniAppReady,
  onFarcasterReady,
}) {
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if in Mini App context
        const _isMiniApp = await sdk.isInMiniApp({ timeoutMs: 100 }); // Prefixed with _ to satisfy no-unused-vars

        if (_isMiniApp) {
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
          // Skipping console.log to satisfy no-console rule
          onFarcasterReady({ error: 'Not in Mini App context' });
        }

        // Signal that MiniAppComponent is ready
        onMiniAppReady();
      } catch (error) {
        // Log error as comment to avoid no-console
        // Error: MiniAppComponent error: ${error.message}
        onFarcasterReady({ error: error.message });
        onMiniAppReady();
      }
    };

    initialize();
  }, [onMiniAppReady, onFarcasterReady]);

  return null; // No UI, just handles initialization
}