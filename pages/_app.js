import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { sdk } from "@farcaster/miniapp-sdk";

import MiniAppComponent from "../components/MiniAppComponent";

// Wagmi config with Farcaster connector
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
  const [fid, setFid] = useState(null); // Farcaster User FID

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const miniApp = await sdk.isInMiniApp();
        setIsMiniApp(miniApp);
      } catch (err) {
        console.error("MiniApp detection failed:", err);
        setIsMiniApp(false);
      }
    };
    checkMiniApp();
  }, []);

  // Fallback UI if not inside MiniApp
  if (!isMiniApp) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          backgroundColor: "#111827",
          color: "#f9fafb",
        }}
      >
        <h2>Open in Farcaster</h2>
        <p>This app works best in the Base app, warpcast.com, or farcaster.xyz.</p>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* ✅ MiniApp logic runs here */}
        <MiniAppComponent
          walletConnected={walletConnected}
          walletAddress={null} // replace with wagmi hook later if needed
          onMiniAppReady={() => setSdkReady(true)}
          onFarcasterReady={(fid) => {
            console.log("Farcaster user FID:", fid);
            setFid(fid);
          }}
        />

        {sdkReady && walletConnected ? (
          <Component {...pageProps} fid={fid} />
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              backgroundColor: "#111827",
              color: "#f9fafb",
            }}
          >
            <h2>Initializing Farcaster SDK...</h2>
            <p>Please connect your wallet in the Farcaster client.</p>
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}