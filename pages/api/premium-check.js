import { getUserSubscription } from '../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress, feature } = req.body;

  if (!userAddress) {
    return res.status(400).json({ error: 'userAddress required' });
  }

  // Define permissions (ideally move to database or config)
  const permissions = {
    free: {
      daily_echoes: 5,
      cross_platform: false,
      ai_analysis: 10,
      nft_mints: 2,
      nft_rarities: ['common'],
      api_access: false,
      analytics: false
    },
    premium: {
      daily_echoes: 'unlimited',
      cross_platform: true,
      ai_analysis: 'unlimited',
      nft_mints: 50,
      nft_rarities: ['common', 'rare', 'epic'],
      api_access: false,
      analytics: true
    },
    pro: {
      daily_echoes: 'unlimited',
      cross_platform: true,
      ai_analysis: 'unlimited',
      nft_mints: 'unlimited',
      nft_rarities: ['common', 'rare', 'epic', 'legendary'],
      api_access: true,
      analytics: true,
      revenue_sharing: true
    }
  };

  try {
    // Verify user tier from database
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';

    const validTiers = ['free', 'premium', 'pro'];
    if (!validTiers.includes(userTier)) {
      return res.status(400).json({ error: 'Invalid user tier' });
    }

    const userPermissions = permissions[userTier];

    // Validate feature if provided
    if (feature && !(feature in userPermissions)) {
      return res.status(400).json({ error: 'Invalid feature' });
    }

    // Check specific feature access
    if (feature) {
      const hasAccess = userPermissions[feature] !== false && userPermissions[feature] !== 0;
      return res.status(200).json({
        hasAccess,
        userTier,
        feature,
        limit: userPermissions[feature],
        upgradeRequired: !hasAccess
      });
    }

    // Return all permissions
    return res.status(200).json({
      userTier,
      permissions: userPermissions,
      isPremium: userTier !== 'free'
    });
  } catch (error) {
    console.error('Error verifying permissions:', error);
    return res.status(500).json({ error: 'Failed to verify permissions: ' + error.message });
  }
}