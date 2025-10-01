import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  useEffect(() => {
    console.log("MiniAppComponent: Initializing...");

    const init = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        console.log("MiniAppComponent: isInMiniApp =", isMiniApp);

        if (!isMiniApp) {
          console.log("MiniAppComponent: Not running in Farcaster");
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Signal ready
        try {
          await sdk.actions.ready();
          console.log("MiniAppComponent: SDK ready");
        } catch (err) {
          console.warn("MiniAppComponent: sdk.actions.ready failed:", err);
        }

        // QuickAuth → backend → FID
        try {
          const token = await sdk.quickAuth.getToken();
          console.log("MiniAppComponent: QuickAuth token:", token);

          const response = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const user = await response.json();
            console.log("MiniAppComponent: User via API:", user);
            onFarcasterReady?.(user.fid);
          } else {
            const contextUser = sdk.context.user;
            if (contextUser?.fid) {
              console.log("MiniAppComponent: User via context:", contextUser);
              onFarcasterReady?.(contextUser.fid);
            } else {
              console.error("MiniAppComponent: No FID available");
              onFarcasterReady?.(null);
            }
          }
        } catch (error) {
          console.error("MiniAppComponent: QuickAuth error:", error);
          const contextUser = sdk.context.user;
          if (contextUser?.fid) {
            console.log("MiniAppComponent: User via context:", contextUser);
            onFarcasterReady?.(contextUser.fid);
          } else {
            onFarcasterReady?.(null);
          }
        }

        // Signal UI ready
        onMiniAppReady?.();
      } catch (err) {
        console.error("MiniAppComponent: Fatal error:", err);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      }
    };

    init();
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  return null;
}