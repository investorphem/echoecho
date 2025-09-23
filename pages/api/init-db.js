import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

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
    // Create subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        wallet_address VARCHAR(42) PRIMARY KEY,
        tier VARCHAR(20) NOT NULL,
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `;
    console.log('Subscriptions table initialized successfully');

    // Create payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        amount DECIMAL NOT NULL,
        tier VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Payments table initialized successfully');

    // Create user_usage table for API call tracking
    await sql`
      CREATE TABLE IF NOT EXISTS user_usage (
        wallet_address VARCHAR(42) NOT NULL,
        usage_date DATE NOT NULL,
        ai_calls_used INTEGER DEFAULT 0,
        trending_api_calls_used INTEGER DEFAULT 0,
        PRIMARY KEY (wallet_address, usage_date)
      )
    `;
    console.log('User_usage table initialized successfully');

    console.log('Database schema initialized successfully');
    return res.status(200).json({ success: true, message: 'Database schema initialized' });
  } catch (error) {
    console.error('Error initializing database:', error.message);
    if (error.message.includes('connection')) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: 'Unable to connect to Neon database. Check DATABASE_URL and network settings.',
      });
    }
    return res.status(500).json({
      error: 'Failed to initialize database',
      details: error.message,
    });
  }
}
