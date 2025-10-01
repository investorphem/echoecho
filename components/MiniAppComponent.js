import { useEffect, useState } from 'react';

// Dynamically import the Farcaster SDK to avoid SSR issues
const loadFarcasterSDK = () => import('@farcaster/miniapp-sdk');

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [isFarcasterClient, setIsFarcasterClient] = useState(null); // null = not detected yet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.log('MiniAppComponent: Running on server (SSR) — skipping Farcaster detection.');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const detected =
      window.location.hostname.includes('warpcast.com') ||
      window.location.hostname.includes('client.warpcast.com') ||
      window.location.hostname.includes('localhost') ||
      urlParams.get('miniApp') === 'true' ||
      window.location.pathname.includes('/miniapp') ||
      !!window.farcaster ||
      navigator.userAgent.includes('Farcaster') ||
      urlParams.get('farcaster') === 'true';

    setIsFarcasterClient(detected);

    if (!detected) {
      console.log('MiniAppComponent: Non-Farcaster environment detected');
      setLoading(false);
      onMiniAppReady?.();
      onFarcasterReady?.(null);
      return;
    }

    console.log('MiniAppComponent: Detected Farcaster client, initializing SDK...');
    loadFarcasterSDK()
      .then((mod) => {
        const sdk = mod.sdk;
        console.log('MiniAppComponent: Farcaster SDK loaded');
        return sdk.actions
          .ready()
          .catch((error) => {
            console.warn('MiniAppComponent: sdk.actions.ready failed, proceeding anyway:', error.message);
          })
          .then(() => sdk); // ✅ forward sdk
      })
      .then(async (sdk) => {
        if (!sdk) throw new Error('SDK not available');
        console.log('MiniAppComponent: Farcaster Mini App ready');

        try {
          const token = await sdk.quickAuth.getToken();
          console.log('MiniAppComponent: Quick Auth token retrieved:', token);

          const response = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const user = await response.json();
            console.log('MiniAppComponent: Farcaster User via Quick Auth:', user);
            onFarcasterReady?.(user.fid);
          } else {
            console.warn('MiniAppComponent: /api/me fetch failed, falling back to sdk.context.user');
            onFarcasterReady?.(sdk.context.user?.fid ?? null);
          }
        } catch (error) {
          console.error('MiniAppComponent: Quick Auth error:', error.message);
          onFarcasterReady?.(sdk.context.user?.fid ?? null);
        }

        setLoading(false);
        onMiniAppReady?.();
      })
      .catch((error) => {
        console.error('MiniAppComponent: Farcaster SDK error:', error.message);
        setLoading(false);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      });
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  // 🚩 Non-Farcaster fallback
  if (isFarcasterClient === false) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
        <h2>Open in Farcaster</h2>
        <p>This mini app is designed to run inside Farcaster (Warpcast, Base App, or farcaster.xyz).</p>
        <p>You’re currently viewing it in a regular browser.</p>
      </div>
    );
  }

  // 🚩 Loading state while SDK initializes
  if (loading && isFarcasterClient) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#111827', color: '#f9fafb' }}>
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f9fafb',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
        <h2>Initializing Farcaster SDK...</h2>
        <p>Please wait while we connect your wallet.</p>

        {/* Inline spinner animation */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return null; // 🚩 Once ready, no UI — parent handles rendering
}