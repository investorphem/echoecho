import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import { saveSubscription, getUserSubscription } from '../../lib/storage.js';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62'; // Fallback for testing

// Minimal ABI for USDC Transfer event
const USDC_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, transactionHash, userAddress, tier } = req.body;

    if (action === 'verify_payment') {
      if (!userAddress || !isAddress(userAddress)) {
        return res.status(400).json({ error: 'Valid user address required', verified: false });
      }
      if (!transactionHash || !transactionHash.startsWith('0x')) {
        return res.status(400).json({ error: 'Valid transaction hash required', verified: false });
      }
      if (!['premium', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier', verified: false });
      }

      try {
        // Verify USDC payment on Base
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash
        });

        if (!receipt || receipt.status !== 'success') {
          return res.status(400).json({ error: 'Transaction not found or failed', verified: false });
        }

        // Verify USDC Transfer event
        const expectedAmounts = { premium: 7, pro: 25 };
        const expectedAmount = BigInt(expectedAmounts[tier] * 1e6); // USDC has 6 decimals

        const transferEvent = receipt.logs.find(log => 
          log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event topic
        );

        if (!transferEvent) {
          return res.status(400).json({ error: 'No USDC transfer found in transaction', verified: false });
        }

        const [, from, to] = transferEvent.topics;
        const value = BigInt(transferEvent.data);
        
        if (
          from.toLowerCase() !== `0x${userAddress.toLowerCase().slice(2).padStart(64, '0')}` ||
          to.toLowerCase() !== `0x${PAYMENT_ADDRESS.toLowerCase().slice(2).padStart(64, '0')}` ||
          value < expectedAmount
        ) {
          return res.status(400).json({ error: 'Invalid USDC transfer details', verified: false });
        }

        // Save subscription to database
        const subscription = {
          id: `sub_${Date.now()}`,
          user_address: userAddress.toLowerCase(),
          tier,
          status: 'active',
          usdc_amount: expectedAmounts[tier],
          transaction_hash: transactionHash,
          activated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_method: 'usdc_base'
        };

        await saveSubscription(subscription);

        return res.status(200).json({
          success: true,
          verified: true,
          subscription,
          message: ` Payment verified! Your ${tier} subscription is now active!`
        });
      } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ 
          error: 'Payment verification failed: ' + error.message,
          verified: false 
        });
      }
    }

    if (action === 'check_subscription') {
      if (!userAddress || !isAddress(userAddress)) {
        return res.status(400).json({ error: 'Valid user address required' });
      }

      try {
        // Query database for subscription
        const subscription = await getUserSubscription(userAddress.toLowerCase());
        const userTier = subscription?.tier || 'free';
        const hasActiveSubscription = ['premium', 'pro'].includes(userTier) && 
                                     new Date(subscription?.expires_at) > new Date();

        return res.status(200).json({
          tier: userTier,
          active: hasActiveSubscription,
          features: {
            unlimited_echoes: hasActiveSubscription,
            cross_platform: hasActiveSubscription,
            premium_nfts: userTier === 'pro' || userTier === 'premium',
            legendary_nfts: userTier === 'pro',
            api_access: userTier === 'pro',
            revenue_sharing: userTier === 'pro'
          }
        });
      } catch (error) {
        console.error('Subscription check error:', error);
        return res.status(500).json({ error: 'Failed to check subscription' });
      }
    }
  }

  if (req.method === 'GET') {
    // Get USDC payment information
    return res.status(200).json({
      usdc_contract: USDC_CONTRACT,
      payment_address: PAYMENT_ADDRESS,
      network: 'base',
      pricing: {
        premium: 7,
        pro: 25
      },
      instructions: {
        premium: 'Send 7 USDC to the payment address on Base network',
        pro: 'Send 25 USDC to the payment address on Base network'
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}