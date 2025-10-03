import jwt from 'jsonwebtoken';
import { getTotalSubscriptionRevenue } from '../../lib/storage';

// Load admin wallets from environment variable
const ADMIN_WALLETS = process.env.ADMIN_WALLETS
  ? process.env.ADMIN_WALLETS.split(',').map(addr => addr.trim().toLowerCase())
  : [];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // Validate wallet address
  const walletAddress = decoded.address;
  if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Invalid wallet address in token' });
  }

  // Admin check
  const userKey = walletAddress.toLowerCase();
  if (!ADMIN_WALLETS.includes(userKey)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  // Alternative admin check (uncomment if using isAdmin in JWT)
  /*
  if (!decoded.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  */

  try {
    const totalUsdc = await getTotalSubscriptionRevenue();
    return res.status(200).json({ total_usdc: totalUsdc, currency: 'USDC' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch revenue', details: error.message });
  }
}