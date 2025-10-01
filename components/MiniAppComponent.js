"use client";
import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function MiniAppComponent({ 
  walletConnected, 
  walletAddress, 
  onMiniAppReady, 
  onFarcasterReady 
}) {
  useEffect(() => {
    let cancelled = false;

    async function initMiniApp() {
      console.log("MiniAppComponent: Starting initialization...");

      try {
        // Signal SDK ready
        await sdk.actions.ready().catch((err) => {
          console.warn("MiniAppComponent: sdk.actions.ready failed, continuing:", err.message);
        });

        console.log("MiniAppComponent: SDK is ready");

        // Try QuickAuth first
        try {
          const token = await sdk.quickAuth.getToken();
          console.log("MiniAppComponent: QuickAuth token:", token);

          // Fetch user data from backend
          const res = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!cancelled) {
            if (res.ok) {
              const user = await res.json();
              console.log("MiniAppComponent: User from backend:", user);
              onFarcasterReady?.(user.fid);
            } else {
              console.warn("MiniAppComponent: Backend fetch failed, fallback to sdk.context.user");
              const contextUser = sdk.context?.user;
              if (contextUser?.fid) {
                onFarcasterReady?.(contextUser.fid);
              } else {
                onFarcasterReady?.(null);
              }
            }
          }
        } catch (authErr) {
          console.error("MiniAppComponent: QuickAuth failed:", authErr.message);
          const contextUser = sdk.context?.user;
          if (!cancelled) {
            if (contextUser?.fid) {
              onFarcasterReady?.(contextUser.fid);
            } else {
              onFarcasterReady?.(null);
            }
          }
        }

        if (!cancelled) {
          onMiniAppReady?.(); // signal parent that UI can render
        }
      } catch (err) {
        console.error("MiniAppComponent: Fatal error:", err);
        if (!cancelled) {
          onMiniAppReady?.();
          onFarcasterReady?.(null);
        }
      }
    }

    initMiniApp();

    return () => {
      cancelled = true;
    };
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  return null; // no UI directly
}