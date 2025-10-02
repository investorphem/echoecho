import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, message, signature, address } = req.body;
    if (!fid || !message || !signature || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Verify FID (optional: query Farcaster API or contract)
    let username = 'unknown';
    // Example: const userResponse = await fetch(`https://api.farcaster.xyz/v2/user/${fid}`);
    // if (userResponse.ok) username = (await userResponse.json()).username;

    // Issue session JWT
    const sessionToken = jwt.sign(
      { fid, address, username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      fid,
      username,
      address,
      token: sessionToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}