import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import { create } from 'ipfs-http-client';
import { getUserSubscription, saveNFT } from '../../lib/storage.js';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

// NFT contract on Base
const NFT_CONTRACT = process.env.NFT_CONTRACT || '0xYourNFTContractAddress';
const IPFS_API_KEY = process.env.IPFS_API_KEY;
const IPFS_API_SECRET = process.env.IPFS_API_SECRET;

// Minimal ABI for minting
const NFT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'tokenURI', type: 'string' }
    ],
    name: 'mint',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// Initialize IPFS client (e.g., Pinata)
const ipfs = create({
  host: 'ipfs.pinata.cloud',
  port: 5001,
  protocol: 'https',
  headers: {
    pinata_api_key: IPFS_API_KEY,
    pinata_secret_api_key: IPFS_API_SECRET
  }
});

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

    // Verify subscription for NFT minting
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';
    const mintLimits = { free: 2, premium: 50, pro: 'unlimited' };
    if (mintLimits[userTier] !== 'unlimited' && mintLimits[userTier] <= 0) {
      return res.status(403).json({ error: `NFT minting limit reached for ${userTier} tier` });
    }

    // Create metadata
    const metadata = {
      name: `EchoEcho Insight Token`,
      description: `Counter-narrative discovered: "${narrative.text.slice(0, 100)}..."`,
      attributes: [
        { trait_type: 'Source', value: narrative.source },
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Echo Type', value: 'Counter-Narrative' },
        { trait_type: 'Discovery Date', value: new Date().toDateString() },
        { trait_type: 'Network', value: 'Base' }
      ],
      external_url: 'https://echoecho.app',
      animation_url: null
    };

    // Upload metadata to IPFS
    const { path } = await ipfs.add(JSON.stringify(metadata));
    const metadataURI = `ipfs://${path}`;

    // Pricing from environment variables
    const rarityPricing = {
      common: { eth: process.env.COMMON_PRICE_ETH || '0.001', usd: Number(process.env.COMMON_PRICE_USD || 2.5) },
      rare: { eth: process.env.RARE_PRICE_ETH || '0.005', usd: Number(process.env.RARE_PRICE_USD || 12.5) },
      epic: { eth: process.env.EPIC_PRICE_ETH || '0.01', usd: Number(process.env.EPIC_PRICE_USD || 25) },
      legendary: { eth: process.env.LEGENDARY_PRICE_ETH || '0.02', usd: Number(process.env.LEGENDARY_PRICE_USD || 50) }
    };
    const pricing = rarityPricing[rarity] || rarityPricing.common;

    // Note: Minting requires wallet client (insecure in API route)
    // Move to client-side or secure backend
    // Simulate minting for now (replace with real contract call)
    const simulatedTokenId = Date.now(); // Placeholder
    const simulatedTxHash = '0x_pending'; // Placeholder
    /*
    const walletClient = createWalletClient({...}); // Requires private key
    const { request } = await publicClient.simulateContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mint',
      args: [userAddress, metadataURI]
    });
    const transactionHash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
    const tokenId = receipt.logs[0].topics[3]; // Adjust based on contract
    */

    const insightToken = {
      id: simulatedTokenId.toString(),
      contract_address: NFT_CONTRACT,
      token_id: simulatedTokenId,
      network: 'base',
      metadata_uri: metadataURI,
      metadata: { ...metadata, image: `https://ipfs.io/ipfs/${path}` },
      transaction_hash: simulatedTxHash,
      block_number: null, // Replace with real block number
      minted_at: new Date().toISOString(),
      owner: userAddress.toLowerCase(),
      rarity,
      pricing,
      marketplace_url: `https://opensea.io/assets/base/${NFT_CONTRACT}/${simulatedTokenId}`
    };

    // Save to database
    await saveNFT(insightToken);

    res.status(200).json({
      success: true,
      token: insightToken,
      transaction_hash: simulatedTxHash,
      network: 'base',
      explorer_url: `https://basescan.org/tx/${simulatedTxHash}`,
      opensea_url: insightToken.marketplace_url,
      message: ` Insight Token #${simulatedTokenId} minting initiated on Base! Rarity: ${rarity}`
    });
  } catch (error) {
    console.error('Base NFT minting error:', error);
    return res.status(500).json({
      error: `Failed to mint NFT: ${error.message}`,
      network: 'base'
    });
  }
}