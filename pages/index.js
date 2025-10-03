'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';
import { useRouter } from 'next/navigation';

const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

export default function Home({ walletAddress: propWalletAddress }) {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState(propWalletAddress);
  const [isFarcasterClient, setIsFarcasterClient] = useState(false);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalMode, setGlobalMode] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [counterNarratives, setCounterNarratives] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('trends');
  const [userTier, setUserTier] = useState('free');
  const [userEchoes, setUserEchoes] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [apiWarning, setApiWarning] = useState(null);

  // Callback from MiniAppComponent when it authenticates user
  const handleFarcasterReady = useCallback((data) => {
    setIsFarcasterClient(true);
    if (data?.address) {
      setWalletAddress(data.address);
      setUserTier(data.tier || 'free');
      setSubscription(data.subscription || null);
    } else {
      setErrorMessage('Failed to connect Farcaster wallet. Please try again in Warpcast.');
      setLoading(false);
    }
  }, []);

  // Callback when MiniAppComponent is ready
  const handleMiniAppReady = useCallback(() => {
    setLoading(false);
  }, []);

  const checkUSDCBalance = useCallback(async (address) => {
    if (!address) {
      setUsdcBalance(0);
      setErrorMessage('No wallet address provided for USDC balance check');
      return;
    }
    try {
      const response = await fetch('/api/check-usdc-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      setUsdcBalance(parseFloat(data.balance || 0));
    } catch (error) {
      setUsdcBalance(0);
      setErrorMessage('Failed to check USDC balance. Please try again.');
    }
  }, []);

  const loadUserSubscription = useCallback(async (address) => {
    if (!address) {
      setUserTier('free');
      setSubscription(null);
      setErrorMessage('No wallet address for subscription load');
      return;
    }
    try {
      const resp = await fetch('/api/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, action: 'get_subscription' }),
      });
      if (!resp.ok) {
        setUserTier('free');
        setSubscription(null);
        setErrorMessage('Failed to load subscription. Defaulting to free tier.');
        return;
      }
      const data = await resp.json();
      if (data.user) {
        setUserTier(data.user.tier);
        setSubscription(data.subscription);
      }
    } catch (error) {
      setUserTier('free');
      setSubscription(null);
      setErrorMessage('Failed to load subscription. Defaulting to free tier.');
    }
  }, []);

  const loadTrends = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setErrorMessage(null);
    setApiWarning(null);
    if (!isFarcasterClient) {
      setTrends([]);
      setErrorMessage('Please use Warpcast to access trends.');
      setLoading(false);
      return;
    }
    if (!walletAddress) {
      const mockData = {
        casts: [
          { text: 'Sample trend 1', body: 'This is a mock trend', hash: 'mock1', timestamp: new Date().toISOString() },
          { text: 'Sample trend 2', body: 'Another mock trend', hash: 'mock2', timestamp: new Date().toISOString() },
        ],
      };
      setTrends(mockData.casts.map((trend) => ({
        ...trend,
        ai_analysis: { sentiment: 'neutral', confidence: 0.5 },
      })));
      setErrorMessage('Connect a Farcaster wallet in Warpcast for full trends.');
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch(`/api/trending?userAddress=${walletAddress}`);
      const data = await resp.json();
      if (resp.status === 429) {
        if (retryCount < 2) {
          setTimeout(() => loadTrends(retryCount + 1), 2000);
          return;
        }
        const mockData = {
          casts: [
            { text: 'Sample trend 1', body: 'This is a mock trend', hash: 'mock1', timestamp: new Date().toISOString() },
            { text: 'Sample trend 2', body: 'Another mock trend', hash: 'mock2', timestamp: new Date().toISOString() },
          ],
        };
        setTrends(mockData.casts.map((trend) => ({
          ...trend,
          ai_analysis: { sentiment: 'neutral', confidence: 0.5 },
        })));
        setApiWarning('Trending data unavailable due to Neynar API rate limits. Upgrade your plan at https://dev.neynar.com/pricing.');
        setLoading(false);
        return;
      }
      if (resp.status === 402 || data.warning) {
        const mockData = {
          casts: [
            { text: 'Sample trend 1', body: 'This is a mock trend', hash: 'mock1', timestamp: new Date().toISOString() },
            { text: 'Sample trend 2', body: 'Another mock trend', hash: 'mock2', timestamp: new Date().toISOString() },
          ],
        };
        setTrends(mockData.casts.map((trend) => ({
          ...trend,
          ai_analysis: { sentiment: 'neutral', confidence: 0.5 },
        })));
        setApiWarning('Trending data limited due to Neynar API plan. Upgrade at https://dev.neynar.com/pricing.');
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${data.error || 'Unknown error'}`);
      }
      const trendsData = data.casts || [];
      setTrends(trendsData);

      const enrichedTrends = await Promise.all(
        trendsData.slice(0, 10).map(async (trend) => {
          const text = trend.text || trend.body || '';
          if (text.length === 0) {
            return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
          }
          try {
            const aiResp = await fetch('/api/ai-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, action: 'analyze_sentiment', userAddress: walletAddress }),
            });
            const aiData = await aiResp.json();
            if (!aiResp.ok) {
              if (aiResp.status === 429) {
                setApiWarning('AI analysis limited due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
                return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
              }
              throw new Error(`HTTP ${aiResp.status}: ${aiData.error || 'Unknown error'}`);
            }
            return { ...trend, ai_analysis: aiData };
          } catch (error) {
            return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
          }
        })
      );

      setTrends(enrichedTrends);
      setLoading(false);
    } catch (error) {
      setTrends([]);
      setErrorMessage('Failed to load trends. Please try again.');
      setLoading(false);
    }
  }, [walletAddress, isFarcasterClient]);

  const loadTopicDetails = useCallback(async (topic) => {
    setSelectedTopic(topic);
    setActiveView('topic');
    setErrorMessage(null);
    setApiWarning(null);

    if (!isFarcasterClient) {
      setCounterNarratives([]);
      setErrorMessage('Counter-narratives require Warpcast.');
      return;
    }

    if (!walletAddress) {
      setCounterNarratives([]);
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }

    if (!globalMode) {
      setCounterNarratives([]);
      return;
    }

    try {
      const [twitterResp, newsResp] = await Promise.all([
        fetch('/api/cross-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.text || topic.body, source: 'twitter' }),
        }),
        fetch('/api/cross-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.text || topic.body, source: 'news' }),
        }),
      ]);

      const twitterData = await twitterResp.json();
      const newsData = await newsResp.json();
      if (!twitterResp.ok || !newsResp.ok) {
        throw new Error(`Cross-platform fetch failed: Twitter ${twitterResp.status}, News ${newsResp.status}`);
      }

      const allPosts = [...(twitterData.posts || []), ...(newsData.posts || [])];

      const counterResp = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: allPosts, action: 'find_counter_narratives', userAddress: walletAddress }),
      });

      const counterData = await counterResp.json();
      if (!counterResp.ok) {
        if (counterResp.status === 429) {
          setApiWarning('Counter-narratives unavailable due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
          setCounterNarratives([]);
          return;
        }
        throw new Error(`HTTP ${counterResp.status}: ${counterData.error || 'Unknown error'}`);
      }

      const counterPosts = counterData.counter_posts?.map((index) => allPosts[index]) || [];
      setCounterNarratives(counterPosts);
    } catch (error) {
      setCounterNarratives([]);
      setErrorMessage('Failed to load counter-narratives. Please try again.');
    }
  }, [globalMode, walletAddress, isFarcasterClient]);

  const loadUserEchoes = useCallback(async () => {
    if (!isFarcasterClient) {
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Echo history requires Warpcast.');
      return;
    }
    if (!walletAddress) {
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const response = await fetch(`/api/user-echoes?userAddress=${walletAddress}`);
      if (!response.ok) {
        setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
        setErrorMessage('Failed to load user echoes. Please try again.');
        return;
      }
      const data = await response.json();
      setUserEchoes(data);
    } catch (error) {
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Failed to load user echoes. Please try again.');
    }
  }, [walletAddress, isFarcasterClient]);

  const mintInsightToken = useCallback(async (narrative) => {
    if (!isFarcasterClient) {
      setErrorMessage('Please use Warpcast to mint Insight Tokens.');
      return;
    }
    if (!walletAddress) {
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const response = await fetch('/api/mint-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative,
          userAddress: walletAddress,
          rarity: narrative.source === 'twitter' ? 'rare' : 'common',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      if (result.success) {
        setErrorMessage(null);
        alert(
          `Insight Token minted!\n\n` +
          `Token ID: ${result.token.id}\n` +
          `Transaction: ${result.transaction_hash.slice(0, 10)}...\n` +
          `Rarity: ${result.token.rarity}\n\n` +
          `This counter-narrative is now part of your collection!`
        );
        loadUserEchoes();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      setErrorMessage('Error minting token: ' + error.message);
    }
  }, [walletAddress, isFarcasterClient, loadUserEchoes]);

  const handleEcho = useCallback(async (cast, isCounterNarrative = false) => {
    if (!isFarcasterClient) {
      setErrorMessage('Echoing requires Warpcast.');
      return;
    }
    if (!walletAddress) {
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const resp = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castId: cast.hash || cast.id }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      }
      const result = await resp.json();
      if (result.ok) {
        const badge = isCounterNarrative ? ' 🌟 Diverse Echo' : '';
        setErrorMessage(null);
        alert(`✅ Echoed!${badge}`);
        loadUserEchoes();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      setErrorMessage('Error echoing: ' + error.message);
    }
  }, [walletAddress, isFarcasterClient, loadUserEchoes]);

  useEffect(() => {
    if (isFarcasterClient && walletAddress) {
      checkUSDCBalance(walletAddress);
      loadUserSubscription(walletAddress);
      loadTrends();
      loadUserEchoes();
    } else {
      setLoading(false);
    }
  }, [walletAddress, isFarcasterClient, checkUSDCBalance, loadUserSubscription, loadTrends, loadUserEchoes]);

  const getSentimentColor = (sentiment, confidence) => {
    if (confidence < 0.6) return '#999';
    switch (sentiment) {
      case 'positive':
        return '#4ade80';
      case 'negative':
        return '#f87171';
      default:
        return '#a78bfa';
    }
  };

  const getSentimentGauge = (sentiment, confidence) => {
    const width = Math.round(confidence * 100);
    const color = getSentimentColor(sentiment, confidence);
    return (
      <div style={{ background: '#1f2937', borderRadius: 8, padding: 4, marginTop: 8 }}>
        <div
          style={{
            background: color,
            height: 6,
            borderRadius: 3,
            width: `${width}%`,
            transition: 'width 0.3s ease',
          }}
        />
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
          {sentiment} ({Math.round(confidence * 100)}%)
        </div>
      </div>
    );
  };

  const filteredTrends = useMemo(() => {
    return trends.filter(
      (trend) =>
        !searchQuery || (trend.text || trend.body || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trends, searchQuery]);

  return (
    <>
      <Head>
        <title>EchoEcho - AI-Powered Echo Chamber Breaker</title>
        <meta property="og:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta
          property="og:description"
          content="Discover counter-narratives, mint NFTs, and break echo chambers on Farcaster."
        />
        <meta property="og:image" content="https://echoechos.vercel.app/preview.png" />
      </Head>
      <div
        suppressHydrationWarning
        style={{
          maxWidth: 720,
          margin: '20px auto',
          padding: 12,
          background: '#111827',
          color: '#f9fafb',
          minHeight: '100vh',
        }}
      >
        <MiniAppComponent
          walletConnected={!!walletAddress}
          walletAddress={walletAddress}
          onMiniAppReady={handleMiniAppReady}
          onFarcasterReady={handleFarcasterReady}
        />

        {errorMessage && (
          <div
            style={{
              background: '#dc2626',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {apiWarning && (
          <div
            style={{
              background: '#f59e0b',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>{apiWarning}</div>
            <button
              onClick={() => setApiWarning(null)}
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image
              src="/logo.png"
              alt="EchoEcho Logo"
              width={120}
              height={120}
              style={{ marginBottom: 20, borderRadius: 20 }}
            />
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>🔥 EchoEcho</div>
            <div style={{ fontSize: 16, color: '#9ca3af', marginBottom: 20 }}>
              Loading...
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                border: '4px solid #3b82f6',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {!loading && !isFarcasterClient && (
          <div
            style={{
              background: '#f59e0b',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            Please open in Warpcast to use EchoEcho.
            <a
              href="https://warpcast.com"
              style={{
                color: '#3b82f6',
                marginLeft: 8,
                textDecoration: 'underline',
              }}
            >
              Go to Warpcast
            </a>
          </div>
        )}

        {!loading && isFarcasterClient && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24 }}>🔥 EchoEcho</h1>
                <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: 14 }}>
                  AI-powered echo chamber breaker
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div
                  style={{
                    background: userTier === 'free' ? '#374151' : userTier === 'premium' ? '#7c3aed' : '#fbbf24',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {userTier === 'free' ? '🆓 Free' : userTier === 'premium' ? '💎 Premium' : '👑 Pro'}
                </div>
                <button
                  onClick={() => setActiveView('premium')}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  💰 Upgrade
                </button>
                <div
                  style={{
                    background: walletAddress ? '#059669' : '#374151',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    border: 'none',
                  }}
                >
                  {walletAddress
                    ? `🟢 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : '🔴 No Wallet Connected'}
                </div>
                {walletAddress && (
                  <div
                    style={{
                      background: '#1e40af',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    💰 {usdcBalance} USDC
                  </div>
                )}
              </div>
            </div>

            {subscription && !reminderDismissed && (() => {
              const now = new Date();
              const expiryDate = new Date(subscription.expires_at);
              const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
                return (
                  <div
                    style={{
                      background: daysUntilExpiry <= 1 ? '#dc2626' : '#f59e0b',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: 8,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {daysUntilExpiry === 1 ? '⚠️ Last Day!' : `📅 ${daysUntilExpiry} Days Left`}
                      </div>
                      <div style={{ fontSize: 14 }}>
                        Your {subscription.tier} subscription expires{' '}
                        {daysUntilExpiry === 1 ? 'tomorrow' : `in ${daysUntilExpiry} days`}. Renew now to keep premium features!
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setActiveView('premium')}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.3)',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Renew
                      </button>
                      <button
                        onClick={() => setReminderDismissed(true)}
                        style={{
                          background: 'transparent',
                          color: 'white',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: 6,
                          fontSize: 16,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="🔍 Search trends or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: '#f9fafb',
                  fontSize: 14,
                  marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={globalMode}
                    onChange={(e) => setGlobalMode(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14 }}>
                    🌐 Global Echoes {globalMode ? '(X + News)' : '(Farcaster Only)'}
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', background: '#1f2937', borderRadius: 8, padding: 4, marginBottom: 20 }}>
              {['trends', 'echoes', 'faq'].map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    if (view === 'faq') {
                      router.push('/faq');
                    } else {
                      setActiveView(view);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: activeView === view ? '#3b82f6' : 'transparent',
                    color: activeView === view ? 'white' : '#9ca3af',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    textTransform: 'capitalize',
                  }}
                >
                  {view === 'trends' ? '🔥 Trends' : view === 'echoes' ? '📜 My Echoes' : '❓ FAQ'}
                </button>
              ))}
            </div>

            {activeView === 'trends' && (
              <div>
                {filteredTrends.length === 0 && (
                  <div
                    style={{
                      background: '#1f2937',
                      border: '1px dashed #374151',
                      padding: 20,
                      borderRadius: 12,
                      color: '#9ca3af',
                      textAlign: 'center',
                    }}
                  >
                    No trends available. {searchQuery ? 'Try a different search query.' : 'Connect a Farcaster wallet or check API status.'}
                  </div>
                )}
                {filteredTrends.map((trend, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      padding: 16,
                      marginBottom: 16,
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => loadTopicDetails(trend)}
                  >
                    <div style={{ fontSize: 16, marginBottom: 12, lineHeight: 1.4 }}>
                      {trend.text || trend.body || 'No text'}
                    </div>
                    {trend.ai_analysis && getSentimentGauge(trend.ai_analysis.sentiment, trend.ai_analysis.confidence)}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEcho(trend);
                        }}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        🔄 Echo It
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.share) {
                            navigator.share({ text: trend.text || 'Check this out!' });
                          } else {
                            alert('Share feature not supported in this browser. Please copy the text manually.');
                          }
                        }}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        📤 Share
                      </button>
                      <div
                        style={{
                          background: '#374151',
                          color: '#9ca3af',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          marginLeft: 'auto',
                        }}
                      >
                        Click for details →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'topic' && selectedTopic && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <button
                    onClick={() => setActiveView('trends')}
                    style={{
                      background: 'none',
                      border: '1px solid #374151',
                      color: '#9ca3af',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    ← Back to Trends
                  </button>
                </div>
                <h2 style={{ marginBottom: 16 }}>🎯 Topic Deep Dive</h2>
                <div
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 12 }}>
                    {selectedTopic.text || selectedTopic.body || 'No text'}
                  </div>
                  {selectedTopic.ai_analysis &&
                    getSentimentGauge(selectedTopic.ai_analysis.sentiment, selectedTopic.ai_analysis.confidence)}
                </div>
                {globalMode && counterNarratives.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: 16, color: '#60a5fa' }}>🌐 Counter-Narratives Found</h3>
                    {counterNarratives.map((narrative, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#1f2937',
                          border: '1px solid #3b82f6',
                          padding: 16,
                          borderRadius: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontSize: 14, marginBottom: 12 }}>{narrative.text}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                          Source: {narrative.source} {narrative.author && ` • ${narrative.author}`}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleEcho(narrative, true)}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 14,
                            }}
                          >
                            🌟 Echo Counter-View
                          </button>
                          <button
                            onClick={() => mintInsightToken(narrative)}
                            style={{
                              background: '#7c3aed',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 14,
                            }}
                          >
                            🎨 Mint Insight Token
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {globalMode && counterNarratives.length === 0 && (
                  <div
                    style={{
                      background: '#1f2937',
                      border: '1px dashed #374151',
                      padding: 20,
                      borderRadius: 12,
                      color: '#9ca3af',
                      textAlign: 'center',
                    }}
                  >
                    No counter-narratives found. Try enabling Global Echoes or check API status.
                  </div>
                )}
              </div>
            )}

            {activeView === 'echoes' && (
              <div>
                <h2 style={{ marginBottom: 20 }}>📜 Your Echo History</h2>
                {userEchoes === null ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <button
                      onClick={loadUserEchoes}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      📊 Load My Echoes
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 16,
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          padding: 16,
                          borderRadius: 12,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{userEchoes.stats?.total_echoes || 0}</div>
                        <div style={{ color: '#9ca3af', fontSize: 14 }}>Total Echoes</div>
                      </div>
                      <div
                        style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          padding: 16,
                          borderRadius: 12,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🌟</div>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{userEchoes.stats?.counter_narratives || 0}</div>
                        <div style={{ color: '#9ca3af', fontSize: 14 }}>Counter-Narratives</div>
                      </div>
                      <div
                        style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          padding: 16,
                          borderRadius: 12,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🎨</div>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{userEchoes.stats?.nfts_minted || 0}</div>
                        <div style={{ color: '#9ca3af', fontSize: 14 }}>NFTs Minted</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 32 }}>
                      <h3 style={{ marginBottom: 16, color: '#60a5fa' }}>🔄 Recent Echoes</h3>
                      {userEchoes.echoes?.length > 0 ? (
                        userEchoes.echoes.map((echo, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#1f2937',
                              border: '1px solid #374151',
                              padding: 16,
                              borderRadius: 12,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ fontSize: 16, marginBottom: 8 }}>{echo.original_cast}</div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: '#9ca3af',
                                fontSize: 12,
                              }}
                            >
                              <span>
                                {echo.type === 'counter_narrative' ? '🌟 Counter-Narrative' : '🔄 Standard Echo'}
                                {echo.source && ` • ${echo.source}`}
                              </span>
                              <span>{new Date(echo.echoed_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            background: '#1f2937',
                            border: '1px dashed #374151',
                            padding: 20,
                            borderRadius: 12,
                            color: '#9ca3af',
                            textAlign: 'center',
                          }}
                        >
                          No echoes yet. Start echoing to build your history!
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ marginBottom: 16, color: '#7c3aed' }}>🎨 Your Insight Token Collection</h3>
                      {userEchoes.nfts?.length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: 16,
                          }}
                        >
                          {userEchoes.nfts.map((nft, i) => (
                            <div
                              key={i}
                              style={{
                                background: '#1f2937',
                                border: '1px solid #7c3aed',
                                borderRadius: 12,
                                overflow: 'hidden',
                              }}
                            >
                              <Image
                                src={nft.image}
                                alt={nft.title}
                                width={250}
                                height={200}
                                style={{ width: '100%', height: 200, objectFit: 'cover', background: '#374151' }}
                              />
                              <div style={{ padding: 16 }}>
                                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{nft.title}</div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    color: '#9ca3af',
                                  }}
                                >
                                  <span>Rarity: {nft.rarity}</span>
                                  <span>{new Date(nft.minted_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            background: '#1f2937',
                            border: '1px dashed #374151',
                            padding: 20,
                            borderRadius: 12,
                            color: '#9ca3af',
                            textAlign: 'center',
                          }}
                        >
                          No Insight Tokens yet. Discover and mint counter-narratives to start your collection!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'premium' && (
              <PremiumView
                userTier={userTier}
                setUserTier={setUserTier}
                walletConnected={!!walletAddress}
                walletAddress={walletAddress}
                usdcBalance={usdcBalance}
                checkUSDCBalance={checkUSDCBalance}
                setSubscription={setSubscription}
                loadUserSubscription={loadUserSubscription}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

const PremiumView = ({ userTier, setUserTier, walletConnected, walletAddress, usdcBalance, checkUSDCBalance, setSubscription, loadUserSubscription }) => {
  const [selectedTier, setSelectedTier] = useState('premium');
  const [paymentStatus, setPaymentStatus] = useState('none');

  const handleUSDCPayment = async (tier) => {
    if (!walletConnected || !walletAddress) {
      alert('Please connect your Farcaster wallet via Warpcast!');
      return;
    }

    const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      alert('Treasury address not configured. Please contact support.');
      return;
    }

    const pricing = { premium: 7, pro: 25 };
    const amount = pricing[tier];

    if (usdcBalance < amount) {
      alert(
        `❌ Insufficient USDC Balance!\n\nRequired: ${amount} USDC\nYour Balance: ${usdcBalance} USDC\n\nPlease add more USDC to your wallet on Base network.`
      );
      return;
    }

    try {
      setPaymentStatus('pending');
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const usdcContract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const txData = `0xa9059cbb${treasuryAddress.slice(2).padStart(64, '0')}${(BigInt(amount * 1e6)).toString(16).padStart(64, '0')}`; // USDC transfer data

      const { transactionHash } = await sdk.actions.signTransaction({
        to: usdcContract,
        data: txData,
        chainId: 8453, // Base chain ID
        value: '0',
      });

      const resp = await fetch('/api/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          action: 'create_subscription',
          tier,
          amount,
          transaction_hash: transactionHash,
        }),
      });
      const responseData = await resp.json();
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${responseData.error || 'Unknown error'}`);
      }
      setUserTier(tier);
      setSubscription(responseData.subscription);
      setPaymentStatus('success');
      alert(`🎉 ${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription activated!`);
      checkUSDCBalance(walletAddress);
      loadUserSubscription(walletAddress);
    } catch (error) {
      setPaymentStatus('error');
      alert('Error processing payment: ' + error.message);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>💎 Upgrade Your Plan</h2>
      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        {['premium', 'pro'].map((tier) => (
          <div
            key={tier}
            style={{
              background: '#1f2937',
              border: `1px solid ${selectedTier === tier ? '#3b82f6' : '#374151'}`,
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
            }}
            onClick={() => setSelectedTier(tier)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                {tier === 'premium' ? '💎 Premium' : '👑 Pro'} {tier === userTier && '(Current)'}
              </div>
              <div style={{ fontSize: 14, color: '#9ca3af' }}>
                {tier === 'premium' ? '$7 USDC/month' : '$25 USDC/month'}
              </div>
            </div>
            <ul style={{ fontSize: 14, color: '#d1d5db', listStyle: 'disc', paddingLeft: 20 }}>
              {tier === 'premium' ? (
                <>
                  <li>Access to Global Echoes (X + News)</li>
                  <li>Unlimited AI-powered counter-narratives</li>
                  <li>Mint up to 5 Insight Tokens/month</li>
                </>
              ) : (
                <>
                  <li>All Premium features</li>
                  <li>Unlimited Insight Token minting</li>
                  <li>Exclusive Pro badge & analytics</li>
                </>
              )}
            </ul>
          </div>
        ))}
      </div>
      <button
        onClick={() => handleUSDCPayment(selectedTier)}
        style={{
          background: paymentStatus === 'pending' ? '#6b7280' : '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          width: '100%',
          fontSize: 16,
          cursor: paymentStatus === 'pending' || selectedTier === userTier ? 'not-allowed' : 'pointer',
        }}
        disabled={paymentStatus === 'pending' || selectedTier === userTier}
      >
        {paymentStatus === 'pending' ? 'Processing...' : selectedTier === userTier ? 'Current Plan' : `Upgrade to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`}
      </button>
      {paymentStatus === 'success' && (
        <div style={{ color: '#4ade80', textAlign: 'center', marginTop: 12 }}>
          Subscription activated! Enjoy your {selectedTier} features!
        </div>
      )}
      {paymentStatus === 'error' && (
        <div style={{ color: '#f87171', textAlign: 'center', marginTop: 12 }}>
          Payment failed. Please try again or check your wallet.
        </div>
      )}
    </div>
  );
};