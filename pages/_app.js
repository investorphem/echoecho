"use client";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { sdk } from "@farcaster/miniapp-sdk";

// ✅ Wagmi config with Farcaster connector
const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
  },
});

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detectEnvironment() {
      try {
        const result = await sdk.isInMiniApp({ timeoutMs: 200 });
        if (!cancelled) {
          setIsMiniApp(result);
          setChecked(true);

          if (result) {
            console.log("✅ Running inside Farcaster MiniApp");

            const connector = farcasterMiniApp();

            // Listen for SDK events
            connector.on("ready", () => {
              console.log("Farcaster SDK ready!");
              setSdkReady(true);
            });

            connector.on("connect", () => {
              console.log("Wallet connected!");
              setWalletConnected(true);
            });

            connector.on("error", (err) => {
              console.error("SDK error:", err);
            });
          } else {
            console.warn("🌍 Not running in Farcaster MiniApp");
          }
        }
      } catch (err) {
        console.error("MiniApp detection failed:", err);
        setChecked(true);
      }
    }

    detectEnvironment();
    return () => {
      cancelled = true;
    };
  }, []);

  // While detecting environment
  if (!checked) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h2>Detecting environment...</h2>
      </div>
    );
  }

  // If not in MiniApp
  if (!isMiniApp) {
    return (
      <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#111827", color: "#f9fafb" }}>
        <h2>Open in Farcaster</h2>
        <p>This app works best inside Base app, warpcast.com, or farcaster.xyz.</p>
      </div>
    );
  }

  // Inside MiniApp → render app
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {sdkReady && walletConnected ? (
          <Component {...pageProps} />
        ) : (
          <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#111827", color: "#f9fafb" }}>
            <h2>Initializing Farcaster SDK...</h2>
            <p>Please connect your wallet in the Farcaster client.</p>
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}