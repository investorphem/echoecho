import { useState, useEffect } from 'react';
import { useSignMessage } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  walletConnected, // Now used in UI
  walletAddress,   // Now used in UI
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state
  const { signMessageAsync } = useSignMessage();

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

        // Signal SDK ready
        try {
          await sdk.actions.ready();
        } catch (err) {
          setError(`Failed to initialize Farcaster SDK: ${err.message}`);
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          setLoading(false);
          return;
        }

        // Attempt automatic connection
        try {
          const user = await sdk.getUser?.();
          let address, username;

          if (user && user.address) {
            address = user.address;
            username = user.username || 'unknown';
          } else {
            setError('No wallet connected in Warpcast. Please log in.');
            onFarcasterReady?.(null);
            setLoading(false);
            return;
          }

          // Generate and sign message for authentication
          const message = `Login to EchoEcho at ${new Date().toISOString()}`;
          let signature;
          try {
            signature = await signMessageAsync({ message });
          } catch (signError) {
            setError(`Signature failed: ${signError.message}`);
            onFarcasterReady?.(null);
            setLoading(false);
            return;
          }

          // Send to /api/me
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature, address, username }),
          });

          if (response.ok) {
            const userData = await response.json();
            onFarcasterReady?.({
              username: userData.username,
              address: userData.address,
              token: userData.token,
              tier: userData.tier || 'free',
              subscription: userData.subscription || null,
            });
          } else {
            const errorData = await response.json();
            setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
            onFarcasterReady?.(null);
          }
        } catch (error) {
          setError(`Authentication error: ${error.message}`);
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
  }, [signMessageAsync, onMiniAppReady, onFarcasterReady]);

  // Use walletConnected and walletAddress in UI
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