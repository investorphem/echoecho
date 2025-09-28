import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  useEffect(() => {
    console.log('MiniAppComponent: Initializing...');

    // Use the official SDK property for a reliable check.
    const isFarcasterEnvironment = sdk.isMiniApp;

    if (isFarcasterEnvironment) {
      console.log('Detected Farcaster environment, initializing SDK...');
      sdk.actions.ready()
        .then(() => {
          console.log('Farcaster Mini App is ready');
          onMiniAppReady();
          onFarcasterReady?.();
          sdk.user.getAsync()
            .then((user) => {
              console.log('Farcaster User FID:', user.fid);
            })
            .catch((error) => {
              console.warn('Failed to get Farcaster user:', error);
            });
        })
        .catch((error) => {
          console.error('Farcaster SDK ready failed:', error);
          onMiniAppReady(); // Allow UI to load even if SDK fails
        });
    } else {
      console.log('Non-Farcaster environment detected (e.g., browser). Skipping SDK.');
      onMiniAppReady(); // Allow UI to load for non-Farcaster environments
    }
  }, [onMiniAppReady, onFarcasterReady]);

  return null; // This component handles initialization and doesn't render anything itself.
}
