import { sendNotification } from '@farcaster/miniapp-node';
import { getAllUsersWithNotifications } from '../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body required' });
  }

  try {
    const users = await getAllUsersWithNotifications();
    let sentCount = 0;

    for (const user of users) {
      if (user.notification_token && user.notification_url) {
        await sendNotification({
          notificationId: `general-${Date.now()}-${sentCount}`,
          title,
          body,
          notificationUrl: user.notification_url,
          token: user.notification_token
        });
        sentCount++;
      }
    }

    return res.status(200).json({ success: true, sent: sentCount });
  } catch (error) {
    console.error('General notification error:', error);
    return res.status(500).json({ error: 'Failed to send general notification' });
  }
}