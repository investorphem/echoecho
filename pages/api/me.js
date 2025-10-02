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

    // Verify the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Verify FID (optional: query Farcaster API to confirm FID matches address)
    // Example: Use Farcaster Hub API or a contract to verify FID ownership
    // For simplicity, assume FID is valid if signature matches address

    // Fetch username (optional: via Farcaster API or Warpcast)
    let username = 'unknown';
    // Example: const userResponse = await fetch(`https://api.farcaster.xyz/v2/user/${fid}`);
    // if (userResponse.ok) username = (await userResponse.json()).username;

    // Issue session JWT
    const sessionToken = jwt.sign(
      { fid, address, username },
      process.env.JWT_SECRET, // Your app’s secret for session JWT
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