import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';

const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

export default function Home() {
  const [farcasterAddress, setFarcasterAddress] = useState(null);
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

  // Callback from MiniAppComponent when it detects Farcaster and gets user FID
  const handleFarcasterReady = useCallback((fid) => {
    setIsFarcasterClient(true);
    if (fid) {
      const mockAddress = `0x${fid.toString(16).padStart(40, '0')}`;
      setFarcasterAddress(mockAddress);
      console.log('Farcaster wallet (mock) set:', mockAddress);
    } else {
      console.warn('Farcaster SDK failed to fetch user FID');
      setErrorMessage('Failed to connect Farcaster wallet. Please try again in Warpcast.');
      setLoading(false);
    }
  }, []);

  // Callback from MiniAppComponent when it's safe to render the UI
  const handleMiniAppReady = useCallback(() => {
    console.log('Mini App is ready to render UI.');
    setLoading(false); // Unblock UI rendering
  }, []);

  const checkUSDCBalance = useCallback(async (address) => {
    if (!address) {
      console.warn('No address provided for USDC balance check');
      setUsdcBalance(0);
      return;
    }
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
      setErrorMessage('Failed to check USDC balance. Please try again.');
    }
  }, []);

  const loadUserSubscription = useCallback(async (address) => {
    if (!address) {
      console.warn('No address for subscription load');
      setUserTier('free');
      setSubscription(null);
      return;
    }
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
        setErrorMessage('Failed to load subscription. Defaulting to free tier.');
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
      setErrorMessage('Failed to load subscription. Defaulting to free tier.');
    }
  }, []);

  const loadTrends = useCallback(async (retryCount = 0) => {
    console.log('Loading trends... Attempt:', retryCount + 1);
    setLoading(true);
    setErrorMessage(null);
    setApiWarning(null);
    if (!isFarcasterClient) {
      console.warn('Not in Farcaster client, cannot load trends');
      setTrends([]);
      setErrorMessage('Please use Warpcast to access trends.');
      setLoading(false);
      return;
    }
    if (!farcasterAddress) {
      console.warn('No Farcaster wallet connected, using mock trends');
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
      const resp = await fetch(`/api/trending?userAddress=${farcasterAddress}`);
      console.log('Trends API response status:', resp.status);
      const data = await resp.json();
      if (resp.status === 429) {
        console.warn('Neynar API rate limit (429) reached');
        if (retryCount < 2) {
          console.log('Retrying trends fetch in 2 seconds...');
          setTimeout(() => loadTrends(retryCount + 1), 2000);
          return;
        }
        console.warn('Max retries reached, using mock data');
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
        console.warn('Neynar API 402 or limited: Using mock data');
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
      console.log('Trends data:', data);
      const trendsData = data.casts || [];
      setTrends(trendsData);
      setLoading(false);

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
              body: JSON.stringify({ text, action: 'analyze_sentiment', userAddress: farcasterAddress }),
            });
            const aiData = await aiResp.json();
            if (!aiResp.ok) {
              if (aiResp.status === 429) {
                console.warn('OpenAI rate limit (429) exceeded for trend:', text);
                setApiWarning('AI analysis limited due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
                return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
              }
              throw new Error(`HTTP ${aiResp.status}: ${aiData.error || 'Unknown error'}`);
            }
            console.log('AI analysis for trend:', text, aiData);
            return { ...trend, ai_analysis: aiData };
          } catch (error) {
            console.error('AI analysis failed for trend:', text, error);
            return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
          }
        })
      );

      console.log('Enriched trends:', enrichedTrends);
      setTrends(enrichedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrends([]);
      setErrorMessage('Failed to load trends. Please try again.');
      setLoading(false);
    }
  }, [farcasterAddress, isFarcasterClient]);

  const loadTopicDetails = useCallback(async (topic) => {
    console.log('Loading topic details for:', topic.text || topic.body);
    setSelectedTopic(topic);
    setActiveView('topic');
    setErrorMessage(null);
    setApiWarning(null);

    if (!isFarcasterClient) {
      setCounterNarratives([]);
      setErrorMessage('Counter-narratives require Warpcast.');
      return;
    }

    if (!farcasterAddress) {
      console.warn('No Farcaster wallet connected, skipping counter-narratives');
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
      console.log('Twitter data:', twitterData, 'News data:', newsData);

      const allPosts = [...(twitterData.posts || []), ...(newsData.posts || [])];

      const counterResp = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: allPosts, action: 'find_counter_narratives', userAddress: farcasterAddress }),
      });

      const counterData = await counterResp.json();
      if (!counterResp.ok) {
        if (counterResp.status === 429) {
          console.warn('OpenAI rate limit exceeded for counter-narratives');
          setApiWarning('Counter-narratives unavailable due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
          setCounterNarratives([]);
          return;
        }
        throw new Error(`HTTP ${counterResp.status}: ${counterData.error || 'Unknown error'}`);
      }

      const counterPosts = counterData.counter_posts?.map((index) => allPosts[index]) || [];
      console.log('Counter-narratives:', counterPosts);
      setCounterNarratives(counterPosts);
    } catch (error) {
      console.error('Error loading counter-narratives:', error);
      setCounterNarratives([]);
      setErrorMessage('Failed to load counter-narratives. Please try again.');
    }
  }, [globalMode, farcasterAddress, isFarcasterClient]);

  const loadUserEchoes = useCallback(async () => {
    console.log('Loading user echoes for address:', farcasterAddress);
    if (!isFarcasterClient) {
      console.warn('Not in Farcaster client, skipping user echoes');
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Echo history requires Warpcast.');
      return;
    }
    if (!farcasterAddress) {
      console.warn('No Farcaster wallet connected');
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const response = await fetch(`/api/user-echoes?userAddress=${farcasterAddress}`);
      if (!response.ok) {
        console.error('User echoes fetch failed:', response.status, await response.text());
        setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
        setErrorMessage('Failed to load user echoes. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('User echoes data:', data);
      setUserEchoes(data);
    } catch (error) {
      console.error('Error loading user echoes:', error);
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Failed to load user echoes. Please try again.');
    }
  }, [farcasterAddress, isFarcasterClient]);

  const mintInsightToken = useCallback(async (narrative) => {
    console.log('Minting Insight Token for narrative:', narrative);
    if (!isFarcasterClient) {
      setErrorMessage('Please use Warpcast to mint Insight Tokens.');
      return;
    }
    if (!farcasterAddress) {
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const response = await fetch('/api/mint-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative,
          userAddress: farcasterAddress,
          rarity: narrative.source === 'twitter' ? 'rare' : 'common',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log('Mint NFT result:', result);

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
      console.error('Minting error:', error);
      setErrorMessage('Error minting token: ' + error.message);
    }
  }, [farcasterAddress, isFarcasterClient, loadUserEchoes]);

  const handleEcho = useCallback(async (cast, isCounterNarrative = false) => {
    console.log('Echoing cast:', cast, 'Is counter-narrative:', isCounterNarrative);
    if (!isFarcasterClient) {
      setErrorMessage('Echoing requires Warpcast.');
      return;
    }
    if (!farcasterAddress) {
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
      console.log('Echo result:', result);

      if (result.ok) {
        const badge = isCounterNarrative ? ' 🌟 Diverse Echo' : '';
        setErrorMessage(null);
        alert(`✅ Echoed!${badge}`);
        loadUserEchoes();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error echoing:', error);
      setErrorMessage('Error echoing: ' + error.message);
    }
  }, [farcasterAddress, isFarcasterClient, loadUserEchoes]);

  useEffect(() => {
    if (isFarcasterClient && farcasterAddress) {
      checkUSDCBalance(farcasterAddress);
      loadUserSubscription(farcasterAddress);
      loadTrends();
      loadUserEchoes();
    } else {
      console.warn('No Farcaster client or wallet, waiting for connection');
      setLoading(false);
    }
  }, [farcasterAddress, isFarcasterClient, checkUSDCBalance, loadUserSubscription, loadTrends, loadUserEchoes]);

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
          walletConnected={!!farcasterAddress}
          walletAddress={farcasterAddress}
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
                    background: farcasterAddress ? '#059669' : '#374151',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    border: 'none',
                  }}
                >
                  {farcasterAddress
                    ? `🟢 ${farcasterAddress.slice(0, 6)}...${farcasterAddress.slice(-4)}`
                    : '🔴 No Wallet Connected'}
                </div>
                {farcasterAddress && (
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
                walletConnected={!!farcasterAddress}
                walletAddress={farcasterAddress}
                usdcBalance={usdcBalance}
                checkUSDCBalance={checkUSDCBalance}
                setSubscription={setSubscription}
                loadUserSubscription={loadUserSubscription}
              />
            )}

            {activeView === 'faq' && <FAQView />}
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
    console.log('Initiating USDC payment for tier:', tier);
    if (!walletConnected || !walletAddress) {
      alert('Please connect your Farcaster wallet via Warpcast!');
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
      const data = `0xa9059cbb${walletAddress.slice(2).padStart(64, '0')}${(BigInt(amount * 1e6)).toString(16).padStart(64, '0')}`; // USDC transfer data

      const { transactionHash } = await sdk.actions.signTransaction({
        to: usdcContract,
        data,
        chainId: 8453, // Base chain ID
        value: '0',
      });

      console.log('USDC payment transaction hash:', transactionHash);
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
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${data.error || 'Unknown error'}`);
      }
      console.log('Subscription created:', data);
      setUserTier(tier);
      setSubscription(data.subscription);
      setPaymentStatus('success');
      alert(`🎉 ${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription activated!`);
      checkUSDCBalance(walletAddress);
      loadUserSubscription(walletAddress);
    } catch (error) {
      console.error('Payment error:', error);
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
        {paymentStatus === 'pending' ? 'Processing...' : selectedTier === userTier ? 'Current Plan' : `Upgrade to ${selectedTier.charAt(0).toUpperCase() + tier.slice(1)}`}
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

const FAQView = () => (
  <div>
    <h2 style={{ marginBottom: 20 }}>❓ Frequently Asked Questions</h2>
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>What is EchoEcho?</h3>
      <p style={{ fontSize: 14, color: '#d1d5db' }}>
        EchoEcho is an AI-powered app on Farcaster that helps you break out of echo chambers by discovering counter-narratives and minting them as Insight Tokens (NFTs).
      </p>
    </div>
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: 16, marginTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>How do I use Global Echoes?</h3>
      <p style={{ fontSize: 14, color: '#d1d5db' }}>
        Enable Global Echoes to fetch counter-narratives from X and news sources. This feature requires a Warpcast client and a Premium or Pro subscription.
      </p>
    </div>
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: 16, marginTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>What are Insight Tokens?</h3>
      <p style={{ fontSize: 14, color: '#d1d5db' }}>
        Insight Tokens are NFTs representing counter-narratives you discover. Mint them to showcase your commitment to diverse perspectives!
      </p>
    </div>
  </div>
);