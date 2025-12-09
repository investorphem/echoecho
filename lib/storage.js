import { neon } from '@neondatabase/serverless';
import { isAddress } from 'viem';

// Initialize Neon client with conco ting from environment
const sql = neon(process.env.DATABASE_URL || '');

// Subscription durations fromenvirnlmnt variables with fallback
const SUBSCRIPTION_DURATIONS = {
  free: 0,
  premium: Number(process.env.PREMIUM_DURATION_DAYS || 30) * 24 * 60 * 60 * 1000,
  pro: Number(process.env.PRO_DURATION_DAYS || 30) * 24 * 60 * 60 * 1000,
};

// Initialize schema (cached to run once)
let schemaInitialized = false;
async function initializeSchema() {
  if (schemaInitialized) return;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        farcaster_fid TEXT,
        email TEXT,
        tier TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP,
        notification_token TEXT,
        notification_url TEXT
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        wallet_address TEXT NOT NULL,
        tier TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        next_billing_at TIMESTAMP,
        auto_renew BOOLEAN DEFAULT true,
        last_reminder_3d_at TIMESTAMP,
        last_reminder_1d_at TIMESTAMP,
        transaction_hash TEXT NOT NULL
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        amount_usdc NUMERIC NOT NULL,
        tier TEXT NOT NULL,
        confirmed_at TIMESTAMP NOT NULL
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS echoes (
        id TEXT PRIMARY KEY,
        user_address TEXT NOT NULL,
        cast_id TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        echoed_at TIMESTAMP NOT NULL
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS nfts (
        id TEXT PRIMARY KEY,
        user_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        title TEXT,
        rarity TEXT,
        minted_at TIMESTAMP NOT NULL,
        image TEXT
      )`;
    schemaInitialized = true;
    console.log('Database schema initialized with Neon Postgres');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw new Error('Failed to initialize database schema: ' + error.message);
  }
}

// User management
export async function getUser(walletAddress) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();
  try {
    const rows = await sql`SELECT * FROM users WHERE wallet_address = ${userKey}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Failed to fetch user: ' + error.message);
  }
}

export async function createUser(walletAddress, userInfo = {}) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();
  const validTiers = ['free', 'premium', 'pro'];
  if (userInfo.tier && !validTiers.includes(userInfo.tier)) {
    throw new Error('Invalid tier');
  }
  if (userInfo.email && !userInfo.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new Error('Invalid email');
  }

  // Check if user already exists
  const existingUser = await getUser(userKey);
  if (existingUser) {
    return existingUser;
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const user = {
    id,
    wallet_address: userKey,
    farcaster_fid: userInfo.farcaster_fid || null,
    email: userInfo.email || null,
    tier: userInfo.tier || 'free',
    created_at: new Date().toISOString(),
    updated_at: null,
    notification_token: null,
    notification_url: null,
  };

  try {
    await sql`
      INSERT INTO users (
        id, wallet_address, farcaster_fid, email, tier, created_at, notification_token, notification_url
      )
      VALUES (
        ${user.id}, ${user.wallet_address}, ${user.farcaster_fid}, ${user.email}, ${user.tier},
        ${user.created_at}, ${user.notification_token}, ${user.notification_url}
      )`;
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user: ' + error.message);
  }
}

export async function updateUserTier(walletAddress, tier) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  const validTiers = ['free', 'premium', 'pro'];
  if (!validTiers.includes(tier)) {
    throw new Error('Invalid tier');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  try {
    const rows = await sql`
      UPDATE users
      SET tier = ${tier}, updated_at = ${new Date().toISOString()}
      WHERE wallet_address = ${userKey}
      RETURNING *`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error updating user tier:', error);
    throw new Error('Failed to update user tier: ' + error.message);
  }
}

export async function saveUserNotificationDetails(walletAddress, { token, url }) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  if (!token || !url) {
    throw new Error('Invalid notification details');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  try {
    const rows = await sql`
      UPDATE users
      SET notification_token = ${token},
          notification_url = ${url},
          updated_at = ${new Date().toISOString()}
      WHERE wallet_address = ${userKey}
      RETURNING *`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error saving notification details:', error);
    throw new Error('Failed to save notification details: ' + error.message);
  }
}

export async function getAllUsersWithNotifications() {
  await initializeSchema();
  try {
    const rows = await sql`
      SELECT wallet_address, notification_token, notification_url
      FROM users
      WHERE notification_token IS NOT NULL AND notification_url IS NOT NULL`;
    return rows;
  } catch (error) {
    console.error('Error fetching users with notifications:', error);
    throw new Error('Failed to fetch users with notifications: ' + error.message);
  }
}

// Subscription management
export async function createSubscription(walletAddress, tier, transactionHash) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  const validTiers = ['premium', 'pro'];
  if (!validTiers.includes(tier)) {
    throw new Error('Invalid tier');
  }
  if (!transactionHash || !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid transaction hash');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  let user = await getUser(userKey);
  if (!user) {
    user = await createUser(walletAddress);
  }

  // Check for existing active subscription
  const existingSubscription = await getUserSubscription(userKey);
  if (existingSubscription && new Date(existingSubscription.expires_at) > new Date()) {
    throw new Error('Active subscription already exists');
  }

  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATIONS[tier]);

  const subscription = {
    id: subscriptionId,
    user_id: user.id,
    wallet_address: userKey,
    tier,
    status: 'active',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    next_billing_at: expiresAt.toISOString(),
    auto_renew: true,
    last_reminder_3d_at: null,
    last_reminder_1d_at: null,
    transaction_hash: transactionHash,
  };

  try {
    await sql`
      INSERT INTO subscriptions (
        id, user_id, wallet_address, tier, status, created_at, expires_at, next_billing_at, auto_renew, transaction_hash
      )
      VALUES (
        ${subscription.id}, ${subscription.user_id}, ${subscription.wallet_address}, ${subscription.tier},
        ${subscription.status}, ${subscription.created_at}, ${subscription.expires_at}, ${subscription.next_billing_at},
        ${subscription.auto_renew}, ${subscription.transaction_hash}
      )`;
    await updateUserTier(walletAddress, tier);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription: ' + error.message);
  }
}

export async function saveSubscription(walletAddress, tier, transactionHash, additionalData = {}) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  const validTiers = ['premium', 'pro'];
  if (!validTiers.includes(tier)) {
    throw new Error('Invalid tier');
  }
  if (!transactionHash || !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid transaction hash');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  let user = await getUser(userKey);
  if (!user) {
    user = await createUser(walletAddress);
  }

  // Check for existing active subscription
  const existingSubscription = await getUserSubscription(userKey);
  if (existingSubscription && new Date(existingSubscription.expires_at) > new Date()) {
    throw new Error('Active subscription already exists');
  }

  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATIONS[tier]);

  const subscription = {
    id: subscriptionId,
    user_id: user.id,
    wallet_address: userKey,
    tier,
    status: 'active',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    next_billing_at: expiresAt.toISOString(),
    auto_renew: additionalData.auto_renew ?? true,
    last_reminder_3d_at: null,
    last_reminder_1d_at: null,
    transaction_hash: transactionHash,
  };

  try {
    await sql`
      INSERT INTO subscriptions (
        id, user_id, wallet_address, tier, status, created_at, expires_at, next_billing_at, auto_renew, transaction_hash
      )
      VALUES (
        ${subscription.id}, ${subscription.user_id}, ${subscription.wallet_address}, ${subscription.tier},
        ${subscription.status}, ${subscription.created_at}, ${subscription.expires_at}, ${subscription.next_billing_at},
        ${subscription.auto_renew}, ${subscription.transaction_hash}
      )`;
    await updateUserTier(walletAddress, tier);
    return subscription;
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw new Error('Failed to save subscription: ' + error.message);
  }
}

export async function getUserSubscription(walletAddress) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  try {
    const rows = await sql`
      SELECT * FROM subscriptions
      WHERE wallet_address = ${userKey} AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`;
    const subscription = rows[0] || null;
    if (subscription && new Date(subscription.expires_at) < new Date()) {
      await expireSubscription(subscription.id);
      return null;
    }
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw new Error('Failed to fetch subscription: ' + error.message);
  }
}

export async function getExpiringSubscriptions(daysAhead) {
  await initializeSchema();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  targetDate.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const rows = await sql`
      SELECT * FROM subscriptions
      WHERE status = 'active'
      AND expires_at >= ${today.toISOString()}
      AND expires_at <= ${targetDate.toISOString()}`;
    return rows;
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    throw new Error('Failed to fetch expiring subscriptions: ' + error.message);
  }
}

export async function markReminderSent(subscriptionId, reminderType) {
  await initializeSchema();
  const field = reminderType === '3d' ? 'last_reminder_3d_at' : 'last_reminder_1d_at';
  try {
    await sql`
      UPDATE subscriptions
      SET ${field} = ${new Date().toISOString()}
      WHERE id = ${subscriptionId}`;
  } catch (error) {
    console.error('Error marking reminder sent:', error);
    throw new Error('Failed to mark reminder sent: ' + error.message);
  }
}

export async function expireSubscription(subscriptionId) {
  await initializeSchema();
  try {
    const rows = await sql`
      UPDATE subscriptions
      SET status = 'expired'
      WHERE id = ${subscriptionId}
      RETURNING *`;
    if (rows[0]) {
      await sql`
        UPDATE users
        SET tier = 'free', updated_at = ${new Date().toISOString()}
        WHERE wallet_address = ${rows[0].wallet_address}`;
      return rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error expiring subscription:', error);
    throw new Error('Failed to expire subscription: ' + error.message);
  }
}

export async function getAllActiveSubscriptions() {
  await initializeSchema();
  try {
    const rows = await sql`SELECT * FROM subscriptions WHERE status = 'active'`;
    return rows;
  } catch (error) {
    console.error('Error fetching active subscriptions:', error);
    throw new Error('Failed to fetch active subscriptions: ' + error.message);
  }
}

export async function reconcileUserStatus(walletAddress) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  try {
    const subscription = await getUserSubscription(userKey);
    if (subscription) {
      const now = new Date();
      const expiryDate = new Date(subscription.expires_at);
      if (now > expiryDate) {
        await expireSubscription(subscription.id);
        await updateUserTier(userKey, 'free');
        return { tier: 'free', subscription: null };
      }
      const user = await getUser(userKey);
      return { tier: user?.tier || 'free', subscription };
    }

    const user = await getUser(userKey);
    if (user && user.tier !== 'free') {
      await updateUserTier(userKey, 'free');
    }
    return { tier: 'free', subscription: null };
  } catch (error) {
    console.error('Error reconciling user status:', error);
    throw new Error('Failed to reconcile user status: ' + error.message);
  }
}

export async function recordPayment(walletAddress, transactionHash, amountUsdc, tier) {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  if (!transactionHash || !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid transaction hash');
  }
  if (typeof amountUsdc !== 'number' || amountUsdc <= 0) {
    throw new Error('Invalid USDC amount');
  }
  const validTiers = ['premium', 'pro'];
  if (!validTiers.includes(tier)) {
    throw new Error('Invalid tier');
  }
  await initializeSchema();
  const userKey = walletAddress.toLowerCase();

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const payment = {
    id: paymentId,
    wallet_address: userKey,
    tx_hash: transactionHash,
    amount_usdc: amountUsdc,
    tier,
    confirmed_at: new Date().toISOString(),
  };

  try {
    await sql`
      INSERT INTO payments (
        id, wallet_address, tx_hash, amount_usdc, tier, confirmed_at
      )
      VALUES (
        ${payment.id}, ${payment.wallet_address}, ${payment.tx_hash}, ${payment.amount_usdc}, ${payment.tier}, ${payment.confirmed_at}
      )`;
    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw new Error('Failed to record payment: ' + error.message);
  }
}

// Echoes and NFTs management
export async function getUserEchoes(userKey) {
  if (!isAddress(userKey)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userAddress = userKey.toLowerCase();
  try {
    const rows = await sql`
      SELECT * FROM echoes
      WHERE user_address = ${userAddress}
      ORDER BY echoed_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching user echoes:', error);
    throw new Error('Failed to fetch user echoes: ' + error.message);
  }
}

export async function getUserNFTs(userKey) {
  if (!isAddress(userKey)) {
    throw new Error('Invalid wallet address');
  }
  await initializeSchema();
  const userAddress = userKey.toLowerCase();
  try {
    const rows = await sql`
      SELECT * FROM nfts
      WHERE user_address = ${userAddress}
      ORDER BY minted_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    throw new Error('Failed to fetch user NFTs: ' + error.message);
  }
}

export async function saveEcho(echo) {
  if (!isAddress(echo.user_address)) {
    throw new Error('Invalid wallet address');
  }
  if (!echo.cast_id || !echo.type || !echo.source || !echo.id) {
    throw new Error('Invalid echo data');
  }
  await initializeSchema();
  const userAddress = echo.user_address.toLowerCase();
  try {
    await sql`
      INSERT INTO echoes (
        id, user_address, cast_id, type, source, echoed_at
      )
      VALUES (
        ${echo.id}, ${userAddress}, ${echo.cast_id}, ${echo.type}, ${echo.source}, ${echo.echoed_at}
      )`;
    return true;
  } catch (error) {
    console.error('Error saving echo:', error);
    throw new Error('Failed to save echo: ' + error.message);
  }
}

export async function saveNFT(nft) {
  if (!isAddress(nft.user_address)) {
    throw new Error('Invalid wallet address');
  }
  if (!nft.token_id || !nft.id) {
    throw new Error('Invalid NFT data');
  }
  await initializeSchema();
  const userAddress = nft.user_address.toLowerCase();
  try {
    await sql`
      INSERT INTO nfts (
        id, user_address, token_id, title, rarity, minted_at, image
      )
      VALUES (
        ${nft.id}, ${userAddress}, ${nft.token_id}, ${nft.title || null}, ${nft.rarity || 'common'}, ${nft.minted_at}, ${nft.image || null}
      )
      ON CONFLICT (id) DO NOTHING`;
    return true;
  } catch (error) {
    console.error('Error saving NFT:', error);
    throw new Error('Failed to save NFT: ' + error.message);
  }
}
