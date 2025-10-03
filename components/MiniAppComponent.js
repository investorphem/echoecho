'use client';

import { useEffect, useState } from 'react';
import { MiniAppClient } from '@farcaster/miniapp-sdk';
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
        const client = new MiniAppClient();
        const isMiniApp = await client.isInMiniApp();
        if (!isMiniApp) {
          setError('Not running in a Farcaster client. Please use Warpcast.');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Signal SDK ready
        try {
          await client.actions.ready();
        } catch (err) {
          setError(`Failed to signal SDK ready: ${err.message}`);
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        if (!walletConnected || !walletAddress) {
          setError('Wallet not connected. Please connect via Warpcast.');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Attempt to get user data or authenticate
        try {
          const user = await client.getUser();
          if (!user || !user.fid || !user.address) {
            // Prompt for authentication
            const { fid, address, username } = await client.authenticate();
            if (!fid || !address) {
              setError('Authentication failed. Please approve in Warpcast.');
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
              body: JSON.stringify({ fid, message, signature, address, username }),
            });

            if (response.ok) {
              const userData = await response.json();
              onFarcasterReady?.({
                fid: userData.fid,
                username: userData.username,
                address: userData.address,
                token: userData.token,
              });
            } else {
              const errorData = await response.json();
              setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
              onFarcasterReady?.(null);
            }
          } else {
            // User already authenticated
            const message = `Login to EchoEcho at ${new Date().toISOString()}`;
            const signature = await signMessageAsync({ message });

            const response = await fetch('/api/me', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fid: user.fid, message, signature, address: user.address, username: user.username }),
            });

            if (response.ok) {
              const userData = await response.json();
              onFarcasterReady?.({
                fid: userData.fid,
                username: userData.username,
                address: userData.address,
                token: userData.token,
              });
            } else {
              const errorData = await response.json();
              setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
              onFarcasterReady?.(null);
            }
          }
        } catch (error) {
          setError(`Authentication error: ${error.message}`);
          onFarcasterReady?.(null);
        }

        onMiniAppReady?.();
      } catch (err) {
        setError(`Initialization error: ${err.message}`);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      }
    };

    init();
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady, signMessageAsync]);

  return error ? <div style={{ color: 'red' }}>Error: {error}</div> : null;
}