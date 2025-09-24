import { NeynarClient } from '@neynar/nodejs-sdk';
import { getAllUsersWithNotifications } from '../../lib/storage.js';

const client = new NeynarClient({ apiKey: process.env.NEYNAR_API_KEY });

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
        await client.casts.create({
          text: `${title}\n${body}`,
          channelId: 'your-channel-id', // Replace with your Farcaster channel ID
          embeds: [{ url: user.notification_url }],
        });
        sentCount++;
      }
    }

    return res.status(200).json({ success: true, sent: sentCount });
  } catch (error) {
    console.error('General notification error:', error.message);
    return res.status(500).json({ error: 'Failed to send general notification', details: error.message });
  }
}
