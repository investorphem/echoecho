import { saveUserNotificationDetails } from '../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress, notificationToken, notificationUrl } = req.body;

  if (!userAddress || !notificationToken || !notificationUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await saveUserNotificationDetails(userAddress.toLowerCase(), {
      token: notificationToken,
      url: notificationUrl
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating notification token:', error);
    return res.status(500).json({ error: 'Failed to update notification details' });
  }
}