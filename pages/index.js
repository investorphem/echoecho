'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';
import { sdk } from '@farcaster/miniapp-sdk';

// Lazy load heavy dependencies to avoid SSR/iframe crashes
const Helia = dynamic(() => import('helia'), { ssr: false });
const Json = dynamic(() => import('@helia/json'), { ssr: false });
const WagmiConfig = dynamic(() => import('wagmi').then(mod => ({ default: mod.WagmiConfig })), { ssr: false });
const wagmiConfig = dynamic(() => import('../wagmi'), { ssr: false });

const MiniAppComponent = dynamic(() => import('../components/MiniAppComponent'), { ssr: false });

function ConnectMenu({ onConnected }) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();

  useEffect(() => {
    if (isConnected && address) {
      console.log('ConnectMenu: Wallet connected, address:', address);
      onConnected?.(address);
    }
  }, [isConnected, address, onConnected]);

  if (isConnected) {
    return (
      <div style={{ color: '#4ade80', textAlign: 'center', marginBottom: 16 }}>
        <div>You're connected!</div>
        <div>Address: {address.slice(0, 6)}...{address.slice(-4)}</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isConnecting || !connectors[0]}
        style={{
          background: isConnecting || !connectors[0] ? '#6b7280' : '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          cursor: isConnecting || !connectors[0] ? 'not-allowed' : 'pointer',
          fontSize: 16,
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      <div style={{ marginTop: 12, fontSize: 14, color: '#9ca3af' }}>
        Please open in a Farcaster client:
        <a href="https://warpcast.com/~/apps/echoecho" style={{ color: '#3b82f6', marginLeft: 8, marginRight: 8 }}>
          Warpcast
        </a>
        <a href="https://wallet.coinbase.com/base-app" style={{ color: '#3b82f6' }}>
          Base App
        </a>
      </div>
    </div>
  );
}

export default function Home({ _fid, walletAddress: propWalletAddress }) {
  const [farcasterAddress, setFarcasterAddress] = useState(propWalletAddress || null);
  const [fid, setFid] = useState(_fid || null);
  const [isFarcasterClient, setIsFarcasterClient] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
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
  const [contextInfo, setContextInfo] = useState({ referrerDomain: null, clientFid: null, platformType: 'unknown' });

  // Lazy load wagmi hooks to avoid SSR issues
  const { useAccount, useConnect, useSendTransaction, useSendCalls, useBalance } = dynamic(() => import('wagmi'), { ssr: false });
  const { encodeFunctionData, parseUnits } = dynamic(() => import('viem'), { ssr: false });

  const handleFarcasterReady = useCallback((data) => {
    console.log('handleFarcasterReady received:', JSON.stringify(data, null, 2));
    setContextInfo({
      referrerDomain: data.referrerDomain || null,
      clientFid: data.clientFid || null,
      platformType: data.platformType || 'unknown',
    });
    if (data.error) {
      console.error('Farcaster initialization error:', data.error);
      setErrorMessage(data.error);
      setLoading(false);
      // Load mock trends
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
      return;
    }
    setIsFarcasterClient(true);
    if (data?.address) {
      setFarcasterAddress(data.address);
      setFid(data.fid || null);
      setJwtToken(data.token);
      setUserTier(data.tier || 'free');
      setSubscription(data.subscription || null);
      console.log('Farcaster user data set:', {
        fid: data.fid,
        address: data.address,
        clientFid: data.clientFid,
        platformType: data.platformType,
      });
    } else {
      // Fallback to cached address
      const cachedAddress = localStorage.getItem('wallet_address');
      if (cachedAddress) {
        setFarcasterAddress(cachedAddress);
        console.log('Using cached address:', cachedAddress);
      } else {
        setErrorMessage('Failed to fetch user data: Missing wallet address');
        setLoading(false);
        // Load mock trends
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
      }
    }
  }, []);

  const handleMiniAppReady = useCallback(() => {
    console.log('handleMiniAppReady: MiniApp initialization complete');
    setLoading(false);
  }, []);

  const handleWalletConnected = useCallback((address) => {
    setFarcasterAddress(address);
    localStorage.setItem('wallet_address', address);
    console.log('Wallet connected:', address);
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
        throw new Error(`HTTP \( {response.status}: \){await response.text()}`);
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

    if (!farcasterAddress) {
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
      setErrorMessage('Connect a Farcaster wallet in Warpcast to view real trends.');
      setLoading(false);
      return;
    }

    try {
      const token = jwtToken || localStorage.getItem('jwt_token');
      if (!token) {
        setErrorMessage('No authentication token found. Please reconnect wallet.');
        setLoading(false);
        return;
      }

      const resp = await fetch(`/api/trending?userAddress=${farcasterAddress}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        throw new Error(`HTTP \( {resp.status}: \){data.error || 'Unknown error'}`);
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
              body: JSON.stringify({ text, action: 'analyze_sentiment', userAddress: farcasterAddress }),
            });
            const aiData = await aiResp.json();
            if (!aiResp.ok) {
              if (aiResp.status === 429) {
                setApiWarning('AI analysis limited due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
                return { ...trend, ai_analysis: { sentiment: 'neutral', confidence: 0.5 } };
              }
              throw new Error(`HTTP \( {aiResp.status}: \){aiData.error || 'Unknown error'}`);
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
      console.error('loadTrends error:', error);
      setTrends([]);
      setErrorMessage('Failed to load trends. Please try again or open in Warpcast.');
      setLoading(false);
    }
  }, [farcasterAddress, jwtToken]);

  const loadTopicDetails = useCallback(async (topic) => {
    setSelectedTopic(topic);
    setActiveView('topic');
    setErrorMessage(null);
    setApiWarning(null);

    if (!farcasterAddress) {
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
        throw new Error(`Cross-platform fetch failed: Twitter \( {twitterResp.status}, News \){newsResp.status}`);
      }

      const allPosts = [...(twitterData.posts || []), ...(newsData.posts || [])];

      const counterResp = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: allPosts, action: 'find_counter_narratives', userAddress: farcasterAddress }),
      });

      const counterData = await counterResp.json();
      if (!counterResp.ok) {
        if (counterResp.status === 429) {
          setApiWarning('Counter-narratives unavailable due to OpenAI quota. Upgrade at https://platform.openai.com/account/billing.');
          setCounterNarratives([]);
          return;
        }
        throw new Error(`HTTP \( {counterResp.status}: \){counterData.error || 'Unknown error'}`);
      }

      const counterPosts = counterData.counter_posts?.map((index) => allPosts[index]) || [];
      setCounterNarratives(counterPosts);
    } catch (error) {
      setCounterNarratives([]);
      setErrorMessage('Failed to load counter-narratives. Please try again.');
    }
  }, [globalMode, farcasterAddress]);

  const loadUserEchoes = useCallback(async () => {
    if (!farcasterAddress) {
      setUserEchoes({ echoes: [], nfts: [], stats: { total_echoes: 0, counter_narratives: 0, nfts_minted: 0 } });
      setErrorMessage('Please connect a Farcaster wallet in Warpcast.');
      return;
    }
    try {
      const response = await fetch(`/api/user-echoes?userAddress=${farcasterAddress}`, {
        headers: { Authorization: `Bearer ${jwtToken || localStorage.getItem('jwt_token')}` },
      });
      if (!response.ok) {
        setUserEchoes({ echoes: [], nfts: [], stats: { total