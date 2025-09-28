// pages/api/me.js
import { createClient } from '@farcaster/quick-auth';  // npm install @farcaster/quick-auth

const client = createClient();

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
    const verified = await client.verifyToken(token);

    if (verified) {
      // Fetch additional user data from Neynar API or Hubs if needed
      res.status(200).json({ fid: verified.fid, username: verified.username });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}