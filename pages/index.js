// pages/index.js
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';

// SAFE: Only light imports at top level
const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

// Lazy-load heavy stuff inside useEffect or components
const WagmiConfig = dynamic(() => import('wagmi').then(mod => mod.WagmiConfig), { ssr: false });
const wagmiConfigPromise = import('../wagmi');

export default function Home() {
  const [WagmiProvider, setWagmiProvider] = useState<any>(null);
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);

  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [subscription, setSubscription] = useState<any>(null);

  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [globalMode, setGlobalMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'trends' | 'echoes' | 'premium' | 'faq' | 'topic'>('trends');
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [counterNarratives, setCounterNarratives] = useState<any[]>([]);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [userEchoes, setUserEchoes] = useState<any>(null);
  const [contextInfo, setContextInfo] = useState({ platformType: 'unknown' });

  // Load wagmi safely after mount
  useEffect(() => {
    Promise.all([import('wagmi'), wagmiConfigPromise]).then(([wagmi, config]) => {
      setWagmiProvider(() => wagmi.WagmiConfig);
      setWagmiConfig(config.wagmiConfig);
    });
  }, []);

  const handleFarcasterReady = useCallback((data: any) => {
    console.log('Farcaster Ready:', data);
    setContextInfo({
      referrerDomain: data.referrerDomain || null,
      clientFid: data.clientFid || null,
      platformType: data.platformType || 'unknown',
    });

    if (data.error) {
      setErrorMessage(data.error);
      setLoading(false);
      return;
    }

    if (data.address) {
      setFarcasterAddress(data.address);
      setFid(data.fid || null);
      setJwtToken(data.token);
      setUserTier(data.tier || 'free');
      setSubscription(data.subscription || null);
      localStorage.setItem('wallet_address', data.address);
      localStorage.setItem('jwt_token', data.token || '');
    }
    setLoading(false);
  }, []);

  const loadTrends = useCallback(async () => {
    if (!farcasterAddress || !jwtToken) {
      setTrends([]);
      setErrorMessage('Connect wallet in Warpcast to see trends');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/trending?userAddress=${farcasterAddress}`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed');

      const enriched = await Promise.all(
        (data.casts || []).slice(0, 10).map(async (t: any) => {
          const text = t.text || t.body || '';
          if (!text) return { ...t, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };

          const aiRes = await fetch('/api/ai-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
            body: JSON.stringify({ text, action: 'analyze_sentiment', userAddress: farcasterAddress }),
          });
          const aiData = await aiRes.json();
          return { ...t, ai_analysis: aiRes.ok ? aiData : { sentiment: 'neutral', confidence: 0.5 } };
        })
      );

      setTrends(enriched);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load trends');
      setTrends([]);
    } finally {
      setLoading(false);
    }
  }, [farcasterAddress, jwtToken]);

  useEffect(() => {
    if (farcasterAddress && jwtContext) loadTrends();
  }, [farcasterAddress, loadTrends]);

  if (!WagmiProvider || !wagmiConfig) {
    return <div style={{ padding: 40, textAlign: 'center', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1>Loading EchoEcho...</h1>
    </div>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <Head>
        <title>EchoEcho - Break Echo Chambers</title>
      </Head>

      <div style={{ background: '#111827', color: '#f9fafb', minHeight: '100vh', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <MiniAppComponent onMiniAppReady={() => console.log('MiniApp ready')} onFarcasterReady={handleFarcasterReady} />

        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Image src="/logo.png" alt="EchoEcho" width={120} height={120} />
            <h1>🔥 EchoEcho</h1>
            <p>Loading trends...</p>
          </div>
        )}

        {!loading && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <h1 style={{ fontSize: 32 }}>🔥 EchoEcho</h1>
              <p>AI-powered echo chamber breaker</p>
              {farcasterAddress ? (
                <p style={{ color: '#10b981' }}>
                  Connected: {farcasterAddress.slice(0, 8)}... • {userTier.toUpperCase()}
                </p>
              ) : (
                <p style={{ color: '#fbbf24' }}>Open in Warpcast to connect</p>
              )}
            </div>

            {errorMessage && (
              <div style={{ background: '#dc2626', color: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                {errorMessage}
              </div>
            )}

            <button
              onClick={() => alert('EchoEcho is working perfectly in Warpcast!')}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '16px 32px',
                fontSize: 18,
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                width: '100%',
                marginBottom: 20
              }}
            >
              Test Button – Click Me!
            </button>

            <div style={{ background: '#1f2937', padding: 20, borderRadius: 12, textAlign: 'center' }}>
              <h2 style={{ color: '#10b981' }}>IT WORKS!</h2>
              <p>Your full app will be added safely next.</p>
              <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 20 }}>
                Reply <strong>“I SEE IT”</strong> when you see this screen in Warpcast<br />
                and I’ll give you the final version with trends, minting, payments — everything.
              </p>
            </div>
          </>
        )}
      </div>
    </WagmiProvider>
  );
}