import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
  onWalletAddress,
}) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp || !window.ethereum) {
          setError('Not running in Farcaster or no wallet provider available');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          onWalletAddress?.(null);
          return;
        }

        // Get wallet address
        let address = null;
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            address = accounts[0];
            onWalletAddress?.(address);
          } else {
            const requestedAccounts = await window.ethereum.request({
              method: 'eth_requestAccounts',
            });
            if (requestedAccounts.length > 0) {
              address = requestedAccounts[0];
              onWalletAddress?.(address);
            }
          }
        } catch (err) {
          setError('Wallet connection error: ' + err.message);
        }

        // Signal ready
        try {
          await sdk.actions.ready();
        } catch (err) {
          setError('Failed to signal SDK ready: ' + err.message);
        }

        // Authenticate user and get signature
        try {
          const contextUser = sdk.context.user;
          const fid = contextUser?.fid;
          if (!fid) {
            setError('No Farcaster ID available');
            onFarcasterReady?.(null);
            return;
          }

          // Generate a message for the user to sign
          const message = `Login to EchoEcho at ${new Date().toISOString()}`;
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
          });

          // Send FID, message, and signature to /api/me
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid, message, signature, address }),
          });

          if (response.ok) {
            const user = await response.json();
            onFarcasterReady?.({ fid: user.fid, username: user.username, address: user.address });
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
        onWalletAddress?.(null);
      }
    };

    init();
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady, onWalletAddress]);

  return error ? <div>Error: {error}</div> : null;
}