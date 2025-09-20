export default async function handler(req, res) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    return res.status(500).json({ error: 'NEYNAR_API_KEY missing' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support optional query parameters (e.g., limit, cursor)
    const { limit = 10, cursor } = req.query;

    // Dynamically import Neynar SDK
    const { Configuration, NeynarAPIClient } = await import('@neynar/nodejs-sdk');
    const { FeedType, FilterType } = await import('@neynar/nodejs-sdk/build/api');

    // Configure Neynar client
    const config = new Configuration({ apiKey: NEYNAR_API_KEY });
    const client = new NeynarAPIClient(config);

    // Fetch trending casts using SDK
    const trendingFeed = await client.fetchFeed({
      feedType: FeedType.Filter,
      filterType: FilterType.GlobalTrending,
      limit: parseInt(limit, 10), // Convert to integer
      cursor: cursor || undefined, // Only set if provided
    });

    // Extract casts from the response
    const data = {
      casts: trendingFeed.casts || [], // Ensure casts is an array
      next_cursor: trendingFeed.next?.cursor || null, // For pagination
    };

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching trending casts:', error);
    // Fallback to mock data if SDK fails (e.g., 402 Payment Required)
    if (error.message.includes('402') || error.message.includes('Payment Required')) {
      console.warn('Neynar trending requires payment, using mock data');
      return res.status(200).json({
        casts: [
          { text: "Mock Trend 1: AI in Web3", body: "Discussing AI's blockchain future.", timestamp: new Date().toISOString() },
          { text: "Mock Trend 2: Farcaster Updates", body: "New features released.", timestamp: new Date().toISOString() },
          { text: "Mock Trend 3: NFT Market Boom", body: "Base chain growth.", timestamp: new Date().toISOString() },
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

// Optional: Cache for 5 minutes using Vercel ISR
export const config = {
  api: { response_limit: '0' }, // Disable default body size limit
};
