import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* App Meta Tags */}
        <meta name="application-name" content="EchoEcho" />
        <meta name="description" content="Break echo chambers with AI-powered counter-narrative discovery. Find diverse perspectives from Farcaster, Twitter/X, and news sources. Mint NFT Insight Tokens and earn rewards!" />
        <meta name="keywords" content="Farcaster, AI, echo chamber, counter-narrative, social media, blockchain, NFT, USDC, Base network" />
        
        {/* Open Graph Meta Tags for Farcaster */}
        <meta property="og:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta property="og:description" content="Break echo chambers with AI-powered counter-narrative discovery. Find diverse perspectives from Farcaster, Twitter/X, and news sources. Mint NFT Insight Tokens and earn rewards!" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://echoechos.vercel.app/preview.png" />
        <meta property="og:url" content="https://echoechos.vercel.app/" />
        <meta property="og:site_name" content="EchoEcho" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta name="twitter:description" content="Break echo chambers with AI-powered counter-narrative discovery. Subscribe for premium features with USDC on Base network." />
        <meta name="twitter:image" content="https://echoechos.vercel.app/preview.png" />
        
        {/* App Icons */}
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* Performance Optimizations */}
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
