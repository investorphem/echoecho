import { NextResponse } from 'next/server';
import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export const runtime = 'edge'; // use Vercel Edge Functions

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const userAddress = searchParams.get('userAddress') || undefined;
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY is missing');
      return NextResponse.json(
        { error: 'Server configuration error: NEYNAR_API_KEY missing' },
        { status: 500 }
      );
    }

    // Validate address
    if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      console.warn('Invalid userAddress:', userAddress);
      return NextResponse.json({ error: 'Valid userAddress required' }, { status: 400 });
    }

    const apiLimits: Record<string, number | 'unlimited'> = {
      free: 10,
      premium: 'unlimited',
      pro: 'unlimited',
    };

    let userTier = 'free';
    let remainingApiCalls = apiLimits.free as number;

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

        if (apiLimits[userTier] !== 'unlimited') {
          const usage = await sql`
            SELECT trending_api_calls_used FROM user_usage
            WHERE wallet_address = ${userAddress.toLowerCase()}
            AND DATE_TRUNC('day', usage_date) = CURRENT_DATE
          `;

          const used = usage.length > 0 ? usage[0].trending_api_calls_used : 0;
          remainingApiCalls = (apiLimits[userTier] as number) - used;

          if (remainingApiCalls <= 0) {
            return NextResponse.json(
              {
                error: `Trending API limit reached for ${userTier} tier`,
                details: `You have reached your daily limit. Please upgrade your tier.`,
                casts: mockTrendingCasts(),
                warning:
                  'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing',
              },
              { status: 429 }
            );
          }

          await sql`
            INSERT INTO user_usage (wallet_address, usage_date, trending_api_calls_used)
            VALUES (${userAddress.toLowerCase()}, CURRENT_DATE, 1)
            ON CONFLICT (wallet_address, usage_date)
            DO UPDATE SET trending_api_calls_used = user_usage.trending_api_calls_used + 1
          `;
        }
      } catch (err: any) {
        console.error('Subscription or usage check error:', err.message);
        return NextResponse.json(
          { error: 'Failed to verify subscription or usage', details: err.message },
          { status: 500 }
        );
      }
    }

    // ✅ Proper Neynar client configuration
    const config = new Configuration({ apiKey: NEYNAR_API_KEY });
    const client = new NeynarAPIClient(config);

    // ✅ Updated fetchFeed format
    const trendingFeed = await client.fetchFeed({
      feedType: 'filter',
      filterType: 'global_trending',
      limit,
      cursor,
    });

    const data = {
      casts: trendingFeed.casts || [],
      next_cursor: trendingFeed.next?.cursor || null,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching trending casts:', error.message);

    if (error.status === 402 || error.message.includes('Payment Required')) {
      return NextResponse.json(
        {
          warning:
            'Trending data limited due to API plan. Upgrade your Neynar API plan at https://dev.neynar.com/pricing for full access.',
          casts: mockTrendingCasts(),
          next_cursor: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch trending casts', details: error.message },
      { status: 500 }
    );
  }
};

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