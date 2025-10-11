import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    console.error('NEYNAR_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: NEYNAR_API_KEY missing' });
  }

  if (req.method !== 'GET') {
    console.warn(`Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 10, cursor, userAddress } = req.query;

  if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    console.warn('Invalid userAddress:', userAddress);
    return res.status(400).json({ error: 'Valid userAddress required' });
  }

  const apiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };
  let userTier = 'free';
  let remainingApiCalls = apiLimits.free;

  // 🔹 Subscription check
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

      console.log('User subscription tier:', userTier);

      if (apiLimits[userTier] !== 'unlimited') {
        const usage = await sql`
          SELECT trending_api_calls_used FROM user_usage
          WHERE wallet_address = ${userAddress.toLowerCase()}
          AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
        `;

        const apiCallsUsed = usage.length > 0 ? usage[0].trending_api_calls_used : 0;
        remainingApiCalls = apiLimits[userTier] - apiCallsUsed;

        if (remainingApiCalls <= 0) {
          console.warn(`Trending API limit reached for user: ${userAddress}, tier: ${userTier}`);
          return res.status(429).json({
            error: `Trending API limit reached for ${userTier} tier`,
            details: `You have reached your daily limit of ${apiLimits[userTier]} trending API calls. Please upgrade to a higher tier.`,
            warning: 'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
            casts: mockTrendingCasts(),
            next_cursor: null,
          });
        }

        await sql`
          INSERT INTO user_usage (wallet_address, usage_date, trending_api_calls_used)
          VALUES (${userAddress.toLowerCase()}, CURRENT_DATE, 1)
          ON CONFLICT (wallet_address, usage_date)
          DO UPDATE SET trending_api_calls_used = user_usage.trending_api_calls_used + 1
        `;

        console.log(`Trending API calls remaining for ${userAddress}: ${remainingApiCalls - 1}`);
      }
    } catch (error) {
      console.error('Subscription or usage check error:', error.message, { code: error.code });
      return res.status(500).json({
        error: 'Failed to verify subscription or usage',
        details: error.message,
        code: error.code || 'Unknown',
      });
    }
  }

  try {
    // ✅ Use new Neynar client directly (no Configuration import needed)
    const client = new NeynarAPIClient(NEYNAR_API_KEY);

    // ✅ Updated feedType and filterType (string-based, avoids undefined Filter issue)
    const trendingFeed = await client.fetchFeed({
      feedType: 'filter',
      filterType: 'global_trending',
      limit: parseInt(limit, 10),
      cursor: cursor || undefined,
    });

    const data = {
      casts: trendingFeed.casts || [],
      next_cursor: trendingFeed.next?.cursor || null,
    };

    console.log('Trending feed fetched:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching trending casts:', error.message);

    if (error.status === 402 || error.message.includes('Payment Required')) {
      console.warn('Neynar trending requires payment, using mock data');

      if (userAddress && apiLimits[userTier] !== 'unlimited') {
        try {
          await sql`
            UPDATE user_usage
            SET trending_api_calls_used = GREATEST(user_usage.trending_api_calls_used - 1, 0)
            WHERE wallet_address = ${userAddress.toLowerCase()}
            AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
          `;
          console.log(`Rolled back trending API call usage for ${userAddress}`);
        } catch (dbError) {
          console.error('Rollback error:', dbError.message);
        }
      }

      return res.status(200).json({
        warning: 'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
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
    { text: 'Mock Trend 1: AI in Web3', body: 'Discussing AI’s blockchain future.', hash: 'mock1', timestamp: now },
    { text: 'Mock Trend 2: Farcaster Updates', body: 'New features released.', hash: 'mock2', timestamp: now },
    { text: 'Mock Trend 3: NFT Market Boom', body: 'Base chain growth.', hash: 'mock3', timestamp: now },
  ];
}

// Cache config
export const config = {
  api: { responseLimit: false },
};