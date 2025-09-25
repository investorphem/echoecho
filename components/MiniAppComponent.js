import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({ walletConnected, walletAddress, onMiniAppReady, onFarcasterReady }) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    // Detect if running in a Farcaster client (e.g., Warpcast)
    const isFarcasterClient = typeof window !== 'undefined' && window.location.hostname.includes('warpcast.com');

    if (isFarcasterClient) {
      console.log('Detected Farcaster client, initializing SDK...');
      try {
        sdk.actions.ready()
          .then(() => {
            console.log('Farcaster Mini App ready');
            onMiniAppReady(); // Signal UI can render
            onFarcasterReady?.(); // Signal Farcaster-specific setup
            sdk.user.getAsync()
              .then((user) => {
                console.log('Farcaster User FID:', user.fid);
                // Optionally pass FID or mock address to parent via onFarcasterReady
                const mockAddress = `0x${user.fid.toString(16).padStart(40, '0')}`;
                console.log('Farcaster mock address:', mockAddress);
              })
              .catch((error) => {
                console.warn('Failed to get Farcaster user:', error.message);
                onMiniAppReady(); // Proceed anyway
              });
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
      if (walletConnected && walletAddress) {
        console.log('Wallet connected via Wagmi:', walletAddress);
      } else {
        console.warn('No wallet connected via Wagmi');
      }
      onMiniAppReady(); // Proceed to UI
    }
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  return null; // No UI rendering
}