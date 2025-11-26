// pages/index.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';

// Only safe top-level imports
const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

// Lazy-load wagmi and viem AFTER mount
const WagmiConfig = dynamic(() => import('wagmi').then(mod => mod.WagmiConfig), { ssr: false });
const useAccount = dynamic(() => import('wagmi').then(mod => mod.useAccount), { ssr: false });
const useConnect = dynamic(() => import('wagmi').then(mod => mod.useConnect), { ssr: false });
const useSendTransaction = dynamic(() => import('wagmi').then(mod => mod.useSendTransaction), { ssr: false });
const useBalance = dynamic(() => import('wagmi').then(mod => mod.useBalance), { ssr: false });
const encodeFunctionData = dynamic(() => import('viem').then(mod => mod.encodeFunctionData), { ssr: false });
const parseUnits = dynamic(() => import('viem').then(mod => mod.parseUnits), { ssr: false });

// Load wagmi config safely
let wagmiConfig = null;
import('../wagmi').then(module => {
  wagmiConfig = module.wagmiConfig;
});

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [farcasterAddress, setFarcasterAddress] = useState(null);
  const [fid, setFid] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [userTier, setUserTier] = useState('free');
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [globalMode, setGlobalMode] = useState(false);
  const [activeView, setActiveView] = useState('trends');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [counterNarratives, setCounterNarratives] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [userEchoes, setUserEchoes] = useState(null);

  useEffect(() => {
    setIsClient(true);
    console.log('EchoEcho: App mounted successfully in iframe!');
  }, []);

  const handleFarcasterReady = useCallback((data) => {
    console.log('Farcaster connected:', data);
    if (data.address) {
      setFarcasterAddress(data.address);
      setFid(data.fid || null);
      setJwtToken(data.token || null);
      setUserTier(data.tier || 'free');
      localStorage.setItem('wallet_address', data.address);
      if (data.token) localStorage.setItem('jwt_token', data.token);
    }
    setLoading(false);
  }, []);

  if (!isClient || !wagmiConfig) {
    return (
      <div style={{ background: '#111827', color: '#fff', minHeight: '100vh', textAlign: 'center', paddingTop: 100 }}>
        <h1>Loading EchoEcho...</h1>
      </div>
    );
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <Head>
        <title>EchoEcho - Break Echo Chambers</title>
      </Head>

      <div style={{ background: '#111827', color: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <MiniAppComponent
          onMiniAppReady={() => console.log('MiniApp ready')}
          onFarcasterReady={handleFarcasterReady}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Image src="/logo.png" alt="EchoEcho" width={120} height={120} />
            <h1 style={{ fontSize: 32, margin: '20px 0' }}>EchoEcho</h1>
            <p>Loading your trends...</p>
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <h1 style={{ fontSize: 36, marginBottom: 10 }}>EchoEcho</h1>
            <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 30 }}>
              AI-powered echo chamber breaker
            </p>

            {farcasterAddress ? (
              <div style={{ background: '#166534', color: 'white', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16 }}>
                Connected<br />
                {farcasterAddress.slice(0, 8)}... • {userTier.toUpperCase()}
              </div>
            ) : (
              <div style={{ background: '#dc2626', color: 'white', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                Open in Warpcast to connect wallet
              </div>
            )}

            <button
              onClick={() => alert('YES! Your app is finally working in Warpcast!')}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '16px 40px',
                fontSize: 20,
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                marginBottom: 30
              }}
            >
              TEST BUTTON – CLICK ME
            </button>

            <div style={{
              background: '#1f2937',
              padding: 30,
              borderRadius: 16,
              border: '3px solid #10b981'
            }}>
              <h2 style={{ color: '#10b981', fontSize: 28 }}>IT WORKS!</h2>
              <p style={{ fontSize: 18, margin: '20px 0' }}>
                Your miniapp is loading perfectly in Warpcast.
              </p>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>
                Reply <strong>“I SEE IT”</strong> and I’ll immediately send you the
                final full version with:
              </p>
              <ul style={{ textAlign: 'left', marginTop: 10, fontSize: 14 }}>
                <li>Full trending feed</li>
                <li>Counter-narratives from X + News</li>
                <li>NFT minting with Helia IPFS</li>
                <li>USDC payments & subscriptions</li>
                <li>My Echoes history</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </WagmiConfig>
  );
}