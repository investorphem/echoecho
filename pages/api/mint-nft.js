import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import { saveNFT } from '../../lib/storage.js';
import { createHelia } from 'helia';
import { json } from '@helia/json';

const _publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// NFT contract on Base (replace with your contract)
const _NFT_CONTRACT = process.env.NFT_CONTRACT || '0xea2a41c02fa86a4901826615f9796e603c6a4491';
const IPFS_API_KEY = process.env.IPFS_API_KEY;
const IPFS_API_SECRET = process.env.IPFS_API_SECRET;

// Minimal ABI for minting
const _NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { narrative, userAddress, rarity = 'common' } = req.body;

    // Validate inputs
    if (!userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid user wallet address required' });
    }
    if (!narrative?.text || !narrative?.source) {
      return res.status(400).json({ error: 'Valid narrative text and source required' });
    }
    const validRarities = ['common', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      return res.status(400).json({ error: 'Invalid rarity' });
    }

    // Create NFT metadata
    const metadata = {
      title: `Insight Token: ${narrative.source} Echo`,
      description: `Counter-narrative discovered from ${narrative.source}`,
      attributes: [
        { trait_type: 'Source', value: narrative.source },
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Discovery Date', value: new Date().toDateString() },
      ],
    };

    // Initialize Helia with Pinata pinning
    const helia = await createHelia({
      pinata: {
        apiKey: IPFS_API_KEY,
        apiSecret: IPFS_API_SECRET,
        gateway: 'https://ipfs.io',
      },
    });
    const jsonClient = json(helia);

    // Upload metadata to IPFS
    const cid = await jsonClient.add(metadata);
    const ipfsUrl = `https://ipfs.io/ipfs/${cid.toString()}`;

    // Note: Actual minting requires a wallet client with private key (not secure in API route)
    // For production, move minting to client-side or a secure backend service
    // Simulate minting call (replace with actual contract interaction)
    const tokenId = Date.now(); // Placeholder; replace with real token ID from contract
    // Example minting (uncomment for client-side or secure backend):
    /*
    const walletClient = createWalletClient({...});
    const { request } = await _publicClient.simulateContract({
      address: _NFT_CONTRACT,
      abi: _NFT_ABI,
      functionName: 'mint',
      args: [userAddress, ipfsUrl],
    });
    const transactionHash = await walletClient.writeContract(request);
    const receipt = await _publicClient.waitForTransactionReceipt({ hash: transactionHash });
    const tokenId = receipt.logs[0].topics[3]; // Adjust based on contract
    */

    const insightToken = {
      id: tokenId.toString(),
      contract_address: _NFT_CONTRACT,
      narrative: narrative.text,
      source: narrative.source,
      rarity,
      minted_at: new Date().toISOString(),
      owner: userAddress.toLowerCase(),
      metadata: {
        ...metadata,
        image: ipfsUrl,
      },
    };

    // Save to database
    await saveNFT(insightToken);

    res.status(200).json({
      success: true,
      token: insightToken,
      transaction_hash: '0x_pending', // Placeholder; replace with real hash
      message: '🎉 Insight Token minting initiated! Check blockchain for confirmation.',
    });
  } catch (error) {
    console.error('NFT minting error:', error);
    return res.status(500).json({ error: `Failed to mint NFT: ${error.message}` });
  }
}
