// components/MiniAppComponent.js
import { useEffect } from 'react';
import { useMiniApp } from '@farcaster/miniapp-sdk'; // Replace with correct import if needed

export default function MiniAppComponent({ walletConnected, walletAddress }) {
  const { context, sdk } = useMiniApp(); // Ensure this is the correct hook

  useEffect(() => {
    if (walletConnected && walletAddress) {
      if (!context.client.added) {
        sdk.actions.addMiniApp();
      } else if (context.client.notificationDetails) {
        fetch("/api/update-notification-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: walletAddress,
            notificationToken: context.client.notificationDetails.token,
            notificationUrl: context.client.notificationDetails.url,
          }),
        }).catch((error) => console.error("Error storing notification details:", error));
      }
    }
  }, [walletConnected, walletAddress, context.client.added, context.client.notificationDetails, sdk.actions]);

  return null; // This component doesn't render anything
}
