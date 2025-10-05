'use client';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Detect if running inside Warpcast Mini App
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp) {
          setError('Not running in a Farcaster client. Please use Warpcast.');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          setLoading(false);
          return;
        }

        // Initialize SDK
        try {
          await sdk.actions.ready();
        } catch (err) {
          setError(`Failed to initialize Farcaster SDK: ${err.message}`);
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          setLoading(false);
          return;
        }

        // Get user data
        let address, username;
        try {
          const user = await sdk.getUser();
          if (!user || !user.address) {
            setError('No wallet connected in Warpcast. Please log in.');
            onFarcasterReady?.(null);
            setLoading(false);
            return;
          }
          address = user.address;
          username = user.username || 'unknown';
        } catch (err) {
          setError(`Failed to get user: ${err.message}`);
          onFarcasterReady?.(null);
          setLoading(false);
          return;
        }

        // Generate and sign message using Farcaster SDK
        const message = `Login to EchoEcho at ${new Date().toISOString()}`;
        let signature;
        try {
          // Use SDK's signMessage instead of wagmi
          signature = await sdk.actions.signMessage({ message });
        } catch (signError) {
          setError(`Signature failed: ${signError.message}`);
          onFarcasterReady?.(null);
          setLoading(false);
          return;
        }

        // Send to /api/me
        try {
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature, address, username }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
            onFarcasterReady?.(null);
            setLoading(false);
            return;
          }

          const userData = await response.json();
          // Store in localStorage for handleUSDCPayment
          localStorage.setItem('jwt_token', userData.token);
          localStorage.setItem('wallet_address', userData.address);
          localStorage.setItem('tier', userData.tier || 'free');
          localStorage.setItem('subscription', JSON.stringify(userData.subscription || null));

          onFarcasterReady?.({
            username: userData.username,
            address: userData.address,
            token: userData.token,
            tier: userData.tier || 'free',
            subscription: userData.subscription || null,
          });
        } catch (authError) {
          setError(`Authentication error: ${authError.message}`);
          onFarcasterReady?.(null);
        }

        onMiniAppReady?.();
        setLoading(false);
      } catch (err) {
        setError(`Initialization error: ${err.message}`);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
        setLoading(false);
      }
    };

    init();
  }, [onMiniAppReady, onFarcasterReady]);

  const walletStatus = walletConnected
    ? `Connected: ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`
    : 'Not connected';

  return (
    <div>
      {loading && <div style={{ color: '#666', marginBottom: 12 }}>Loading...</div>}
      {error && (
        <div style={{ color: 'red', marginBottom: 12 }}>
          Error: {error.includes('Too many requests') ? 'Rate limit exceeded. Please try again later.' : error}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <strong>Wallet Status:</strong> {walletStatus}
      </div>
    </div>
  );
}