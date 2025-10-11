import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isMiniApp = req.headers['x-miniapp'] === 'true'; // MiniApp header
    const { fid, message, signature, address, username } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    let user = {
      fid: fid ? parseInt(fid) : null,
      walletAddress: address,
      username: username || 'unknown',
      tier: 'free', // default tier
    };

    if (!isMiniApp) {
      // Outside MiniApp: verify signature
      if (!fid || !message || !signature) {
        return res.status(400).json({ error: 'Missing required fields for non-MiniApp auth' });
      }

      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Generate JWT for non-MiniApp users
      const sessionToken = jwt.sign(
        { fid, address, username: user.username, tier: user.tier },
        process.env.JWT_SECRET || 'your-secure-secret',
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        fid,
        username: user.username,
        address,
        token: sessionToken,
        tier: user.tier,
        subscription: null, // Mocked; no database
      });
    }

    // MiniApp: skip signature verification & JWT
    return res.status(200).json({
      fid: user.fid,
      username: user.username,
      address: user.walletAddress,
      token: null, // no JWT needed
      tier: user.tier,
      subscription: null, // Mocked; no database
    });

  } catch (error) {
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}