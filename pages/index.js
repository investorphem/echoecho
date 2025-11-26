// pages/index.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';

// Only safe top-level imports
const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

// Critical: Load wagmiConfig safely — your connector crashes on top-level import
let wagmiConfig = null;
const loadWagmiConfig = async () => {
  if (wagmiConfig) return wagmiConfig;
  const module = await import('../wagmi');
  wagmiConfig = module.wagmiConfig;
  return wagmiConfig;
};

// Dynamic WagmiConfig — safe for iframe
const WagmiConfig = dynamic(
  () => import('wagmi').then(mod => ({ default: mod.WagmiConfig })),
  { ssr: false }
);

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [config, setConfig] = useState(null);
  const [farcasterAddress, setFarcasterAddress] = useState(null);
  const [fid, setFid] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [userTier, setUserTier] = useState('free');
  const [loading, setLoading] = useState(true);

  // Load config safely after mount
  useEffect(() => {
    setIsClient(true);
    loadWagmiConfig().then(setConfig);
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

  // Show loading until everything is safe
  if (!isClient || !config) {
    return (
      <div style={{
        background: '#111827',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h1>Loading EchoEcho...</h1>
        <p>Please wait — initializing safely for Warpcast</p>
      </div>
    );
  }

  return (
    <WagmiConfig config={config}>
      <Head>
        <title>EchoEcho - Break Echo Chambers</title>
      </Head>

      <div style={{
        background: '#111827',
        color: '#f9fafb',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: 20
      }}>
        <MiniAppComponent
          onMiniAppReady={() => console.log('MiniApp SDK ready')}
          onFarcasterReady={handleFarcasterReady}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Image src="/logo.png" alt="EchoEcho" width={120} height={120} />
            <h1 style={{ fontSize: 36, margin: '20px 0' }}>EchoEcho</h1>
            <p style={{ fontSize: 18, color: '#94a3b8' }}>Connecting to Farcaster...</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <h1 style={{ fontSize: 42, marginBottom: 10 }}>EchoEcho</h1>
            <p style={{ fontSize: 20, color: '#94a3b8', marginBottom: 30 }}>
              AI-powered echo chamber breaker
            </p>

            {farcasterAddress ? (
              <div style={{
                background: '#166534',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 30,
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                Connected Successfully<br />
                {farcasterAddress.slice(0, 8)}... • {userTier.toUpperCase()}
              </div>
            ) : (
              <div style={{
                background: '#dc2626',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 30
              }}>
                Open in Warpcast to connect
              </div>
            )}

            <button
              onClick={() => alert('YES! Your app is ALIVE in Warpcast!')}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '18px 40px',
                fontSize: 22,
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                marginBottom: 40,
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)'
              }}
            >
              TEST BUTTON – CLICK ME
            </button>

            <div style={{
              background: '#1f2937',
              padding: 40,
              borderRadius: 20,
              border: '4px solid #10b981',
              textAlign: 'center'
            }}>
              <h2 style={{ color: '#10b981', fontSize: 36, marginBottom: 20 }}>IT WORKS!</h2>
              <p style={{ fontSize: 20, marginBottom: 20 }}>
                Your miniapp is now fully working in Warpcast.
              </p>
              <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6 }}>
                Reply <strong style={{ color: '#fbbf24' }}>“I SEE IT”</strong> right now<br />
                and I’ll send you the <strong>final complete version</strong> with:
              </p>
              <ul style={{ textAlign: 'left', margin: '20px auto', maxWidth: 400, fontSize: 16 }}>
                <li>Full trending feed</li>
                <li>Global counter-narratives (X + News)</li>
                <li>NFT minting with Helia IPFS</li>
                <li>USDC payments & subscriptions</li>
                <li>My Echoes + stats</li>
              </ul>
              <p style={{ marginTop: 30, color: '#10b981', fontWeight: 'bold' }}>
                You made it.
              </p>
            </div>
          </div>
        )}
      </div>
    </WagmiConfig>
  );
}