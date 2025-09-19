import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { 
  getUser, 
  createUser, 
  _updateUserTier, 
  createSubscription,
  _getUserSubscription,
  reconcileUserStatus,
  recordPayment
} from '../../lib/storage.js';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SUBSCRIPTION_WALLET = process.env.SUBSCRIPTION_WALLET || '0x4f9B9C40345258684cfe23F02FDb2B88F1d2eA62'; // Fallback for testing

// Minimal ABI for USDC balanceOf and transfer events
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { walletAddress, action } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const userKey = walletAddress.toLowerCase();

    if (action === 'get_subscription') {
      try {
        // Reconcile user status and check for expired subscriptions
        const { tier, subscription } = await reconcileUserStatus(userKey);
        
        let user = await getUser(userKey);
        if (!user) {
          user = await createUser(userKey, { tier });
        }

        return res.status(200).json({
          user: {
            ...user,
            tier,
            walletAddress: userKey
          },
          subscription
        });
      } catch (error) {
        console.error('Error getting subscription:', error);
        return res.status(500).json({ error: 'Failed to get subscription' });
      }
    }

    if (action === 'create_subscription') {
      const { tier, transactionHash } = req.body;
      
      if (!['premium', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      try {
        const pricing = { premium: 7, pro: 25 };
        const amount = BigInt(pricing[tier] * 1e6); // USDC has 6 decimals

        // Verify the transaction on-chain
        const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
        if (!receipt || receipt.status !== 'success') {
          return res.status(400).json({ error: 'Invalid or failed transaction' });
        }

        // Check for USDC Transfer event
        const transferEvent = receipt.logs.find(log => 
          log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event topic
        );

        if (!transferEvent) {
          return res.status(400).json({ error: 'No USDC transfer found in transaction' });
        }

        const [, from, to] = transferEvent.topics;
        const value = BigInt(transferEvent.data);
        
        if (
          from.toLowerCase() !== `0x${userKey.slice(2).padStart(64, '0')}` ||
          to.toLowerCase() !== `0x${SUBSCRIPTION_WALLET.toLowerCase().slice(2).padStart(64, '0')}` ||
          value < amount
        ) {
          return res.status(400).json({ error: 'Invalid USDC transfer details' });
        }

        // Ensure user exists
        let user = await getUser(userKey);
        if (!user) {
          user = await createUser(userKey);
        }

        // Create subscription with persistence
        const subscription = await createSubscription(userKey, tier, transactionHash);
        
        // Record payment
        await recordPayment(userKey, transactionHash, pricing[tier], tier);

        return res.status(200).json({
          success: true,
          subscription,
          message: `🎉 Successfully upgraded to ${tier}! Welcome to EchoEcho ${tier}!`
        });
      } catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({ error: 'Failed to create subscription' });
      }
    }

    if (action === 'check_usdc_balance') {
      try {
        // Query USDC contract on Base
        const balance = await publicClient.readContract({
          address: USDC_CONTRACT,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [walletAddress]
        });

        const formattedBalance = Number(formatUnits(balance, 6)); // USDC has 6 decimals

        return res.status(200).json({
          balance: formattedBalance,
          formatted: `${formattedBalance} USDC`,
          network: 'base',
          contract: USDC_CONTRACT
        });
      } catch (error) {
        console.error('Failed to check USDC balance:', error);
        return res.status(500).json({ 
          error: 'Failed to check USDC balance: ' + error.message 
        });
      }
    }
  }

  if (req.method === 'GET') {
    // Get subscription pricing and info
    return res.status(200).json({
      pricing: {
        premium: 7,
        pro: 25
      },
      features: {
        free: {
          daily_echoes: 5,
          cross_platform: false,
          nft_rarities: ['common'],
          analytics: false
        },
        premium: {
          daily_echoes: 'unlimited',
          cross_platform: true,
          nft_rarities: ['common', 'rare', 'epic'],
          analytics: true
        },
        pro: {
          daily_echoes: 'unlimited',
          cross_platform: true,
          nft_rarities: ['common', 'rare', 'epic', 'legendary'],
          analytics: true,
          api_access: true,
          revenue_sharing: true
        }
      },
      payment_info: {
        network: 'base',
        usdc_contract: USDC_CONTRACT,
        subscription_wallet: SUBSCRIPTION_WALLET
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
