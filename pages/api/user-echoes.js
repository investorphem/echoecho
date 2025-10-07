import { createPublicClient, http, isAddress } from 'viem';
import { base } from 'viem/chains';
import { 
  getUserEchoes, 
  getUserNFTs, 
  saveEcho 
} from '../../lib/storage.js';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

// NFT contract on Base (example, replace with your contract)
const NFT_CONTRACT = '0xea2a41c02fa86a4901826615f9796e603c6a4491'; // Example: Bridge to Base NFT

// Minimal ABI for NFT balanceOf and tokenURI
const NFT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
  'function tokenURI(uint256) view returns (string)'
];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get user's echo history
    const { userAddress } = req.query;

    if (!userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
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
        args: [userAddress]
      });

      const nfts = [];
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [userAddress, i]
        });
        const tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'tokenURI',
          args: [tokenId]
        });
        
        // Assume tokenURI returns JSON metadata (e.g., via IPFS)
        const metadata = await (await fetch(tokenURI)).json();
        nfts.push({
          id: tokenId.toString(),
          title: metadata.name || `Insight Token #${tokenId}`,
          rarity: metadata.rarity || 'common',
          minted_at: new Date().toISOString(), // Replace with real mint timestamp if available
          image: metadata.image || 'https://your-cdn.com/default-nft.png'
        });
      }

      // Query database for NFTs (combine with blockchain data if needed)
      const storedNFTs = await getUserNFTs(userKey);
      const combinedNFTs = [...nfts, ...storedNFTs];

      return res.status(200).json({
        echoes,
        nfts: combinedNFTs,
        stats: {
          total_echoes: echoes.length,
          counter_narratives: echoes.filter(e => e.type === 'counter_narrative').length,
          nfts_minted: combinedNFTs.length
        }
      });
    } catch (error) {
      console.error('Error fetching user echoes/NFTs:', error);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }

  if (req.method === 'POST') {
    // Record a new echo
    const { castId, userAddress, type = 'standard', source = 'farcaster' } = req.body;

    if (!castId || !userAddress || !isAddress(userAddress)) {
      return res.status(400).json({ error: 'Valid castId and userAddress required' });
    }

    if (!['standard', 'counter_narrative'].includes(type)) {
      return res.status(400).json({ error: 'Invalid echo type' });
    }

    try {
      const newEcho = {
        id: `echo_${Date.now()}`,
        cast_id: castId,
        user_address: userAddress.toLowerCase(),
        type,
        source,
        echoed_at: new Date().toISOString()
      };

      // Save to database
      await saveEcho(newEcho);

      return res.status(200).json({
        success: true,
        echo: newEcho
      });
    } catch (error) {
      console.error('Error recording echo:', error);
      return res.status(500).json({ error: 'Failed to record echo' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}