// components/MiniAppComponent.js
'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiConfig, useAccount, useConnect, useSignMessage } from 'wagmi';
import { wagmiConfig } from '../wagmi';

function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, address } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const pollForLocationContext = async (maxAttempts = 3, baseDelay = 2000, timeoutMs = 8000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling for location context, attempt ${attempt}/${maxAttempts}...`);
        const context = await Promise.race([
          sdk.getLocationContext({ timeoutMs: 5000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Context fetch timeout')), timeoutMs)),
        ]);
        console.log('sdk.getLocationContext() response:', JSON.stringify(context, null, 2));
        if (context?.type === 'open_miniapp') {
          console.log('OpenMiniAppLocationContext detected:', {
            referrerDomain: context.referrerDomain,
            clientFid: context.client?.clientFid,
            platformType: context.client?.platformType,
            added: context.client?.added,
          });
          return context;
        }
        console.log('Not in OpenMiniAppLocationContext, checking isInMiniApp...');
        const isMiniApp = await Promise.race([
          sdk.isInMiniApp({ timeoutMs: 5000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('isInMiniApp timeout')), timeoutMs)),
        ]);
        console.log('sdk.isInMiniApp() response:', isMiniApp);
        return { type: 'standard', isMiniApp, client: { clientFid: null, platformType: 'unknown', added: false } };
      } catch (err) {
        console.error(`Attempt ${attempt}: Error checking location context:`, err.message);
        if (attempt === maxAttempts) {
          console.warn('Max attempts reached for location context');
          return { type: 'unknown', isMiniApp: false, client: { clientFid: null, platformType: 'unknown', added: false } };
        }
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const pollForUser = async (wagmiAddress, maxAttempts = 3, baseDelay = 2000, timeoutMs = 8000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling for user data, attempt ${attempt}/${maxAttempts}...`);
        const user = await Promise.race([
          sdk.getUser(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('User fetch timeout')), timeoutMs)),
        ]);
        console.log('sdk.getUser() response:', JSON.stringify(user, null, 2));
        if (user && user.address) {
          return user;
        }
        console.log(`Attempt ${attempt}: Invalid user data (fid: ${user?.fid}, address: ${user?.address})`);
        if (attempt === maxAttempts) {
          console.warn('Max attempts reached for user data');
          break;
        }
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (userErr) {
        console.error(`Attempt ${attempt}: Error fetching user:`, userErr.message);
      }
    }
    if (wagmiAddress) {
      console.log('Falling back to wagmi address:', wagmiAddress);
      return { address: wagmiAddress, username: 'wagmi_user', fid: null };
    }
    const cachedAddress = localStorage.getItem('wallet_address');
    if (cachedAddress) {
      console.log('Using cached address:', cachedAddress);
      return { address: cachedAddress, username: 'cached_user', fid: null };
    }
    console.warn('No user data or fallback address available');
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
          const errorMsg = 'Not running in a Farcaster client or Mini App. Please open in Warpcast or Base App.';
          console.error(errorMsg);
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }

        // Validate clientFid for Warpcast (9152) or Base App
        if (locationContext.type === 'open_miniapp' && locationContext.client?.clientFid !== 9152) {
          console.warn('Unexpected clientFid:', locationContext.client?.clientFid);
        }

        // Signal SDK ready
        try {
          await sdk.actions.ready();
          console.log('Farcaster SDK signaled ready');
        } catch (err) {
          console.error('SDK ready error:', err);
          setError(`Failed to signal SDK ready: ${err.message}`);
          return;
        }

        // Connect wallet if not connected
        if (!isConnected && connectors[0] && !isConnecting) {
          console.log('Attempting wallet connection via connector:', connectors[0]?.name || 'unknown');
          try {
            connect({ connector: connectors[0] });
          } catch (connectErr) {
            console.error('Wallet connection error:', connectErr);
            setError(`Wallet connection failed: ${connectErr.message}. Please ensure your wallet is verified in Warpcast or Base App.`);
            return;
          }
        }

        // Wait for wallet connection
        if (!isConnected || !address) {
          const errorMsg = 'Wallet not connected. Please connect your wallet in Warpcast or Base App.';
          console.error(errorMsg);
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }

        // Poll for user data
        const user = await pollForUser(address);
        if (!user || !user.address) {
          const errorMsg = 'Failed to fetch user data: Missing wallet address. Please verify your wallet in Warpcast or Base App.';
          console.error(errorMsg);
          setError(errorMsg);
          onMiniAppReady?.();
          onFarcasterReady?.({ error: errorMsg });
          return;
        }
        console.log('User data retrieved:', user);

        // Verify wallet address
        if (address.toLowerCase() !== user.address.toLowerCase()) {
          const errorMsg = `Wallet address mismatch: Connected ${address}, Farcaster ${user.address}`;
          console.error(errorMsg);
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
          console.log('Signing message:', message);
          signature = await signMessageAsync({ message });
          console.log('Message signed successfully');
        } catch (signErr) {
          const errorMsg = signErr.message.includes('rejected')
            ? 'Authentication failed: User rejected the signature request'
            : `Authentication failed: ${signErr.message}`;
          console.error(errorMsg, signErr);
          setError(errorMsg);
          return;
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
          setError(`Authentication failed: HTTP ${response.status} - ${errorText}`);
          return;
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
        console.error('MiniAppComponent initialization error:', err);
        setError(`Initialization error: ${err.message}`);
        onMiniAppReady?.();
        onFarcasterReady?.({ error: err.message });
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [isConnected, address, connect, connectors, isConnecting, signMessageAsync, onMiniAppReady, onFarcasterReady]);

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
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#ef4444',
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <div>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 12,
              fontSize: 14,
            }}
          >
            Retry
          </button>
          {error.includes('Wallet not connected') && connectors[0] && (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isConnecting}
              style={{
                background: isConnecting ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                marginTop: 12,
                fontSize: 14,
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          <div style={{ marginTop: 12 }}>
            <p>Please open in a Farcaster client:</p>
            <a
              href="https://warpcast.com/~/apps/echoecho"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                marginRight: 12,
                fontSize: 14,
              }}
            >
              Open in Warpcast
            </a>
            <a
              href="https://wallet.coinbase.com/base-app"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                fontSize: 14,
              }}
            >
              Open in Base App
            </a>
          </div>
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
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#f9fafb',
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div>Loading EchoEcho...</div>
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

export default function WrappedMiniAppComponent(props) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <MiniAppComponent {...props} />
    </WagmiConfig>
  );
}