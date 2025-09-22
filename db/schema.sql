-- db/schema.sql
CREATE TABLE IF NOT EXISTS subscriptions (
  wallet_address VARCHAR(42) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL,
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  amount DECIMAL NOT NULL,
  tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
