import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, message, signature, address, username } = req.body;
    if (!fid || !message || !signature || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature using ethers v5
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Mock user data (avoiding database)
    const user = {
      fid: parseInt(fid),
      walletAddress: address,
      username: username || 'unknown',
      tier: 'free', // Default tier; adjust based on logic
    };

    // Generate JWT
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
  } catch (error) {
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}