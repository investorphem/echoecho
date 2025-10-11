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
    const isMiniApp = req.headers['x-miniapp'] === 'true'; // conditional auth
    const { limit = '10', cursor, userAddress } = req.query;
    const parsedLimit = parseInt(limit, 10);

    if (!config.apiKey) {
      return res.status(500).json({ error: 'Server configuration error: NEYNAR_API_KEY missing' });
    }

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Valid userAddress required' });
    }

    // Non-MiniApp: validate JWT
    if (!isMiniApp) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
      }

      const token = authHeader.split(' ')[1];
      try {
        const jwt = await import('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET || 'your-secure-secret');
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // Proceed to fetch subscription & usage limits only for non-MiniApp
    let userTier = 'free';
    let remainingApiCalls = 10;

    if (!isMiniApp) {
      try {
        const subscriptions = await sql`
          SELECT * FROM subscriptions
          WHERE wallet_address = ${userAddress.toLowerCase()}
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (subscriptions.length > 0 && new Date(subscriptions[0].expires_at) > new Date()) {
          userTier = subscriptions[0].tier;
        }

        if (userTier !== 'premium' && userTier !== 'pro') {
          const usage = await sql`
            SELECT trending_api_calls_used
            FROM user_usage
            WHERE wallet_address = ${userAddress.toLowerCase()}
            AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
          `;
          const used = usage.length > 0 ? usage[0].trending_api_calls_used : 0;
          remainingApiCalls = 10 - used;
          if (remainingApiCalls <= 0) {
            return res.status(429).json({
              error: `Trending API limit reached for ${userTier} tier`,
              casts: mockTrendingCasts(),
              warning: 'Trending data limited due to API plan. Upgrade your Neynar API plan.',
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
        return res.status(500).json({ error: 'Failed to verify subscription or usage', details: err.message });
      }
    }

    // Fetch trending feed (same for MiniApp or non-MiniApp)
    const trendingFeed = await client.fetchFeed({
      feedType: 'filter',
      filterType: 'global_trending',
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
    return res.status(500).json({
      error: 'Failed to fetch trending casts',
      details: error.message,
    });
  }
};

function mockTrendingCasts() {
  const now = new Date().toISOString();
  return [
    { text: 'Mock Trend 1', body: 'Sample', hash: 'mock1', timestamp: now },
    { text: 'Mock Trend 2', body: 'Sample', hash: 'mock2', timestamp: now },
    { text: 'Mock Trend 3', body: 'Sample', hash: 'mock3', timestamp: now },
  ];
}