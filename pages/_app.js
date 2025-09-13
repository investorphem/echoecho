import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    sdk.actions.ready(); // Notify Farcaster that your app is ready
  }, []);

  return <Component {...pageProps} />;
}
