// app/page.tsx  (or pages/index.js — must be correct location)
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// DO NOT import helia, wagmi, sdk, etc. at top level
// They will crash the iframe before anything renders

const MiniAppComponent = dynamic(
  () => import('../components/MiniAppComponent'),
  { ssr: false }
);

export default function Home() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This proves we're alive
    console.log('EchoEcho: index.js mounted!');
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#111', color: '#fff', minHeight: '100vh' }}>
        <h1>Starting EchoEcho...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#111', color: '#fff' }}>
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111827',
      color: '#f9fafb',
      minHeight: '100vh',
      padding: 16,
      fontFamily: 'system-ui, sans-serif'
    }}>
      <MiniAppComponent
        onMiniAppReady={() => {
          console.log('MiniAppComponent ready!');
          setReady(true);
        }}
        onFarcasterReady={(data) => {
          console.log('Farcaster ready:', data);
        }}
      />

      <div style={{ textAlign: 'center', marginTop: 60 }}>
        <h1 style={{ fontSize: 32 }}>EchoEcho</h1>
        <p>AI-powered echo chamber breaker</p>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>
          If you see this → your app is working!
        </p>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button
          onClick={() => alert('It works! Now slowly add back your features.')}
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}