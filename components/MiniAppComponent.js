import { useEffect } from 'react';

// Dynamically import the Farcaster SDK to avoid SSR issues
const loadFarcasterSDK = () => import('@farcaster/miniapp-sdk');

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.log('MiniAppComponent: Running on server (SSR) — skipping Farcaster detection.');
      return;
    }

    // ✅ Safe Farcaster environment detection
    const urlParams = new URLSearchParams(window.location.search);
    const isFarcasterClient =
      window.location.hostname.includes('warpcast.com') ||
      window.location.hostname.includes('client.warpcast.com') ||
      window.location.hostname.includes('localhost') ||
      urlParams.get('miniApp') === 'true' ||
      window.location.pathname.includes('/miniapp') ||
      !!window.farcaster ||
      navigator.userAgent.includes('Farcaster') ||
      urlParams.get('farcaster') === 'true';

    console.log('MiniAppComponent: Farcaster Detection Details:', {
      isFarcasterClient,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      searchParams: Object.fromEntries(urlParams),
      hasFarcasterWindow: !!window.farcaster,
      userAgent: navigator.userAgent,
    });

    if (!isFarcasterClient) {
      console.log('MiniAppComponent: Non-Farcaster environment detected');
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
          .then(() => sdk); // ✅ forward sdk to next then
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

        onMiniAppReady?.();
      })
      .catch((error) => {
        console.error('MiniAppComponent: Farcaster SDK error:', error.message);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      });
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  return null; // No UI rendering
}