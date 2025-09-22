import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { base } from 'wagmi/chains';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';

const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

export default function Home() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [miniAppReady, setMiniAppReady] = useState(false);
  const [globalMode, setGlobalMode] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [counterNarratives, setCounterNarratives] = useState([]);
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('trends');
  const [userTier, setUserTier] = useState('free');
  const [userEchoes, setUserEchoes] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  const checkUSDCBalance = useCallback(async (address) => {
    console.log('Checking USDC balance for address:', address);
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
      console.log('USDC balance:', data.balance);
      setUsdcBalance(parseFloat(data.balance || 0));
    } catch (error) {
      console.error('USDC balance check failed:', error);
      setUsdcBalance(0);
    }
  }, []);

  const loadUserSubscription = useCallback(async (address) => {
    console.log('Loading user subscription for address:', address);
    try {
      const resp = await fetch('/api/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, action: 'get_subscription' }),
      });
      if (!resp.ok) {
        console.error('Subscription fetch failed:', resp.status, await resp.text());
        setUserTier('free');
        setSubscription(null);
        return;
      }
      const data = await resp.json();
      console.log('Subscription data:', data);
      if (data.user) {
        setUserTier(data.user.tier);
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Failed to load user subscription:', error);
      setUserTier('free');
      setSubscription(null);
    }
  }, []);

  const loadTrends = useCallback(async () => {
    console.log('Loading trends...');
    setLoading(true);
    if (!walletConnected || !walletAddress) {
      console.warn('Wallet not connected, skipping trends load');
      setTrends([]);
      setLoading(false);
      alert('Please connect your wallet to view trends.');
      return;
    }
    try {
      const resp = await fetch('/api/trending');
      console.log('Trends API response status:', resp.status);
      if (resp.status === 402) {
        console.warn('API 402: Payment Required - Using mock data');
        const mockData = {
          casts: [
            { text: 'Sample trend 1', body: 'This is a mock trend', hash: 'mock1' },
            { text: 'Sample trend 2', body: 'Another mock trend', hash: 'mock2' },
          ],
        };
        setTrends(mockData.casts.map((trend) => ({
          ...trend,
          ai_analysis: { sentiment: 'neutral', confidence: 0.5 },
        })));
        alert('⚠️ Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.');
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      }
      const data = await resp.json();
      console.log('Trends data:', data);
      const trendsData = data.casts || [];

      const enrichedTrends = await Promise.all(
        trendsData.slice(0, 10).map(async (trend) => {
          const text = trend.text || trend.body || '';
          if (text.length === 0) {
            console.warn('Skipping AI analysis for empty text in trend:', trend);
            return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
          }
          try {
            const aiResp = await fetch('/api/ai-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, action: 'analyze_sentiment', userAddress: walletAddress }),
            });
            if (!aiResp.ok) {
              throw new Error(`HTTP ${aiResp.status}: ${await aiResp.text()}`);
            }
            const sentiment = await aiResp.json();
            console.log('AI analysis for trend:', sentiment);
            return { ...trend, ai_analysis: sentiment };
          } catch (error) {
            console.error('AI analysis failed for trend with text:', text, error);
            return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
          }
        })
      );

      console.log('Enriched trends:', enrichedTrends);
      setTrends(enrichedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrends([]);
      alert('Failed to load trends. Please try again.');
    }
    setLoading(false);
  }, [walletConnected, walletAddress]);

  const loadTopicDetails = useCallback(async (topic) => {
    console.log('Loading topic details for:', topic.text || topic.body);
    setSelectedTopic(topic);
    setActiveView('topic');

    if (!globalMode) {
      setCounterNarratives([]);
      return;
    }

    if (!walletConnected || !walletAddress) {
      console.warn('Wallet not connected, skipping counter-narratives');
      setCounterNarratives([]);
      alert('Please connect your wallet to view counter-narratives.');
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

      if (!twitterResp.ok || !newsResp.ok) {
        throw new Error(`Cross-platform fetch failed: Twitter ${twitterResp.status}, News ${newsResp.status}`);
      }

      const twitterData = await twitterResp.json();
      const newsData = await newsResp.json();
      console.log('Twitter data:', twitterData, 'News data:', newsData);

      const allPosts = [...(twitterData.posts || []), ...(newsData.posts || [])];

      const counterResp = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: allPosts, action: 'find_counter_narratives', userAddress: walletAddress }),
      });

      if (!counterResp.ok) {
        throw new Error(`HTTP ${counterResp.status}: ${await counterResp.text()}`);
      }

      const counterData = await counterResp.json();
      const counterPosts = counterData.counter_posts?.map((index) => allPosts[index]) || [];
      console.log('Counter-narratives:', counterPosts);
      setCounterNarratives(counterPosts);
    } catch (error) {
      console.error('Error loading cross-platform data:', error);
      setCounterNarratives([]);
      alert('Failed to load counter-narratives. Please try again.');
    }
  }, [globalMode, walletConnected, walletAddress]);

  const loadUserEchoes = useCallback(async () => {
    console.log('Loading user echoes for address:', walletAddress);
    if (!walletConnected || !walletAddress) {
      console.warn('Wallet not connected, skipping user echoes');
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      alert('Please connect your wallet to view echoes.');
      return;
    }
    try {
      const response = await fetch(`/api/user-echoes?userAddress=${walletAddress}`);
      if (!response.ok) {
        console.error('User echoes fetch failed:', response.status, await response.text());
        setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
        return;
      }
      const data = await response.json();
      console.log('User echoes data:', data);
      setUserEchoes(data);
    } catch (error) {
      console.error('Error loading user echoes:', error);
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      alert('Failed to load user echoes. Please try again.');
    }
  }, [walletConnected, walletAddress]);

  const mintInsightToken = useCallback(async (narrative) => {
    console.log('Minting Insight Token for narrative:', narrative);
    if (!walletConnected || !walletAddress) {
      alert('Please connect your wallet via a Farcaster client (e.g., Warpcast) to mint Insight Tokens!');
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
      console.log('Mint NFT result:', result);

      if (result.success) {
        alert(
          `Insight Token minted!\n\n` +
          `Token ID: ${result.token.id}\n` +
          `Transaction: ${result.transaction_hash.slice(0, 10)}...\n` +
          `Rarity: ${result.token.rarity}\n\n` +
          `This counter-narrative is now part of your collection!`
        );
      } else {
        alert('❌ Minting failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Minting error:', error);
      alert('❌ Error minting token: ' + error.message);
    }
  }, [walletConnected, walletAddress]);

  const handleEcho = useCallback(async (cast, isCounterNarrative = false) => {
    console.log('Echoing cast:', cast, 'Is counter-narrative:', isCounterNarrative);
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
      console.log('Echo result:', result);

      if (result.ok) {
        const badge = isCounterNarrative ? ' 🌟 Diverse Echo' : '';
        alert(`✅ Echoed!${badge}`);
      } else {
        alert('❌ Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error echoing:', error);
      alert('❌ Error echoing: ' + error.message);
    }
  }, []);

  useEffect(() => {
    console.log('useEffect: Initializing app...');
    if (walletConnected && walletAddress) {
      checkUSDCBalance(walletAddress);
      loadUserSubscription(walletAddress);
      loadTrends();
    } else {
      console.warn('Wallet not connected, skipping data load');
      setTrends([]);
      setLoading(false);
    }

    const timeout = setTimeout(() => {
      if (!miniAppReady) {
        console.log('Timeout fallback: Setting miniAppReady to true');
        setMiniAppReady(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [walletConnected, walletAddress, checkUSDCBalance, loadUserSubscription, loadTrends, miniAppReady]);

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

  if (loading || !miniAppReady) {
    return (
      <>
        <Head>
          <meta property="og:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
          <meta
            property="og:description"
            content="Discover counter-narratives, mint NFTs, and break echo chambers on Farcaster."
          />
          <meta property="og:image" content="https://echoechos.vercel.app/preview.png" />
        </Head>
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: '#111827',
            color: '#f9fafb',
            minHeight: '100vh',
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
            {loading ? 'Loading trends...' : 'Initializing Farcaster Mini App...'}
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
      </>
    );
  }

  return (
    <>
      <Head>
        <meta property="og:title" content="EchoEcho - AI-Powered Echo Chamber Breaker" />
        <meta
          property="og:description"
          content="Discover counter-narratives, mint NFTs, and break echo chambers on Farcaster."
        />
        <meta property="og:image" content="https://echoechos.vercel.app/preview.png" />
      </Head>
      <div
        style={{
          maxWidth: 720,
          margin: '20px auto',
          padding: 12,
          background: '#111827',
          color: '#f9fafb',
          minHeight: '100vh',
        }}
      >
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
                background: walletConnected ? '#059669' : '#374151',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                border: 'none',
              }}
            >
              {walletConnected ? `🟢 ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : '🔴 No Wallet Connected'}
            </div>
            {walletConnected && (
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

        <MiniAppComponent walletConnected={walletConnected} walletAddress={walletAddress} onMiniAppReady={() => setMiniAppReady(true)} />

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
              onClick={() => setActiveView(view)}
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
                      navigator.share?.({ text: trend.text || 'Check this out!' });
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
          <div
            style={{
              maxWidth: 720,
              margin: '20px auto',
              padding: 12,
              background: '#111827',
              color: '#f9fafb',
              minHeight: '100vh',
            }}
          >
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
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            usdcBalance={usdcBalance}
            checkUSDCBalance={checkUSDCBalance}
            setSubscription={setSubscription}
            loadUserSubscription={loadUserSubscription}
          />
        )}

        {activeView === 'faq' && <FAQView />}
      </div>
    </>
  );
}

const PremiumView = ({ userTier, setUserTier, walletConnected, walletAddress, usdcBalance, checkUSDCBalance, setSubscription, loadUserSubscription }) => {
  const [selectedTier, setSelectedTier] = useState('premium');
  const [paymentStatus, setPaymentStatus] = useState('none');
  const { sendTransaction, isPending } = useSendTransaction();

  const handleUSDCPayment = async (tier) => {
    console.log('Initiating USDC payment for tier:', tier);
    if (!walletConnected || !walletAddress) {
      alert('Please connect your wallet via a Farcaster client (e.g., Warpcast)!');
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

      const usdcContract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const subscriptionWallet = '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62';
      const usdcAbi = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
        },
      ];

      const data = encodeFunctionData({
        abi: usdcAbi,
        functionName: 'transfer',
        args: [subscriptionWallet, BigInt(amount * 10 ** 6)],
      });

      const txHash = await sendTransaction({
        to: usdcContract,
        data,
        value: 0n,
        chainId: base.id,
      });
      console.log('Transaction hash:', txHash);

      const subscriptionResp = await fetch('/api/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          action: 'create_subscription',
          tier,
          transactionHash: txHash,
        }),
      });

      if (!subscriptionResp.ok) {
        throw new Error(`HTTP ${subscriptionResp.status}: ${await subscriptionResp.text()}`);
      }

      const result = await subscriptionResp.json();
      console.log('Subscription result:', result);

      if (result.success) {
        setUserTier(tier);
        setSubscription(result.subscription);
        setPaymentStatus('success');
        alert(
          `Success! ${result.message}\n\n` +
          `💰 ${amount} USDC paid successfully!\n` +
          `🔗 Transaction: ${txHash.slice(0, 10)}...`
        );
        await checkUSDCBalance(walletAddress);
        await loadUserSubscription(walletAddress);
      } else {
        throw new Error(result.error || 'Subscription creation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('none');
      if (error.code === 4001 || error.message.includes('rejected')) {
        alert('❌ Transaction cancelled by user');
      } else {
        alert('❌ Payment failed: ' + error.message);
      }
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24, textAlign: 'center' }}>💎 EchoEcho Premium Subscriptions</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: selectedTier === 'premium' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#1f2937',
            border: selectedTier === 'premium' ? '2px solid #a855f7' : '1px solid #374151',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transform: selectedTier === 'premium' ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.3s ease',
          }}
          onClick={() => setSelectedTier('premium')}
        >
          <h3 style={{ color: '#a855f7', marginBottom: 12 }}>💎 Echo Breaker</h3>
          <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>$7 USDC</div>
          <div style={{ color: '#9ca3af', marginBottom: 16 }}>per month</div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Unlimited echoes</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Cross-platform global echoes</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Premium NFT rarities (rare, epic)</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Advanced AI analysis</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Echo analytics dashboard</div>
          </div>
          {userTier === 'premium' ? (
            <div
              style={{
                background: '#10b981',
                color: 'white',
                padding: '12px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              ✅ Current Plan
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUSDCPayment('premium');
              }}
              style={{
                width: '100%',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: '600',
              }}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : '📱 Pay 7 USDC on Base'}
            </button>
          )}
        </div>
        <div
          style={{
            background: selectedTier === 'pro' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#1f2937',
            border: selectedTier === 'pro' ? '2px solid #f59e0b' : '1px solid #374151',
            borderRadius: 16,
            padding: 24,
            cursor: 'pointer',
            transform: selectedTier === 'pro' ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.3s ease',
          }}
          onClick={() => setSelectedTier('pro')}
        >
          <h3 style={{ color: '#f59e0b', marginBottom: 12 }}>👑 Echo Master</h3>
          <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>$25 USDC</div>
          <div style={{ color: '#9ca3af', marginBottom: 16 }}>per month</div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ All Premium features</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Legendary NFT access</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ API access for developers</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Revenue sharing (15%)</div>
            <div style={{ marginBottom: 8, color: '#10b981' }}>✅ Priority support</div>
          </div>
          {userTier === 'pro' ? (
            <div
              style={{
                background: '#10b981',
                color: 'white',
                padding: '12px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              ✅ Current Plan
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUSDCPayment('pro');
              }}
              style={{
                width: '100%',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: '600',
              }}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : '📱 Pay 25 USDC on Base'}
            </button>
          )}
        </div>
      </div>
      {paymentStatus === 'pending' && (
        <div
          style={{
            background: '#fbbf24',
            color: '#92400e',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          ⏳ Payment pending... Please confirm the transaction in your Farcaster client.
        </div>
      )}
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <h4 style={{ marginBottom: 12 }}>🔗 Why USDC on Base?</h4>
        <div style={{ marginLeft: 16 }}>
          <div>⚡ Ultra-low fees (under $0.01)</div>
          <div>🚀 Fast transactions (2-3 seconds)</div>
          <div>🔒 Ethereum security</div>
          <div>🎨 Same network as your NFTs</div>
        </div>
      </div>
    </div>
  );
};

const FAQView = () => {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqData = [
    {
      question: '🌟 What is EchoEcho?',
      answer:
        'EchoEcho is an AI-powered Farcaster miniapp that breaks echo chambers by discovering counter-narratives from multiple platforms (Farcaster, X, News). When you discover valuable counter-narratives, you earn Insight Token NFTs on Base blockchain!',
    },
    {
      question: '💰 How do I earn money as a user?',
      answer:
        'Multiple ways to earn: $0.01 per echo, NFT trading on OpenSea ($2-200+), rarity bonuses, referral income (10%), viral bonuses, and Pro revenue sharing (15%). Estimated earnings: Active user $10-50/month, Engaged user $50-200/month, Power user $200-1000+/month.',
    },
    {
      question: '🔄 What are the subscription tiers?',
      answer:
        '🆓 FREE ($0): 5 echoes/day, basic features, common NFTs only. 💎 PREMIUM ($7 USDC): Unlimited echoes, cross-platform, rare/epic NFTs, advanced AI. 👑 PRO ($25 USDC): All premium + legendary NFTs, API access, revenue sharing.',
    },
    {
      question: '💳 How do USDC payments work?',
      answer:
        'Connect your Base wallet in a Farcaster client (e.g., Warpcast), click upgrade tier, confirm USDC transaction automatically. Fast (2-3 seconds), cheap (under $0.01), secure. No manual sending required!',
    },
    {
      question: '🎨 What are Insight Token NFTs?',
      answer:
        'NFTs earned for discovering counter-narratives. Rarities: Common ($2-5), Rare ($8-15), Epic ($20-40), Legendary ($50-200+). Trade on OpenSea, proof of diverse thinking, collector status.',
    },
    {
      question: '🔓 What premium features do I get?',
      answer:
        'Premium: Cross-platform echoes (X + News), unlimited usage, advanced AI, premium NFTs, analytics. Pro: Everything + legendary NFTs, API access, revenue sharing, priority support.',
    },
    {
      question: '❓ How do I get started?',
      answer:
        '1️⃣ Connect your Base wallet in a Farcaster client, 2️⃣ Start exploring with 5 free echoes daily, 3️⃣ Upgrade with USDC for unlimited power. Focus on quality counter-narratives for better NFT rarities!',
    },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, marginBottom: 12 }}>❓ Frequently Asked Questions</h2>
        <p style={{ color: '#9ca3af' }}>Everything you need to know about EchoEcho</p>
      </div>
      <div>
        {faqData.map((faq, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #374151',
              borderRadius: '8px',
              marginBottom: '12px',
              backgroundColor: '#1f2937',
            }}
          >
            <button
              onClick={() => toggleSection(index)}
              style={{
                width: '100%',
                padding: '16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {faq.question}
              <span style={{ fontSize: '20px' }}>{openSections[index] ? '−' : '+'}</span>
            </button>
            {openSections[index] && (
              <div style={{ padding: '0 16px 16px', color: '#d1d5db', lineHeight: '1.6' }}>
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return { props: {} };
}
