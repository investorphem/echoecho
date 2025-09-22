// components/MiniAppComponent.js
import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({ walletConnected, walletAddress, onMiniAppReady }) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing Farcaster SDK...');
    sdk.connectAsync()
      .then(async () => {
        // Get user info (e.g., FID)
        const user = await sdk.user.getAsync();
        console.log('Farcaster User FID:', user.fid);

        // Signal app readiness (critical for wallet and UI)
        await sdk.actions.ready();
        console.log('Farcaster Mini App ready');

        // Check wallet status via SDK
        if (sdk.wallet.isConnected()) {
          const address = sdk.wallet.address();
          console.log('Farcaster Wallet connected:', address);
          if (walletConnected && walletAddress && walletAddress.toLowerCase() === address.toLowerCase()) {
            console.log('Wallet matches Farcaster SDK address');
          } else {
            console.warn('Wallet mismatch or not connected via Wagmi');
          }
        } else {
          console.warn('No wallet connected via Farcaster SDK');
        }

        // Signal UI transition
        onMiniAppReady();
      })
      .catch((error) => {
        console.error('Farcaster SDK initialization failed:', error);
        // Proceed to UI even if SDK fails to avoid infinite loading
        onMiniAppReady();
      });
  }, [walletConnected, walletAddress, onMiniAppReady]);

  return null; // No UI rendering
}
