import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({ walletConnected, walletAddress, onMiniAppReady }) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    // Detect if running in a Farcaster client (e.g., Warpcast)
    const isFarcasterClient = typeof window !== 'undefined' && window.location.hostname.includes('warpcast.com');

    if (isFarcasterClient) {
      console.log('Detected Farcaster client, initializing SDK...');
      try {
        // Signal app readiness for Farcaster client
        sdk.actions.ready()
          .then(() => {
            console.log('Farcaster Mini App ready');
            // Get user info if available
            sdk.user.getAsync()
              .then((user) => console.log('Farcaster User FID:', user.fid))
              .catch((error) => console.warn('Failed to get Farcaster user:', error.message));
          })
          .catch((error) => {
            console.error('Farcaster SDK ready failed:', error.message);
            onMiniAppReady(); // Proceed to UI
          });
      } catch (error) {
        console.error('Farcaster SDK initialization failed:', error.message);
        onMiniAppReady(); // Proceed to UI
      }
    } else {
      console.log('Non-Farcaster environment (browser), skipping SDK');
      // Rely on wagmi for wallet connection
      if (walletConnected && walletAddress) {
        console.log('Wallet connected via Wagmi:', walletAddress);
      } else {
        console.warn('No wallet connected via Wagmi');
      }
      onMiniAppReady(); // Proceed to UI
    }
  }, [walletConnected, walletAddress, onMiniAppReady]);

  return null; // No UI rendering
}
