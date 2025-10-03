import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FeedType, FilterType } from '@neynar/nodejs-sdk/build/neynar-api/v2';
import { getUserSubscription, getApiCallsUsed, incrementApiCalls, rollbackApiCalls } from '../../lib/storage';

export default async function handler(req, res) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: NEYNAR_API_KEY missing' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract userAddress from query
  const { limit = 10, cursor, userAddress } = req.query;

  // Validate userAddress if provided
  if (userAddress && !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Valid userAddress required' });
  }

  // Define API limits
  const apiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };

  // Check subscription and API limits if userAddress is provided
  let userTier = 'free';
  let remainingApiCalls = apiLimits.free;
  if (userAddress) {
    try {
      const subscription = await getUserSubscription(userAddress.toLowerCase());
      if (subscription && new Date(subscription.expires_at) > new Date()) {
        userTier = subscription.tier;
      }

      if (apiLimits[userTier] !== 'unlimited') {
        // Check remaining API calls
        const apiCallsUsed = await getApiCallsUsed(userAddress.toLowerCase(), 'trending');
        remainingApiCalls = apiLimits[userTier] - apiCallsUsed;

        if (remainingApiCalls <= 0) {
          return res.status(429).json({
            error: `Trending API limit reached for ${userTier} tier`,
            details: `You have reached your daily limit of ${apiLimits[userTier]} trending API calls. Please upgrade to a higher tier.`,
            warning: 'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
            casts: [
              {
                text: 'Mock Trend 1: AI in Web3',
                body: 'Discussing AI’s blockchain future.',
                hash: 'mock1',
                timestamp: new Date().toISOString(),
                caster: { username: 'unknown', address: null },
              },
              {
                text: 'Mock Trend 2: Farcaster Updates',
                body: 'New features released.',
                hash: 'mock2',
                timestamp: new Date().toISOString(),
                caster: { username: 'unknown', address: null },
              },
              {
                text: 'Mock Trend 3: NFT Market Boom',
                body: 'Base chain growth.',
                hash: 'mock3',
                timestamp: new Date().toISOString(),
                caster: { username: 'unknown', address: null },
              },
            ],
            next_cursor: null,
          });
        }

        // Increment API calls used
        try {
          await incrementApiCalls(userAddress.toLowerCase(), 'trending');
        } catch (error) {
          return res.status(500).json({
            error: 'Failed to track API usage',
            details: error.message,
          });
        }
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to verify subscription or usage',
        details: error.message,
        code: error.code || 'Unknown',
      });
    }
  }

  try {
    // Configure Neynar client
    const client = new NeynarAPIClient(NEYNAR_API_KEY);

    // Fetch trending casts
    const trendingFeed = await client.fetchFeed({
      feed_type: FeedType.Filter,
      filter_type: FilterType.GlobalTrending,
      limit: parseInt(limit, 10),
      cursor: cursor || undefined,
    });

    // Extract casts
    const data = {
      casts: (trendingFeed.casts || []).map((cast) => ({
        text: cast.text || '',
        body: cast.text || '',
        hash: cast.hash,
        timestamp: cast.created_at || new Date().toISOString(),
        caster: {
          username: cast.author?.username || 'unknown',
          address: cast.author?.address || null,
        },
      })),
      next_cursor: trendingFeed.next?.cursor || null,
    };

    return res.status(200).json(data);
  } catch (error) {
    if (error.status === 402 || error.message.includes('Payment Required')) {
      // Roll back API call increment
      if (userAddress && apiLimits[userTier] !== 'unlimited') {
        try {
          await rollbackApiCalls(userAddress.toLowerCase(), 'trending');
        } catch (rollbackError) {
          return res.status(500).json({
            error: 'Failed to rollback API usage',
            details: rollbackError.message,
          });
        }
      }
      return res.status(200).json({
        warning: 'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
        casts: [
          {
            text: 'Mock Trend 1: AI in Web3',
            body: 'Discussing AI’s blockchain future.',
            hash: 'mock1',
            timestamp: new Date().toISOString(),
            caster: { username: 'unknown', address: null },
          },
          {
            text: 'Mock Trend 2: Farcaster Updates',
            body: 'New features released.',
            hash: 'mock2',
            timestamp: new Date().toISOString(),
            caster: { username: 'unknown', address: null },
          },
          {
            text: 'Mock Trend 3: NFT Market Boom',
            body: 'Base chain growth.',
            hash: 'mock3',
            timestamp: new Date().toISOString(),
            caster: { username: 'unknown', address: null },
          },
        ],
        next_cursor: null,
      });
    }
    return res.status(500).json({
      error: 'Failed to fetch trending casts',
      details: error.message,
    });
  }
}

// Cache for 5 minutes using Vercel ISR
export const config = {
  api: { responseLimit: false },
};