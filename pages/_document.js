import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="EchoEcho" />
        <meta name="description" content="Break the echo chamber: EchoEcho finds counter-narratives on Farcaster." />
        <meta property="og:title" content="EchoEcho" />
        <meta property="og:description" content="Find counter-narratives for trending Farcaster topics" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://echoechos.vercel.app/icon-192.png" />
        <link rel="icon" href="https://echoechos.vercel.app/icon-192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
