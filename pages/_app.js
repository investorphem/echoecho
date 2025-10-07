import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useAccount } from "wagmi";
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

function AppContent({ Component, pageProps }) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [fid, setFid] = useState(null);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const miniApp = await sdk.isInMiniApp();
        setIsMiniApp(miniApp);
      } catch (err) {
        setIsMiniApp(false);
      }
    };
    checkMiniApp();
  }, []);

  useEffect(() => {
    setWalletConnected(isConnected);
    setWalletAddress(address || null);
  }, [isConnected, address]);

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
    <>
      <MiniAppComponent
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onMiniAppReady={() => setSdkReady(true)}
        onFarcasterReady={(data) => {
          setFid(data.fid);
          setWalletAddress(data.address || walletAddress);
        }}
      />
      {sdkReady && walletConnected ? (
        <Component {...pageProps} fid={fid} walletAddress={walletAddress} />
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
    </>
  );
}

export default function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent Component={Component} pageProps={pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}