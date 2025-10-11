import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import { getUserEchoes, getUserNFTs, saveEcho } from '../../lib/storage.js';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk'; // ✅ Import Configuration too

// ✅ Correct Neynar v2 initialization
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
  baseOptions: {
    headers: {
      'x-neynar-experimental': true,
    },
  },
});
const client = new NeynarAPIClient(config);

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// NFT contract on Base
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

// Minimal ABI for NFT balanceOf, tokenOfOwnerByIndex, and tokenURI
const NFT_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userAddress } = req.query;

    if (!userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const userKey = userAddress.toLowerCase();

    try {
      const echoes = await getUserEchoes(userKey);

      // Query blockchain for NFTs
      let nfts = [];
      if (NFT_CONTRACT) {
        try {
          const balance = await publicClient.readContract({
            address: NFT_CONTRACT,
            abi: NFT_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          });

          for (let i = 0; i < Number(balance); i++) {
            const tokenId = await publicClient.readContract({
              address: NFT_CONTRACT,
              abi: NFT_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [userAddress, i],
            });
            const tokenURI = await publicClient.readContract({
              address: NFT_CONTRACT,
              abi: NFT_ABI,
              functionName: 'tokenURI',
              args: [tokenId],
            });

            let metadata = {};
            try {
              const url = tokenURI.startsWith('ipfs://')
                ? `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}`
                : tokenURI;
              const response = await fetch(url);
              if (response.ok) {
                metadata = await response.json();
              }
            } catch (fetchError) {
              console.error(`Failed to fetch metadata for token ${tokenId}:`, fetchError);
            }

            nfts.push({
              id: tokenId.toString(),
              title: metadata.name || `Insight Token #${tokenId}`,
              rarity:
                metadata.attributes?.find((attr) => attr.trait_type === 'Rarity')?.value || 'common',
              minted_at: metadata.minted_at || new Date().toISOString(),
              image: metadata.image || 'https://your-cdn.com/default-nft.png',
            });
          }
        } catch (contractError) {
          console.error('Error querying NFT contract:', contractError);
        }
      } else {
        console.warn('NEXT_PUBLIC_NFT_CONTRACT_ADDRESS not set. Skipping blockchain NFT fetch.');
      }

      const storedNFTs = await getUserNFTs(userKey);
      const combinedNFTs = [...nfts, ...storedNFTs];

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
      console.error('Error fetching user echoes/NFTs:', error);
      return res.status(500).json({ error: `Failed to fetch user data: ${error.message}` });
    }
  }

  if (req.method === 'POST') {
    const { castId, userAddress, type = 'standard', source = 'farcaster', trustedData } = req.body;

    if (!castId || !userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid castId and userAddress required' });
    }

    if (!['standard', 'counter_narrative'].includes(type)) {
      return res.status(400).json({ error: 'Invalid echo type' });
    }

    // ✅ Updated Frame validation for Neynar SDK v2
    if (trustedData?.messageBytes) {
      try {
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
      } catch (frameError) {
        console.error('Frame validation error:', frameError);
        return res.status(401).json({ error: `Frame validation failed: ${frameError.message}` });
      }
    } else {
      return res.status(400).json({ error: 'Missing trustedData for Frame validation' });
    }

    try {
      const newEcho = {
        id: `echo_${Date.now()}`,
        cast_id: castId,
        user_address: userAddress.toLowerCase(),
        type,
        source,
        echoed_at: new Date().toISOString(),
      };

      await saveEcho(newEcho);

      return res.status(200).json({
        success: true,
        echo: newEcho,
      });
    } catch (error) {
      console.error('Error recording echo:', error);
      return res.status(500).json({ error: `Failed to record echo: ${error.message}` });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}