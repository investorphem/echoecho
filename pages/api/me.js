// pages/api/me.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    // Replace with your Farcaster app's public key or verification logic
    // See Farcaster docs for public key: https://docs.farcaster.xyz/miniapp/auth
    const publicKey = process.env.FARCASTER_PUBLIC_KEY; // Set in .env.local
    const verified = jwt.verify(token, publicKey, { algorithms: ['ES256'] });

    if (verified) {
      res.status(200).json({ fid: verified.fid, username: verified.username || 'unknown' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}