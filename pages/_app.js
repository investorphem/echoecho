import { useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Notify Farcaster miniapp shell that your app is ready
    sdk.actions.ready();
  }, []);

  return <Component {...pageProps} />;
}
