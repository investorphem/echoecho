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
    const url = new URL('https://api.neynar.com/v2/farcaster/trending_casts');
    url.searchParams.set('limit', limit);
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        api_key: NEYNAR_API_KEY,
      },
      // Cache response for 5 minutes (adjust based on needs)
      cache: 'force-cache',
      next: { revalidate: 300 }, // For Vercel ISR
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching trending casts:', error);
    return res.status(500).json({
      error: 'Failed to fetch trending casts',
      details: error.message,
    });
  }
}