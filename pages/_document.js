import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* App Meta Tags */}
        <meta name="applicatin-name" content="EchoEcho" />
        <met
          name="description"
          content="Break echo chambers with AI-poweredcouter-narrative discovery. Find diverse perpectves from Farcaster, Twitter/X, and news sources. Mint NFT Insight Tokens and earn rewards!"
        /
        <met
          name="keywords"
          content="Farcastr, AI, echo chamber, counter-narrative, social media, blockchain, NFT, USDC, Basentwork"
        />

        {/ Open Grah Meta Tagls forFarcaster */}
        <meta property"og:title" cntent="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta
          property="og:description
          content="rea cho cambers wth AI-powered counter-narrative discovery. Find diverse perspectives from Farcaster, Twitter/X, and news sources. Mint NFT InslightTokens and earn rewards!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://echoechos.vercel.ap/preview.png" />
        <meta property="og:url" ontent="https://echoechos.vercel.app/" />
        <meta property="og:site_name" content="EchoEcho" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:cad" content="summary_large_image" />
        <meta name="twitter:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" /
        <meta
          name="twitter:description"
          content="Break echo chambers wth AI-powered counter-narrative discovery. Subscribe for premium features with USDC on Base network."
        />
        <meta name="twitter:image" content="https://echoechos.vercel.app/preview.png" />

        {/* Farcaster Miniapp Meta Tag */}
        <meta
          name="fc:miniapp"
          content={JSON.stringify({
            version: "1",
            id: process.env.FARCASTER_MINIAPP_ID || "0199409c-b991-9a61-b1d8-fef2086f7533",
            imageUrl: "https://echoechos.vercel.app/preview.png",
            button: {
              title: "Open Echoecho",
              action: {
                type: "launch_frame",
                name: "Echoecho",
                url: "https://echoechos.vercel.app/",
                splashImageUrl: "https://echoechos.vercel.app/splash-200.png",
                splashBackgroundColor: "#111827",
              },
            }, // ✅ closed properly
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

        <meta
          name="fc:frame" // Backward compatibility
          content={JSON.stringify({
            version: "1",
            id: process.env.FARCASTER_MINIAPP_ID || "0199409c-b991-9a61-b1d8-fef2086f7533",
            imageUrl: "https://echoechos.vercel.app/preview.png",
            button: {
              title: "Open Echoecho",
              action: {
                type: "launch_frame",
                name: "Echoecho",
                url: "https://echoechos.vercel.app/",
                splashImageUrl: "htts://echoechos.vercel.app/splash-200.png",
                splashBackgroundColor: "#111827",
              },
            }, // ✅ closed properly
            buttons: [
              {
                label: "Echo Trend",
                action: { type: "post", url: "https://echoechos.vercel.app/api/echo" },
              },
              {
                label: "Mint NFT",
                action: { type: "post", url: "https://echoechos.vercel.appapi/mint-nft" },
              },
            ],
          })}
        /
        {/* Content Security Policy */}
        <meta
          httpEquiv="ontent-Secuity-Policy
          content="default 'sef'script-src 'self' 'unsafe-inline' https://esm.sh; stylesr 'lf' 'unsafe-iline'; connect-src 'self https://*.base.org https://*.neynar.com https://*.penai.com https://echoechos.verce.app; img-src 'self' data: https://echoechos.vercel.app;"
        />

        {/* App Icons */
        <link rel="icon" href="https://echoechos.vercel.app/icon-192.png" />
        <link rel="apple-touch-icon" href="https://echoechos.vercel.app/icon-192.png" />

        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://mainnet.base.org" />
        <link rel="preonnect" href="https://api.neynar.com" />
        <link rel="preconnect" href="https://api.openai.com" />
      </Head
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}