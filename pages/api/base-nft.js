import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
// import { createHelia } from 'helia'; // REMOVED
// import { json } from '@helia/json'; // REMOVED
import { getUserSubscription, saveNFT } from '../../lib/storage.js';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

const _publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// NFT contract on Base
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { narrative, userAddress, rarity = 'common', trustedData, tokenId, transactionHash } = req.body;

    // Validate Frame action
    if (trustedData?.messageBytes) {
      const result = await client.validateFrameAction({
        messageBytesInHex: trustedData.messageBytes,
      });
      if (!result.valid || result.action.interactor.fid !== Number(req.body.untrustedData?.fid)) {
        return res.status(401).json({ error: 'Invalid Frame action' });
      }
      const verifiedAddresses = result.action.interactor.verified_addresses.eth_addresses;
      if (!verifiedAddresses.includes(userAddress.toLowerCase())) {
        return res.status(401).json({ error: 'User address does not match Frame interactor' });
      }
    } else {
      return res.status(400).json({ error: 'Missing trustedData for Frame validation' });
    }

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
    if (!tokenId || !transactionHash) {
      return res.status(400).json({ error: 'Token ID and transaction hash required' });
    }

    // Verify subscription
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';
    const mintLimits = { free: 2, premium: 50, pro: 'unlimited' };
    if (mintLimits[userTier] !== 'unlimited' && mintLimits[userTier] <= 0) {
      return res.status(403).json({ error: `NFT minting limit reached for ${userTier} tier` });
    }

    // Initialize Helia for IPFS - LOGIC REMOVED
    // const helia = await createHelia();
    // const ipfs = json(helia);

    // Create metadata (Placeholder URI since IPFS upload is disabled)
    const metadata = {
      name: `EchoEcho Insight Token`,
      description: `Counter-narrative discovered: "${narrative.text.slice(0, 100)}..."`,
      attributes: [
        { trait_type: 'Source', value: narrative.source },
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Echo Type', value: 'Counter-Narrative' },
        { trait_type: 'Discovery Date', value: new Date().toDateString() },
        { trait_type: 'Network', value: 'Base' },
      ],
      external_url: 'https://echoecho.app',
      animation_url: null,
    };
    const metadataURI = `echoecho.app{tokenId}`; // Placeholder URI
    const imageURI = `echoecho.app`; // Placeholder Image

    // Upload metadata to IPFS - LOGIC REMOVED
    // const cid = await ipfs.add(metadata);
    // const metadataURI = `ipfs://${cid.toString()}`;
    // const imageURI = `https://ipfs.io/ipfs/${cid.toString()}`;

    // Pricing from environment variables
    const rarityPricing = {
      common: { eth: process.env.COMMON_PRICE_ETH || '0.001', usd: Number(process.env.COMMON_PRICE_USD || 2.5) },
      rare: { eth: process.env.RARE_PRICE_ETH || '0.005', usd: Number(process.env.RARE_PRICE_USD || 12.5) },
      epic: { eth: process.env.EPIC_PRICE_ETH || '0.01', usd: Number(process.env.EPIC_PRICE_USD || 25) },
      legendary: { eth: process.env.LEGENDARY_PRICE_ETH || '0.02', usd: Number(process.env.LEGENDARY_PRICE_USD || 50) },
    };
    const pricing = rarityPricing[rarity] || rarityPricing.common;

    // Save NFT to database
    const insightToken = {
      id: tokenId.toString(),
      contract_address: NFT_CONTRACT,
      token_id: Number(tokenId),
      network: 'base',
      metadata_uri: metadataURI,
      metadata: { ...metadata, image: imageURI },
      transaction_hash: transactionHash,
      block_number: null,
      minted_at: new Date().toISOString(),
      owner: userAddress.toLowerCase(),
      rarity,
      pricing,
      marketplace_url: `https://opensea.io/assets/base/${NFT_CONTRACT}/${tokenId}`,
    };

    await saveNFT(insightToken);

    res.status(200).json({
      success: true,
      token: insightToken,
      transaction_hash: transactionHash,
      network: 'base',
      explorer_url: `https://basescan.org/tx/${transactionHash}`,
      opensea_url: insightToken.marketplace_url,
      message: `Insight Token #${tokenId} minted on Base! Rarity: ${rarity}`,
    });
  } catch (error) {
    console.error('Base NFT minting error:', error);
    return res.status(500).json({
      error: `Failed to mint NFT: ${error.message}`,
      network: 'base',
    });
  }
}
