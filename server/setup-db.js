const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://paywallet_db_user:eCo6ZYRFPkAY7NvJK5jSw8lZ19EGTPvA@dpg-d8p3abegvqtc738pgvrg-a.singapore-postgres.render.com/paywallet_db',
  ssl: { rejectUnauthorized: false }
});

const setup = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        wallet_frozen BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        otp_code VARCHAR(10),
        otp_expires_at TIMESTAMPTZ,
        reset_token TEXT,
        reset_token_expires TIMESTAMPTZ,
        failed_login_attempts INTEGER DEFAULT 0,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ users table done');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(5) DEFAULT 'INR',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ wallets table done');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID REFERENCES users(id),
        receiver_id UUID REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(30) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        category VARCHAR(50) DEFAULT 'transfer',
        remarks TEXT,
        reference_id VARCHAR(50) UNIQUE DEFAULT ('TXN' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT,1,12))),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ transactions table done');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ notifications table done');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        description TEXT,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ fraud_alerts table done');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ sessions table done');

    await pool.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_active)
      VALUES ('System Admin', 'admin@paywallet.com', '+919999999999',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/kV62lzTFC',
      'admin', TRUE, TRUE)
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ admin user created');

    await pool.query(`
      INSERT INTO wallets (user_id, balance)
      SELECT id, 50000.00 FROM users WHERE email = 'admin@paywallet.com'
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log('✅ admin wallet created');

    console.log('🎉 Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

setup();