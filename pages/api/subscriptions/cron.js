import { NeynarClient } from '@neynar/nodejs-sdk';
import {
  getExpiringSubscriptions,
  markReminderSent,
  expireSubscription,
  getAllActiveSubscriptions,
  reconcileUserStatus,
  getUser,
} from '../../../lib/storage.js';

const CRON_SECRET = process.env.CRON_SECRET;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || 'https://echoechos.vercel.app';

if (!CRON_SECRET) {
  throw new Error('CRON_SECRET environment variable must be set for security');
}

if (!NEXT_PUBLIC_URL) {
  throw new Error('NEXT_PUBLIC_URL environment variable must be set for notifications');
}

// Initialize Neynar client
const client = new NeynarClient({ apiKey: process.env.NEYNAR_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate empty body
  if (Object.keys(req.body).length > 0) {
    return res.status(400).json({ error: 'No body expected for cron endpoint' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = {
      reminders_3d: 0,
      reminders_1d: 0,
      downgrades: 0,
      reconciliations: 0,
      errors: [],
    };

    // Process 3-day reminders
    try {
      const expiring3d = await getExpiringSubscriptions(3);
      for (const subscription of expiring3d) {
        if (!subscription.last_reminder_3d_at) {
          const user = await getUser(subscription.wallet_address);
          if (user?.notification_token && user?.notification_url) {
            try {
              await client.casts.create({
                text: `EchoEcho Subscription Reminder\nYour ${subscription.tier} subscription expires in 3 days! Renew now at ${NEXT_PUBLIC_URL}/premium`,
                channelId: 'your-channel-id', // Replace with your Farcaster channel ID
                embeds: [{ url: `${NEXT_PUBLIC_URL}/premium` }],
              });
              await markReminderSent(subscription.id, '3d');
              results.reminders_3d++;
            } catch (notificationError) {
              console.error(`Failed to send 3d notification for ${subscription.wallet_address}:`, notificationError);
              results.errors.push(`3d notification error for ${subscription.wallet_address}: ${notificationError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('3-day reminders error:', error);
      results.errors.push(`3-day reminders error: ${error.message}`);
    }

    // Process 1-day reminders
    try {
      const expiring1d = await getExpiringSubscriptions(1);
      for (const subscription of expiring1d) {
        if (!subscription.last_reminder_1d_at) {
          const user = await getUser(subscription.wallet_address);
          if (user?.notification_token && user?.notification_url) {
            try {
              await client.casts.create({
                text: `EchoEcho Subscription Reminder\nYour ${subscription.tier} subscription expires tomorrow! Renew now at ${NEXT_PUBLIC_URL}/premium`,
                channelId: 'your-channel-id', // Replace with your Farcaster channel ID
                embeds: [{ url: `${NEXT_PUBLIC_URL}/premium` }],
              });
              await markReminderSent(subscription.id, '1d');
              results.reminders_1d++;
            } catch (notificationError) {
              console.error(`Failed to send 1d notification for ${subscription.wallet_address}:`, notificationError);
              results.errors.push(`1d notification error for ${subscription.wallet_address}: ${notificationError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('1-day reminders error:', error);
      results.errors.push(`1-day reminders error: ${error.message}`);
    }

    // Process expired subscriptions (downgrade)
    try {
      const allActiveSubscriptions = await getAllActiveSubscriptions();
      const now = new Date();

      for (const subscription of allActiveSubscriptions) {
        const expiryDate = new Date(subscription.expires_at);
        if (now > expiryDate && subscription.status === 'active') {
          const user = await getUser(subscription.wallet_address);
          if (user?.notification_token && user?.notification_url) {
            try {
              await client.casts.create({
                text: `EchoEcho Subscription Expired\nYour ${subscription.tier} subscription has expired and been downgraded to free. Upgrade again at ${NEXT_PUBLIC_URL}/premium`,
                channelId: 'your-channel-id', // Replace with your Farcaster channel ID
                embeds: [{ url: `${NEXT_PUBLIC_URL}/premium` }],
              });
            } catch (notificationError) {
              console.error(`Failed to send downgrade notification for ${subscription.wallet_address}:`, notificationError);
              results.errors.push(`Downgrade notification error for ${subscription.wallet_address}: ${notificationError.message}`);
            }
          }
          await expireSubscription(subscription.id);
          await reconcileUserStatus(subscription.wallet_address);
          results.downgrades++;
          results.reconciliations++;
        }
      }
    } catch (error) {
      console.error('Downgrade processing error:', error);
      results.errors.push(`Downgrade processing error: ${error.message}`);
    }

    console.log('Cron job completed:', results);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      message: error.message || 'Unknown error',
    });
  }
}

// Helper function to get days until expiration
export const getDaysUntilExpiration = (expiresAt) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};
