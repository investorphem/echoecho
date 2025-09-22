import { sql } from '@vercel/postgres';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

// Initialize viem public client
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SUBSCRIPTION_WALLET = process.env.SUBSCRIPTION_WALLET || '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62'; // Fallback for testing

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
    console.error('BASE_RPC_URL is not set');
    return res.status(500).json({ error: 'Server configuration error: BASE_RPC_URL missing' });
  }

  if (req.method === 'POST') {
    const { walletAddress, action, tier, transactionHash } = req.body;
    console.log('Subscription request:', { walletAddress, action, tier, transactionHash });

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.warn('Invalid or missing walletAddress:', walletAddress);
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const userKey = walletAddress.toLowerCase();

    if (action === 'get_subscription') {
      try {
        // Fetch user subscription
        const { rows: subscriptions } = await sql`
          SELECT * FROM subscriptions
          WHERE wallet_address = ${userKey}
          ORDER BY created_at DESC
          LIMIT 1
        `;

        let tier = 'free';
        let subscription = null;

        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          const expiresAt = new Date(sub.expires_at);
          const now = new Date();

          // Check if subscription is still active
          if (expiresAt > now) {
            tier = sub.tier;
            subscription = {
              tier: sub.tier,
              transaction_hash: sub.transaction_hash,
              created_at: sub.created_at,
              expires_at: sub.expires_at,
            };
          } else {
            console.log('Subscription expired for:', userKey);
            // Optionally, update user tier to 'free' in the database
            await sql`
              UPDATE subscriptions
              SET tier = 'free'
              WHERE wallet_address = ${userKey}
            `;
          }
        }

        console.log('User subscription:', { userKey, tier, subscription });

        return res.status(200).json({
          user: { tier, walletAddress: userKey },
          subscription,
        });
      } catch (error) {
        console.error('Error getting subscription:', error);
        return res.status(500).json({ error: 'Failed to get subscription', details: error.message });
      }
    }

    if (action === 'create_subscription') {
      if (!['premium', 'pro'].includes(tier)) {
        console.warn('Invalid subscription tier:', tier);
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      if (!transactionHash || !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
        console.warn('Invalid or missing transactionHash:', transactionHash);
        return res.status(400).json({ error: 'Valid transaction hash required' });
      }

      try {
        const pricing = { premium: 7, pro: 25 };
        const amount = BigInt(pricing[tier] * 1e6); // USDC has 6 decimals

        // Verify the transaction on-chain
        const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
        if (!receipt || receipt.status !== 'success') {
          console.warn('Invalid or failed transaction:', transactionHash);
          return res.status(400).json({ error: 'Invalid or failed transaction' });
        }

        // Check for USDC Transfer event
        const transferEvent = receipt.logs.find(
          (log) =>
            log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
            log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        );

        if (!transferEvent) {
          console.warn('No USDC transfer found in transaction:', transactionHash);
          return res.status(400).json({ error: 'No USDC transfer found in transaction' });
        }

        const [, from, to] = transferEvent.topics;
        const value = BigInt(transferEvent.data);

        if (
          from.toLowerCase() !== `0x${userKey.slice(2).padStart(64, '0')}` ||
          to.toLowerCase() !== `0x${SUBSCRIPTION_WALLET.toLowerCase().slice(2).padStart(64, '0')}` ||
          value < amount
        ) {
          console.warn('Invalid USDC transfer details:', { from, to, value, expectedAmount: amount });
          return res.status(400).json({ error: 'Invalid USDC transfer details' });
        }

        // Check if user has an existing active subscription
        const { rows: existingSubs } = await sql`
          SELECT * FROM subscriptions
          WHERE wallet_address = ${userKey}
          AND expires_at > NOW()
          LIMIT 1
        `;

        if (existingSubs.length > 0) {
          console.warn('Active subscription already exists for:', userKey);
          return res.status(400).json({ error: 'User already has an active subscription' });
        }

        // Create subscription
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30-day subscription
        const { rows: newSub } = await sql`
          INSERT INTO subscriptions (wallet_address, tier, transaction_hash, created_at, expires_at)
          VALUES (${userKey}, ${tier}, ${transactionHash}, NOW(), ${expiresAt.toISOString()})
          RETURNING *
        `;

        // Record payment
        await sql`
          INSERT INTO payments (wallet_address, transaction_hash, amount, tier, created_at)
          VALUES (${userKey}, ${transactionHash}, ${pricing[tier]}, ${tier}, NOW())
        `;

        const subscription = {
          tier: newSub[0].tier,
          transaction_hash: newSub[0].transaction_hash,
          created_at: newSub[0].created_at,
          expires_at: newSub[0].expires_at,
        };

        console.log('Subscription created:', subscription);

        return res.status(200).json({
          success: true,
          subscription,
          message: `🎉 Successfully upgraded to ${tier}! Welcome to EchoEcho ${tier}!`,
        });
      } catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({ error: 'Failed to create subscription', details: error.message });
      }
    }

    if (action === 'check_usdc_balance') {
      try {
        const balance = await publicClient.readContract({
          address: USDC_CONTRACT,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [userKey],
        });

        const formattedBalance = Number(formatUnits(balance, 6));
        console.log('USDC balance for', userKey, ':', formattedBalance);

        return res.status(200).json({
          balance: formattedBalance,
          formatted: `${formattedBalance} USDC`,
          network: 'base',
          contract: USDC_CONTRACT,
        });
      } catch (error) {
        console.error('Failed to check USDC balance:', error);
        return res.status(500).json({
          error: 'Failed to check USDC balance',
          details: error.message,
        });
      }
    }

    console.warn('Invalid action:', action);
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
          api_access: true,
          revenue_sharing: true,
        },
      },
      payment_info: {
        network: 'base',
        usdc_contract: USDC_CONTRACT,
        subscription_wallet: SUBSCRIPTION_WALLET,
      },
    });
  }

  console.warn('Invalid method:', req.method);
  return res.status(405).json({ error: 'Method not allowed' });
}
