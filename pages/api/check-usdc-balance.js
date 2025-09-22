import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
    });
    const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const usdcAbi = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ];
    const balance = await client.readContract({
      address: usdcContractAddress,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [address],
    });
    const balanceInUSDC = formatUnits(balance, 6);
    res.status(200).json({ balance: balanceInUSDC });
  } catch (error) {
    console.error('USDC balance check failed:', error);
    res.status(500).json({ error: 'Failed to check balance', details: error.message });
  }
}
