import { getUserSubscription } from '../../lib/storage.js';

export default async function handler(req, res) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    return res.status(500).json({ error: 'NEYNAR_API_KEY missing' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { castId, userAddress } = req.body;

  // Validate inputs
  if (!castId || typeof castId !== 'string') {
    return res.status(400).json({ error: 'Valid castId required' });
  }
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Valid userAddress required' });
  }

  try {
    // Verify subscription for premium feature access (e.g., cross_platform)
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';
    if (!['premium', 'pro'].includes(userTier)) {
      return res.status(403).json({ error: 'Premium or Pro subscription required for recasting' });
    }

    const response = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        api_key: NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        cast_id: castId,
        reaction_type: 'recast',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Neynar API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return res.status(200).json({ ...data, ok: true });
  } catch (error) {
    console.error('Error processing recast:', error);
    return res.status(500).json({
      error: 'Failed to process recast',
      details: error.message,
    });
  }
}