import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '10', cursor, userAddress } = req.query;
    const parsedLimit = parseInt(limit, 10);

    if (!config.apiKey) {
      console.error('NEYNAR_API_KEY is missing');
      return res.status(500).json({ 
        error: 'Server configuration error: NEYNAR_API_KEY missing' 
      });
    }

    // Validate user address
    if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      console.warn('Invalid userAddress:', userAddress);
      return res.status(400).json({ error: 'Valid userAddress required' });
    }

    const apiLimits = {
      free: 10,
      premium: 'unlimited',
      pro: 'unlimited',
    };

    let userTier = 'free';
    let remainingApiCalls = apiLimits.free;

    // Subscription check
    if (userAddress) {
      try {
        const subscriptions = await sql`
          SELECT * FROM subscriptions
          WHERE wallet_address = ${userAddress.toLowerCase()}
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          if (new Date(sub.expires_at) > new Date()) {
            userTier = sub.tier;
          }
        }

        if (apiLimits[userTier] !== 'unlimited') {
          const usage = await sql`
            SELECT trending_api_calls_used
            FROM user_usage
            WHERE wallet_address = ${userAddress.toLowerCase()}
            AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
          `;

          const used = usage.length > 0 ? usage[0].trending_api_calls_used : 0;
          remainingApiCalls = apiLimits[userTier] - used;

          if (remainingApiCalls <= 0) {
            return res.status(429).json({
              error: `Trending API limit reached for ${userTier} tier`,
              details: `You have reached your daily limit. Please upgrade your tier.`,
              casts: mockTrendingCasts(),
              warning:
                'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing',
            });
          }

          await sql`
            INSERT INTO user_usage (wallet_address, usage_date, trending_api_calls_used)
            VALUES (${userAddress.toLowerCase()}, CURRENT_DATE, 1)
            ON CONFLICT (wallet_address, usage_date)
            DO UPDATE SET trending_api_calls_used = user_usage.trending_api_calls_used + 1 
          `;
        }
      } catch (err) {
        console.error('Subscription or usage check error:', err.message);
        return res.status(500).json({
          error: 'Failed to verify subscription or usage',
          details: err.message,
        });
      }
    }

    // ✅ Correct fetchFeed parameters
    const trendingFeed = await client.fetchFeed({
      feedType: 'filter',          // ✅ Valid feed type
      filterType: 'global_trending', // ✅ Use string instead of enum
      limit: parsedLimit,
      cursor,
    });

    const data = {
      casts: trendingFeed.result?.casts || [],
      next_cursor: trendingFeed.result?.next?.cursor || null,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching trending casts:', error.message);

    if (error.status === 402 || error.message.includes('Payment Required')) {
      return res.status(200).json({
        warning:
          'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
        casts: mockTrendingCasts(),
        next_cursor: null,
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch trending casts',
      details: error.message,
    });
  }
}

function mockTrendingCasts() {
  const now = new Date().toISOString();
  return [
    {
      text: 'Mock Trend 1: AI in Web3',
      body: 'Discussing AI’s blockchain future.',
      hash: 'mock1',
      timestamp: now,
    },
    {
      text: 'Mock Trend 2: Farcaster Updates',
      body: 'New features released.',
      hash: 'mock2',
      timestamp: now,
    },
    {
      text: 'Mock Trend 3: NFT Market Boom',
      body: 'Base chain growth.',
      hash: 'mock3',
      timestamp: now,
    },
  ];
}
