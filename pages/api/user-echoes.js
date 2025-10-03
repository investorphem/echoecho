import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import jwt from 'jsonwebtoken';
import { getUserEchoes, getUserNFTs, saveEcho, saveNFT } from '../../lib/storage';

// NFT contract on Base
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0xea2a41c02fa86a4901826615f9796e603c6a4491';

// Minimal ABI for NFT balanceOf, tokenOfOwnerByIndex, and tokenURI
const NFT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'tokenURI',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'uri', type: 'string' }],
    stateMutability: 'view',
  },
];

export default async function handler(req, res) {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  // Verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secure-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: error.message });
  }

  if (req.method === 'GET') {
    const { userAddress } = req.query;

    // Ensure userAddress matches JWT
    if (!userAddress || !isAddress(userAddress) || userAddress.toLowerCase() !== decoded.address.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid or unauthorized wallet address' });
    }

    const userKey = userAddress.toLowerCase();

    try {
      // Query database for echoes
      const echoes = await getUserEchoes(userKey);

      // Query blockchain for NFTs
      const balance = await publicClient.readContract({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'balanceOf',
        args: [userKey],
      });

      const nfts = [];
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [userKey, BigInt(i)],
        });
        const tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        });

        // Fetch metadata from tokenURI
        let metadata;
        try {
          const response = await fetch(tokenURI);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          metadata = await response.json();
        } catch (error) {
          metadata = { name: `Insight Token #${tokenId}`, image: 'https://your-cdn.com/default-nft.png' };
        }

        const nft = {
          id: `nft_${tokenId}`,
          user_address: userKey,
          token_id: tokenId.toString(),
          title: metadata.name || `Insight Token #${tokenId}`,
          rarity: metadata.rarity || 'common',
          minted_at: new Date().toISOString(), // Replace with blockchain event if available
          image: metadata.image || 'https://your-cdn.com/default-nft.png',
        };

        // Save to database if not already stored
        await saveNFT(nft);
        nfts.push(nft);
      }

      // Query database for stored NFTs
      const storedNFTs = await getUserNFTs(userKey);
      const combinedNFTs = [...nfts, ...storedNFTs.filter((stored) => !nfts.some((nft) => nft.token_id === stored.token_id))];

      return res.status(200).json({
        echoes,
        nfts: combinedNFTs,
        stats: {
          total_echoes: echoes.length,
          counter_narratives: echoes.filter((e) => e.type === 'counter_narrative').length,
          nfts_minted: combinedNFTs.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch user data', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const { castId, userAddress, type = 'standard', source = 'farcaster' } = req.body;

    // Ensure userAddress matches JWT
    if (!castId || !userAddress || !isAddress(userAddress) || userAddress.toLowerCase() !== decoded.address.toLowerCase()) {
      return res.status(400).json({ error: 'Valid castId and authorized userAddress required' });
    }

    if (!['standard', 'counter_narrative'].includes(type)) {
      return res.status(400).json({ error: 'Invalid echo type' });
    }

    try {
      const newEcho = {
        id: `echo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        cast_id: castId,
        user_address: userAddress.toLowerCase(),
        type,
        source,
        echoed_at: new Date().toISOString(),
      };

      // Save to database
      await saveEcho(newEcho);

      return res.status(200).json({
        success: true,
        echo: newEcho,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to record echo', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}