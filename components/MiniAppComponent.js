// components/MiniAppComponent.js
import { useEffect, useState } from "react";

// Only load SDK when needed
const loadFarcasterSDK = async () => {
  try {
    const mod = await import("@farcaster/miniapp-sdk");

    console.log("MiniAppComponent: SDK module loaded:", mod);

    // Normalize possible export shapes
    if (mod.sdk) return mod.sdk;
    if (mod.default?.sdk) return mod.default.sdk;
    if (typeof mod.default === "object" && mod.default.actions) return mod.default;

    throw new Error("Unsupported SDK export shape");
  } catch (err) {
    console.error("MiniAppComponent: Failed to load SDK:", err);
    return null;
  }
};

export default function MiniAppComponent({
  walletConnected,
  walletAddress,
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [isFarcasterClient, setIsFarcasterClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("MiniAppComponent: Initializing...");

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.log("MiniAppComponent: Running on server — skipping detection.");
      return;
    }

    // Detect Farcaster environment
    const urlParams = new URLSearchParams(window.location.search);
    const detected =
      window.location.hostname.includes("warpcast.com") ||
      window.location.hostname.includes("client.warpcast.com") ||
      !!window.farcaster ||
      navigator.userAgent.includes("Farcaster") ||
      urlParams.get("farcaster") === "true";

    setIsFarcasterClient(detected);

    if (!detected) {
      console.log("MiniAppComponent: Browser detected, skipping SDK load");
      setLoading(false);
      onMiniAppReady?.();
      onFarcasterReady?.(null);
      return;
    }

    console.log("MiniAppComponent: Farcaster client detected → loading SDK");

    loadFarcasterSDK()
      .then(async (sdk) => {
        if (!sdk) throw new Error("SDK not available");

        await sdk.actions?.ready?.();

        try {
          const token = await sdk.quickAuth?.getToken?.();
          if (token) {
            const response = await fetch("/api/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const user = await response.json();
              onFarcasterReady?.(user.fid);
            } else {
              onFarcasterReady?.(sdk.context?.user?.fid ?? null);
            }
          } else {
            onFarcasterReady?.(sdk.context?.user?.fid ?? null);
          }
        } catch (err) {
          console.error("MiniAppComponent: Auth error:", err.message);
          onFarcasterReady?.(sdk.context?.user?.fid ?? null);
        }

        setLoading(false);
        onMiniAppReady?.();
      })
      .catch((err) => {
        console.error("MiniAppComponent: SDK init failed:", err.message);
        setLoading(false);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      });
  }, [walletConnected, walletAddress, onMiniAppReady, onFarcasterReady]);

  // 🚩 Browser fallback
  if (isFarcasterClient === false) {
    return (
      <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#111827", color: "#f9fafb" }}>
        <h2>Open in Farcaster</h2>
        <p>This mini app is designed for Farcaster (Warpcast, Base App, or farcaster.xyz).</p>
        <p>You’re currently viewing it in a regular browser.</p>
      </div>
    );
  }

  // 🚩 Loading spinner
  if (loading && isFarcasterClient) {
    return (
      <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#111827", color: "#f9fafb" }}>
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f9fafb",
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              margin: "0 auto",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
        <h2>Initializing Farcaster SDK...</h2>
        <p>Please wait while we connect your wallet.</p>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}