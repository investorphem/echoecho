import { useEffect } from 'react';

// Dynamically import the Farcaster SDK to avoid SSR issues
const loadFarcasterSDK = () => import('@farcaster/miniapp-sdk');

export default function MiniAppComponent({ walletConnected, walletAddress, onMiniAppReady, onFarcasterReady }) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    // Farcaster environment detection
    const isFarcasterClient = typeof window !== 'undefined' && (
      window.location.hostname.includes('warpcast.com') ||
      window.location.hostname.includes('client.warpcast.com') ||
      window.location.hostname.includes('localhost') ||
      new URLSearchParams(window.location.search).get('miniApp') === 'true' ||
      window.location.pathname.includes('/miniapp') ||
      window.farcaster ||
      navigator.userAgent.includes('Farcaster') ||
      new URLSearchParams(window.location.search).get('farcaster') === 'true'
    );

    console.log('MiniAppComponent: Farcaster Detection Details:', {
      isFarcasterClient,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      searchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
      hasFarcasterWindow: !!window.farcaster,
      userAgent: navigator.userAgent,
    });

    if (isFarcasterClient) {
      console.log('MiniAppComponent: Detected Farcaster client, initializing SDK...');
      loadFarcasterSDK()
        .then(({ sdk }) => {
          console.log('MiniAppComponent: Farcaster SDK loaded');
          return sdk.actions.ready().catch((error) => {
            console.warn('MiniAppComponent: sdk.actions.ready failed, proceeding anyway:', error.message);
            return Promise.resolve(); // Continue despite failure
          });
        })
        .then(() => {
          console.log('MiniAppComponent: Farcaster Mini App ready');
          onMiniAppReady(); // Signal UI can render
          return loadFarcasterSDK().then(({ sdk }) => sdk.user.getAsync());
        })
        .then((user) => {
          console.log('MiniAppComponent: Farcaster User FID:', user.fid);
          onFarcasterReady?.(user.fid); // Pass FID to parent
        })
        .catch((error) => {
          console.error('MiniAppComponent: Farcaster SDK error:', error.message);
          onMiniAppReady(); // Proceed to UI
          onFarcasterReady?.(null); // Signal Farcaster failure
        });
    } else {
      console.log('MiniAppComponent: Non-Farcaster environment, skipping SDK');
      if (walletConnected && walletAddress) {
        console.log('MiniAppComponent: Wallet connected via Wagmi:', walletAddress);
      } else {
        console.warn('MiniAppComponent: No wallet connected via Wagmi');
      }
      onMiniAppReady(); // Proceed to UI
      onFarcasterReady?.(null); // Signal no Farcaster context
    }
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  return null; // No UI rendering
}