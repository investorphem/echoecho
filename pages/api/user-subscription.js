import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import jwt from 'jsonwebtoken';
import { getUserSubscription, saveSubscription, recordPayment, updateUserTier } from '../../lib/storage';

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SUBSCRIPTION_WALLET = process.env.SUBSCRIPTION_WALLET || '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62';

// Validate contract and wallet addresses
if (!USDC_CONTRACT || !USDC_CONTRACT.match(/^0x[a-fA-F0-9]{40}$/)) {
  throw new Error('Invalid USDC_CONTRACT address');
}
if (!SUBSCRIPTION_WALLET || !SUBSCRIPTION_WALLET.match(/^0x[a-fA-F0-9]{40}$/)) {
  throw new Error('Invalid SUBSCRIPTION_WALLET address');
}

// Minimal ABI for USDC balanceOf and transfer events
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
];

export default async function handler(req, res) {
  if (!process.env.BASE_RPC_URL) {
    return res.status(500).json({ error: 'Server configuration error: BASE_RPC_URL missing' });
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  // Verify JWT
  const authHeader = req.headers.authorization;
  let decoded;
  if (req.method === 'POST') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secure-secret');
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid token', 
        details: error.message,
        hint: 'Ensure you are using a valid JWT token from the /api/me endpoint.'
      });
    }
  }

  if (req.method === 'POST') {
    const { walletAddress, action, tier, transactionHash } = req.body;

    // Ensure walletAddress matches JWT
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/) || walletAddress.toLowerCase() !== decoded.address.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid or unauthorized wallet address' });
    }

    const userKey = walletAddress.toLowerCase();

    if (action === 'get_subscription') {
      try {
        const subscription = await getUserSubscription(userKey);
        const tier = subscription ? subscription.tier : 'free';
        const subscriptionData = subscription
          ? {
              tier: subscription.tier,
              transaction_hash: subscription.transaction_hash,
              created_at: subscription.created_at,
              expires_at: subscription.expires_at,
              amount_usdc: subscription.amount_usdc,
            }
          : null;

        return res.status(200).json({
          user: { tier, walletAddress: userKey },
          subscription: subscriptionData,
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to get subscription', details: error.message });
      }
    }

    if (action === 'create_subscription') {
      if (!['premium', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      if (!transactionHash || !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
        return res.status(400).json({ error: 'Valid transaction hash required' });
      }

      try {
        const pricing = { 
          premium: 7_000_000, // 7 USDC (6 decimals)
          pro: 25_000_000    // 25 USDC
        };
        const amount = pricing[tier];

        // Verify the transaction on-chain
        const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
        if (!receipt || receipt.status !== 'success' || receipt.chainId !== base.id) {
          return res.status(400).json({ 
            error: 'Invalid or failed transaction', 
            details: {
              chainId: receipt?.chainId || 'unknown',
              status: receipt?.status || 'unknown',
            }
          });
        }

        // Check for USDC Transfer event
        const transferEvent = receipt.logs.find(
          (log) =>
            log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
            log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        );

        if (!transferEvent) {
          return res.status(400).json({ 
            error: 'No USDC transfer found in transaction',
            details: 'Transaction does not include a valid USDC transfer to the subscription wallet.'
          });
        }

        const [, from, to] = transferEvent.topics;
        const value = BigInt(transferEvent.data);

        if (
          from.toLowerCase() !== `0x${userKey.slice(2).padStart(64, '0')}` ||
          to.toLowerCase() !== `0x${SUBSCRIPTION_WALLET.toLowerCase().slice(2).padStart(64, '0')}` ||
          value < amount
        ) {
          return res.status(400).json({ 
            error: 'Invalid USDC transfer details',
            details: {
              from: `0x${from.slice(2)}`,
              to: `0x${to.slice(2)}`,
              value: Number(formatUnits(value, 6)),
              expected: Number(formatUnits(amount, 6)),
            }
          });
        }

        // Create subscription and record payment
        const subscription = await saveSubscription(userKey, tier, transactionHash, {
          amount_usdc: Number(formatUnits(amount, 6)),
          auto_renew: true,
        });
        await recordPayment(userKey, transactionHash, Number(formatUnits(amount, 6)), tier);

        const subscriptionData = {
          tier: subscription.tier,
          transaction_hash: subscription.transaction_hash,
          created_at: subscription.created_at,
          expires_at: subscription.expires_at,
          amount_usdc: subscription.amount_usdc,
        };

        return res.status(200).json({
          success: true,
          subscription: subscriptionData,
          message: `🎉 Successfully upgraded to ${tier}! Welcome to EchoEcho ${tier}!`,
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to create subscription', details: error.message });
      }
    }

    if (action === 'check_usdc_balance') {
      // Add rate limiting logic here (e.g., using Redis or in-memory cache)
      const rateLimitKey = `usdc_balance:${userKey}`;
      const rateLimit = await redis.get(rateLimitKey);
      if (rateLimit && rateLimit > 5) {
        return res.status(429).json({ 
          error: 'Too many requests', 
          details: 'You have exceeded the rate limit for USDC balance checks.'
        });
      }
      await redis.incr(rateLimitKey);
      await redis.expire(rateLimitKey, 3600); // 1-hour window

      try {
        const balance = await publicClient.readContract({
          address: USDC_CONTRACT,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [userKey],
        });

        const formattedBalance = Number(formatUnits(balance, 6));

        return res.status(200).json({
          balance: formattedBalance,
          formatted: `${formattedBalance} USDC`,
          network: 'base',
          contract: USDC_CONTRACT,
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to check USDC balance', details: error.message });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      pricing: {
        premium: 7,
        pro: 25,
      },
      features: {
        free: {
          daily_echoes: 5,
          cross_platform: false,
          nft_rarities: ['common'],
          analytics: false,
        },
        premium: {
          daily_echoes: 'unlimited',
          cross_platform: true,
          nft_rarities: ['common', 'rare', 'epic'],
          analytics: true,
        },
        pro: {
          daily_echoes: 'unlimited',
          cross_platform: true,
          nft_rarities: ['common', 'rare', 'epic', 'legendary'],
          analytics: true,
        },
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
