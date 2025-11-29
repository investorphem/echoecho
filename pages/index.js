// pages/index.js
'use client';

im { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });
const WagmiConfig = dynamic(() => import('wagmi').then(m => ({ default: m.WagmiConfig })), { ssr: false });

export default function Home() {
  const [config, setConfig] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('../wagmi').then(module => {
      module.getWagmiConfig().then(cfg => {
        setConfig(cfg);
        setReady(true);
      });
    });
  }, []);

  if (!ready || !config) {
    return (
      <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
        Loading EchoEcho...
      </div>
    );
  }

  return (
    <WagmiConfig config={config}>
      <div style={{ background: '#111827', color: '#fff', minHeight: '100vh', textAlign: 'center', padding: 40, fontFamily: 'system-ui' }}>
        <MiniAppComponent
          onMiniAppReady={() => console.log('SDK ready')}
          onFarcasterReady={(d) => console.log('Farcaster:', d)}
        />

        <h1 style={{ fontSize: 48, margin: '40px 0' }}>EchoEcho</h1>
        <div style={{ background: '#10b981', color: 'white', padding: 30, borderRadius: 20, fontSize: 32, fontWeight: 'bold' }}>
          IT'S ALIVE IN WARPCAST!
        </div>
        <p style={{ marginTop: 30, fontSize: 20 }}>
          Reply <strong>“I SEE IT”</strong> now.
        </p>
      </div>
    </WagmiConfig>
  );
}