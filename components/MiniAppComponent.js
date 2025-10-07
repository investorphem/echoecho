import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useSignMessage } from 'wagmi';

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [error, setError] = useState(null);
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const init = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp) {
          setError('Not running in a Farcaster client');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Signal ready
        try {
          await sdk.actions.ready();
        } catch (err) {
          setError('Failed to signal SDK ready: ' + err.message);
        }

        if (!walletConnected || !walletAddress) {
          setError('Wallet not connected');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Get FID and sign message
        try {
          const contextUser = sdk.context.user;
          const fid = contextUser?.fid;
          if (!fid) {
            setError('No Farcaster ID available');
            onFarcasterReady?.(null);
            return;
          }

          // Generate message to sign
          const message = `Login to EchoEcho at ${new Date().toISOString()}`;
          const signature = await signMessageAsync({ message });

          // Send to /api/me
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid, message, signature, address: walletAddress }),
          });

          if (response.ok) {
            const user = await response.json();
            onFarcasterReady?.({
              fid: user.fid,
              username: user.username,
              address: user.address,
              token: user.token,
            });
          } else {
            setError('Authentication failed');
            onFarcasterReady?.(null);
          }
        } catch (error) {
          setError('Authentication error: ' + error.message);
          onFarcasterReady?.(null);
        }

        onMiniAppReady?.();
      } catch (err) {
        setError('Initialization error: ' + err.message);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      }
    };

    init();
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady, signMessageAsync]);

  return error ? <div>Error: {error}</div> : null;
}
