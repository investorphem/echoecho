import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        wallet_address VARCHAR(42) PRIMARY KEY,
        tier VARCHAR(20) NOT NULL,
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `;
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
    console.log('Database schema initialized successfully');
    return res.status(200).json({ success: true, message: 'Database schema initialized' });
  } catch (error) {
    console.error('Error initializing database:', error.message);
    return res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  }
}
