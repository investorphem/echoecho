// components/MiniAppComponent.js
import { useEffect } from 'react';

export default function MiniAppComponent({ walletConnected, walletAddress, onMiniAppReady }) {
  useEffect(() => {
    if (walletConnected && walletAddress) {
      console.log('Farcaster MiniApp logic would run here for address:', walletAddress);
      // Placeholder for Farcaster SDK integration
      // Example: sdk.actions.addMiniApp() or fetch("/api/update-notification-token")
      onMiniAppReady(); // Signal splash screen to transition
    } else {
      onMiniAppReady(); // No wallet, proceed to main UI
    }
  }, [walletConnected, walletAddress, onMiniAppReady]);

  return null; // This component doesn't render anything
}
