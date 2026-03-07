import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>

        {/* Primary Meta */
        <meta charSet="ut-8" /
        <meta name="application-name" content="EchoEcho" />
        <meta
          name="description"
          content="Brek echo chambers with AI-powered conenraiv discovery. Find divere prsives rm Farcater, Twitter/X, and nwsoures int NFT Insight Tokens nd an rwards!
        />
        <meta
          name="keywords"
          content="Farcaster, AI,echo chamber, counter-narrative, social media, blockchain, NFT, USDC, Ba network"
        />

        {/* Talent Protocol Domain Verification */}
        <meta
          name="talentapp:project_verification"
          content="e7a8736fe16966aab9a32ce46cd66e10a386f7493096bc5c58569cb56aea2818a0a0c452832e9c5fcf3c064baadf477c729e48c663fbc1c585f6ccc3e9bd400a"
        />

        {/* Open Graph */}
        <meta property="og:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta
          property="og:description"
          content="Break echo chambers with AI-powered counter-narrative discovery. Find diverse perspectives from Farcaster, Twitter/X, and news sources. Mint NFT Insight Tokens and earn rewards!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://echoechos.vercel.app/preview.png" />
        <meta property="og:url" content="https://echoechos.vercel.app/" />
        <meta property="og:site_name" content="EchoEcho" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta
          name="twitter:description"
          content="Break echo chambers with AI-powered counter-narrative discovery. Subscribe for premium features with USDC on Base network."
        />
        <meta name="twitter:image" content="https://echoechos.vercel.app/preview.png" />

        {/* Farcaster Mini App */}
        <meta
          name="fc:miniapp"
          content={JSON.stringify({
            version: "1",
            id: process.env.FARCASTER_MINIAPP_ID || "0199409c-b991-9a61-b1d8-fef2086f7533",
            imageUrl: "https://echoechos.vercel.app/preview.png",
            button: {
              title: "Open EchoEcho",
              action: {
                type: "launch_frame",
                name: "EchoEcho",
                url: "https://echoechos.vercel.app/",
                splashImageUrl: "https://echoechos.vercel.app/splash-200.png",
                splashBackgroundColor: "#111827",
              },
            },
            buttons: [
              {
                label: "Echo Trend",
                action: { type: "post", url: "https://echoechos.vercel.app/api/echo" },
              },
              {
                label: "Mint NFT",
                action: { type: "post", url: "https://echoechos.vercel.app/api/mint-nft" },
              },
            ],
          })}
        />

        {/* Backward Compatibility */}
        <meta
          name="fc:frame"
          content={JSON.stringify({
            version: "1",
            id: process.env.FARCASTER_MINIAPP_ID || "0199409c-b991-9a61-b1d8-fef2086f7533",
            imageUrl: "https://echoechos.vercel.app/preview.png",
            button: {
              title: "Open EchoEcho",
              action: {
                type: "launch_frame",
                name: "EchoEcho",
                url: "https://echoechos.vercel.app/",
                splashImageUrl: "https://echoechos.vercel.app/splash-200.png",
                splashBackgroundColor: "#111827",
              },
            },
            buttons: [
              {
                label: "Echo Trend",
                action: { type: "post", url: "https://echoechos.vercel.app/api/echo" },
              },
              {
                label: "Mint NFT",
                action: { type: "post", url: "https://echoechos.vercel.app/api/mint-nft" },
              },
            ],
          })}
        />

        {/* Content Security Policy */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' https://esm.sh; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.base.org https://*.neynar.com https://*.openai.com https://echoechos.vercel.app; img-src 'self' data: https://echoechos.vercel.app;"
        />

        {/* Icons */}
        <link rel="icon" href="https://echoechos.vercel.app/icon-192.png" />
        <link rel="apple-touch-icon" href="https://echoechos.vercel.app/icon-192.png" />

        {/* Performance */}
        <link rel="preconnect" href="https://mainnet.base.org" />
        <link rel="preconnect" href="https://api.neynar.com" />
        <link rel="preconnect" href="https://api.openai.com" />

      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}