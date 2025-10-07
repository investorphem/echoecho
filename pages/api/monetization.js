import { isAddress } from 'viem';
import { saveSubscription, getUserSubscription } from '../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get pricing and monetization options (move to database for production)
    const pricing = {
      tiers: {
        free: {
          name: 'Free Explorer',
          price: 0,
          features: [
            'Basic trending casts',
            '5 echoes per day',
            'Standard NFT minting (common rarity)',
            'Basic counter-narratives'
          ],
          limits: {
            daily_echoes: 5,
            ai_analysis: 10,
            nft_mints: 2
          }
        },
        premium: {
          name: 'Echo Breaker',
          price: Number(process.env.PREMIUM_PRICE || 7),
          period: 'month',
          features: [
            'Unlimited echoes',
            'Advanced AI analysis',
            'Cross-platform global echoes',
            'Premium NFT rarities (rare, epic)',
            'Priority counter-narrative discovery',
            'Echo analytics dashboard',
            'Custom echo badges'
          ],
          limits: {
            daily_echoes: 'unlimited',
            ai_analysis: 'unlimited',
            nft_mints: 50
          }
        },
        pro: {
          name: 'Echo Master',
          price: Number(process.env.PRO_PRICE || 25),
          period: 'month',
          features: [
            'All Premium features',
            'Legendary NFT rarity access',
            'API access for developers',
            'White-label echo solutions',
            'Advanced echo chamber analytics',
            'Priority customer support',
            'Revenue sharing on viral echoes'
          ],
          limits: {
            daily_echoes: 'unlimited',
            ai_analysis: 'unlimited',
            nft_mints: 'unlimited'
          }
        }
      },
      revenue_streams: {
        subscriptions: {
          monthly_recurring: true,
          tiers: ['premium', 'pro'],
          payment_method: 'usdc_base',
          usdc_pricing: {
            premium: Number(process.env.PREMIUM_PRICE || 7),
            pro: Number(process.env.PRO_PRICE || 25)
          }
        },
        nft_minting: {
          base_fee: Number(process.env.NFT_BASE_FEE || 0.001), // ETH
          rarity_multipliers: {
            common: 1,
            rare: 2.5,
            epic: 5,
            legendary: 10
          },
          platform_fee: Number(process.env.NFT_PLATFORM_FEE || 0.1)
        },
        tips: {
          enabled: true,
          min_amount: Number(process.env.TIP_MIN_AMOUNT || 0.0001), // ETH
          platform_fee: Number(process.env.TIP_PLATFORM_FEE || 0.05)
        },
        partnerships: {
          sponsored_echoes: {
            rate: Number(process.env.SPONSORED_RATE || 50), // USD per 1000 views
            min_engagement: 100
          },
          protocol_integrations: {
            revenue_share: Number(process.env.PARTNERSHIP_REVENUE_SHARE || 0.15)
          }
        }
      },
      estimated_earnings: {
        users_1k: {
          monthly_revenue: '500-2000',
          sources: ['subscriptions', 'nft_mints', 'tips']
        },
        users_10k: {
          monthly_revenue: '5000-15000',
          sources: ['subscriptions', 'nft_mints', 'sponsored_content', 'partnerships']
        },
        users_100k: {
          monthly_revenue: '25000-75000',
          sources: ['all_streams', 'viral_bonuses', 'enterprise_deals']
        }
      }
    };

    return res.status(200).json(pricing);
  }

  if (req.method === 'POST') {
    const { action, tier, userAddress } = req.body;

    if (!userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid userAddress required' });
    }

    if (action === 'create_subscription') {
      const pricing = {
        premium: Number(process.env.PREMIUM_PRICE || 7),
        pro: Number(process.env.PRO_PRICE || 25)
      };

      if (!pricing[tier]) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      try {
        const subscription = {
          id: `sub_${Date.now()}`,
          user_address: userAddress.toLowerCase(),
          tier,
          status: 'pending_payment',
          usdc_amount: pricing[tier],
          created_at: new Date().toISOString(),
          next_billing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_method: 'usdc_base',
          base_transaction_hash: null
        };

        // Save to database
        await saveSubscription(subscription);

        return res.status(200).json({
          success: true,
          subscription,
          usdc_amount: pricing[tier],
          payment_address: process.env.PAYMENT_ADDRESS || '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62',
          message: ` Send ${pricing[tier]} USDC to complete your ${tier} subscription!`,
          instructions: `Transfer ${pricing[tier]} USDC on Base network to the payment address to activate your ${tier} subscription.`
        });
      } catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({ error: 'Failed to create subscription: ' + error.message });
      }
    }

    if (action === 'calculate_earnings') {
      const { echoes, nft_mints, user_tier } = req.body;

      if (!Number.isInteger(echoes) || echoes < 0 || !Number.isInteger(nft_mints) || nft_mints < 0) {
        return res.status(400).json({ error: 'Invalid echoes or nft_mints' });
      }

      const validTiers = ['free', 'premium', 'pro'];
      if (!validTiers.includes(user_tier)) {
        return res.status(400).json({ error: 'Invalid user_tier' });
      }

      try {
        // Verify user tier and activity from database
        const subscription = await getUserSubscription(userAddress.toLowerCase());
        const actualTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
          ? subscription.tier
          : 'free';

        if (actualTier !== user_tier) {
          return res.status(400).json({ error: 'Invalid user_tier for userAddress' });
        }

        // Placeholder for real earnings calculation (replace with actual logic)
        const earnings = {
          base_echoes: echoes * Number(process.env.ECHO_RATE || 0.01),
          nft_revenue: nft_mints * Number(process.env.NFT_AVG_REVENUE || 2.5),
          tier_bonus: user_tier === 'pro' ? Number(process.env.PRO_BONUS || 50) : user_tier === 'premium' ? Number(process.env.PREMIUM_BONUS || 20) : 0,
          total: 0
        };

        earnings.total = earnings.base_echoes + earnings.nft_revenue + earnings.tier_bonus;

        return res.status(200).json({ earnings });
      } catch (error) {
        console.error('Error calculating earnings:', error);
        return res.status(500).json({ error: 'Failed to calculate earnings: ' + error.message });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}