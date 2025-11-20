// pages/index.js
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Absolutely NOTHING heavy at the top — no wagmi, no helia, no sdk
const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

export default function Home() {
  const [ready, setReady] = useState(false);
  const [fcData, setFcData] = useState(null);

  useEffect(() => {
    console.log('EchoEcho: pages/index.js mounted — YOU ARE ALIVE!');
    setReady(true);
  }, []);

  if (!ready) {
    return <div style={{ padding: 40, background: '#000', color: '#fff', minHeight: '100vh' }}>Loading...</div>;
  }

  return (
    <div style={{
      background: '#111827',
      color: '#f9fafb',
      minHeight: '100vh',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center'
    }}>
      {/* This lets the Farcaster SDK initialize safely */}
      <MiniAppComponent
        onMiniAppReady={() => console.log('MiniApp ready')}
        onFarcasterReady={(data) => {
          console.log('Farcaster data:', data);
          setFcData(data);
        }}
      />

      <div style={{ marginTop: 80 }}>
        <h1 style={{ fontSize: 48, margin: '20px 0' }}>EchoEcho</h1>
        <p style={{ fontSize: 20, color: '#94a3b8' }}>
          AI-powered echo chamber breaker
        </p>

        <div style={{ marginTop: 40, padding: 20, background: '#1f2937', borderRadius: 12, maxWidth: 600, marginInline: 'auto' }}>
          <p style={{ fontSize: 18, margin: '20px 0' }}>
            IT WORKS! Your miniapp is now loading in Warpcast.
          </p>
          {fcData ? (
            <div style={{ background: '#166534', padding: 16, borderRadius: 8, marginTop: 20 }}>
              <strong>Farcaster Connected!</strong><br />
              FID: {fcData.fid}<br />
              Address: {fcData.address?.slice(0, 8)}...
            </div>
          ) : (
            <div style={{ color: '#fbbf24', marginTop: 20 }}>
              Waiting for Farcaster connection...
            </div>
          )}
        </div>

        <button
          onClick={() => alert('Yes! Buttons work too. Now we add back your full app.')}
          style={{
            marginTop: 40,
            background: '#3b82f6',
            color: 'white',
            padding: '16px 32px',
            fontSize: 18,
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer'
          }}
        >
          Test Button – Click Me!
        </button>

        <p style={{ marginTop: 60, color: '#6b7280', fontSize: 14 }}>
          Once you see this screen in Warpcast → reply “I SEE IT”<br />
          and I’ll give you the full working version with trends, wallet, USDC, NFT minting, etc.
        </p>
      </div>
    </div>
  );
}