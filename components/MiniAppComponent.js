'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useSignMessage } from 'wagmi';

export default function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const pollForLocationContext = async (maxAttempts = 5, baseDelay = 2000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling for location context, attempt ${attempt}...`);
        const context = await sdk.getLocationContext({ timeoutMs: 5000 });
        console.log('sdk.getLocationContext() response:', context);
        if (context?.type === 'open_miniapp') {
          console.log('OpenMiniAppLocationContext detected:', {
            referrerDomain: context.referrerDomain,
            clientFid: context.client?.clientFid,
            platformType: context.client?.platformType,
          });
          return context;
        }
        console.log('Not in OpenMiniAppLocationContext, checking isInMiniApp...');
        const isMiniApp = await sdk.isInMiniApp({ timeoutMs: 5000 });
        console.log('sdk.isInMiniApp() response:', isMiniApp);
        return { type: 'standard', isMiniApp };
      } catch (err) {
        console.error(`Attempt ${attempt}: Error checking location context:`, err);
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return { type: 'unknown', isMiniApp: false };
  };

  const pollForUser = async (wagmiAddress, maxAttempts = 5, baseDelay = 2000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling for user data, attempt ${attempt}...`);
        const user = await sdk.getUser();
        console.log('sdk.getUser() response:', user);
        if (user && user.address) {
          return user;
        }
        console.log(`Attempt ${attempt}: Invalid user data (fid: ${user?.fid}, address: ${user?.address})`);
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (userErr) {
        console.error(`Attempt ${attempt}: Error fetching user:`, userErr);
      }
    }
    // Fallback to wagmi address
    if (wagmiAddress) {
      console.log('Falling back to wagmi address:', wagmiAddress);
      return { address: wagmiAddress, username: 'wagmi_user', fid: null };
    }
    // Fallback to cached address
    const cachedAddress = localStorage.getItem('wallet_address');
    if (cachedAddress) {
      console.log('Using cached address:', cachedAddress);
      return { address: cachedAddress, username: 'cached_user', fid: null };
    }
    return null;
  };

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing MiniAppComponent...');

        // Check location context
        const locationContext = await pollForLocationContext();
        const isMiniApp = locationContext.isMiniApp || locationContext.type === 'open_miniapp';
        if (!isMiniApp) {
          const errorMsg = 'Not running in a Farcaster client or Mini App. Please open in Warpcast.';
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }

        // Validate clientFid for Warpcast (9152)
        if (locationContext.type === 'open_miniapp' && locationContext.client?.clientFid !== 9152) {
          console.warn('Unexpected clientFid:', locationContext.client?.clientFid);
        }

        // Signal SDK ready
        try {
          await sdk.actions.ready();
          console.log('Farcaster SDK signaled ready');
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
          const errorMsg = 'Wallet not connected. Please connect your wallet in Warpcast.';
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }

        // Poll for user data
        const user = await pollForUser(address);
        if (!user || !user.address) {
          const errorMsg = 'Failed to fetch user data: Missing wallet address';
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }
        console.log('User data:', user);

        // Verify wallet address
        if (address.toLowerCase() !== user.address.toLowerCase()) {
          const errorMsg = `Wallet address mismatch: Connected ${address}, Farcaster ${user.address}`;
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }

        // Cache user data
        localStorage.setItem('wallet_address', user.address);
        if (user.fid) localStorage.setItem('fid', user.fid);

        // Generate and sign message
        const message = `Login to EchoEcho for ${user.address} at ${new Date().toISOString()}`;
        let signature;
        try {
          signature = await signMessageAsync({ message });
        } catch (signErr) {
          const errorMsg = signErr.message.includes('rejected')
            ? 'Authentication failed: User rejected the signature request'
            : `Authentication failed: ${signErr.message}`;
          throw new Error(errorMsg);
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
            fid: user.fid || null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Authentication failed, /api/me response:', errorText);
          throw new Error(`Authentication failed: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Authentication response:', data);
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('wallet_address', data.address);
        localStorage.setItem('tier', data.tier);
        localStorage.setItem('subscription', JSON.stringify(data.subscription));

        onFarcasterReady?.({
          fid: data.fid || null,
          username: data.username || 'unknown',
          address: data.address,
          token: data.token,
          tier: data.tier,
          subscription: data.subscription,
          referrerDomain: locationContext.referrerDomain || null,
          clientFid: locationContext.client?.clientFid || null,
          platformType: locationContext.client?.platformType || 'unknown',
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
        <div>
          {error}
          <br />
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            Retry
          </button>
          <br />
          <a
            href="https://warpcast.com"
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
              marginTop: 12,
              display: 'inline-block',
            }}
          >
            Open in Warpcast
          </a>
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