// pages/_app.js   ← CREATE THIS FILE
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // keep if you have it, or delete line

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}