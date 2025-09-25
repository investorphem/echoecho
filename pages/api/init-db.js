import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req, res) {
  // Validate request method
  if (req.method !== 'POST') {
    console.warn(`Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return res.status(500).json({ error: 'Server configuration error: DATABASE_URL missing' });
  }

  try {
    // Test database connection
    await sql`SELECT 1 AS test`;
    console.log('Database connection verified');

    // Create users table
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
    console.log('Users table initialized successfully');

    // Create subscriptions table
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
    console.log('Subscriptions table initialized successfully');

    // Create payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        amount_usdc NUMERIC NOT NULL,
        tier TEXT NOT NULL,
        confirmed_at TIMESTAMP NOT NULL
      )`;
    console.log('Payments table initialized successfully');

    // Create user_usage table
    await sql`
      CREATE TABLE IF NOT EXISTS user_usage (
        wallet_address TEXT NOT NULL,
        usage_date DATE NOT NULL,
        ai_calls_used INTEGER DEFAULT 0,
        trending_api_calls_used INTEGER DEFAULT 0,
        PRIMARY KEY (wallet_address, usage_date)
      )`;
    console.log('User_usage table initialized successfully');

    // Create echoes table
    await sql`
      CREATE TABLE IF NOT EXISTS echoes (
        id TEXT PRIMARY KEY,
        user_address TEXT NOT NULL,
        cast_id TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        echoed_at TIMESTAMP NOT NULL
      )`;
    console.log('Echoes table initialized successfully');

    // Create nfts table
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
    console.log('NFTs table initialized successfully');

    // Verify primary key constraint on user_usage
    const constraints = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'user_usage' 
      AND constraint_type = 'PRIMARY KEY';
    `;
    if (constraints.length === 0) {
      console.error('Primary key constraint missing on user_usage');
      throw new Error('Failed to create primary key on user_usage');
    }
    console.log('User_usage primary key verified:', constraints[0].constraint_name);

    console.log('Database schema initialized successfully');
    return res.status(200).json({ success: true, message: 'Database schema initialized' });
  } catch (error) {
    console.error('Error initializing database:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    if (error.message.includes('connection')) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: 'Unable to connect to Neon database. Check DATABASE_URL and network settings.',
      });
    }
    return res.status(500).json({
      error: 'Failed to initialize database',
      details: error.message,
      code: error.code || 'Unknown',
    });
  }
}