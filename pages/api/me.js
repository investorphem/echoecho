import { verifyMessage } from 'viem';
import jwt from 'jsonwebtoken';
import { getUser, createUser, getUserSubscription } from '../../lib/storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature, address, username } = req.body;
    if (!message || !signature || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature using viem
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user exists, create if not
    let user = await getUser(address);
    if (!user) {
      user = await createUser(address, { username });
    }

    // Fetch subscription status
    const subscription = await getUserSubscription(address);

    // Generate JWT
    const sessionToken = jwt.sign(
      { address, username: user.username || 'unknown', tier: user.tier || 'free' },
      process.env.JWT_SECRET || 'your-secure-secret',
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      address: user.wallet_address,
      username: user.username || 'unknown',
      token: sessionToken,
      tier: user.tier || 'free',
      subscription: subscription || null,
    });
  } catch (error) {
    return res.status(500).json({ error: `Authentication failed: ${error.message}` });
  }
}