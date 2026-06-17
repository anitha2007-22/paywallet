const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { createNotification } = require('../utils/notifications');
const { checkFraudOnLogin } = require('../utils/fraud');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { full_name, email, phone, password } = req.body;

    const existing = await client.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING id, full_name, email, role`,
      [full_name, email, phone, password_hash]
    );

    await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00)', [user.id]);

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    await client.query(
      `INSERT INTO sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, req.ip, req.headers['user-agent']]
    );

    await client.query('COMMIT');

    await createNotification(user.id, '🎉 Welcome to PayWallet!', 'Your account is ready. Add money to get started.', 'success');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query(
      `SELECT u.*, w.balance FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await db.query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
        [user.id]
      );
      await checkFraudOnLogin(user.id, user.failed_login_attempts + 1);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await db.query(
      'UPDATE users SET failed_login_attempts = 0, last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    await db.query(
      `INSERT INTO sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, req.ip, req.headers['user-agent']]
    );

    await createNotification(
      user.id,
      '🔐 New Login',
      `Login from ${req.ip || 'unknown location'} at ${new Date().toLocaleString()}`,
      'info'
    );

    const { password_hash, otp_code, reset_token, two_factor_secret, ...safeUser } = user;
    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const { rows } = await db.query(
      'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows[0]) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows: [user] } = await db.query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);

    const tokens = generateTokens(user.id, user.role);
    await db.query(
      `UPDATE sessions SET refresh_token = $1, expires_at = NOW() + INTERVAL '7 days' WHERE refresh_token = $2`,
      [tokens.refreshToken, refreshToken]
    );

    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token refresh failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
    if (!rows[0]) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = uuidv4();
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [token, rows[0].id]
    );

    // In production, send email with token
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ success: true, message: 'Password reset instructions sent to your email', debug_token: process.env.NODE_ENV === 'development' ? token : undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const { rows } = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!rows[0]) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    const password_hash = await bcrypt.hash(password, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [password_hash, rows[0].id]
    );

    await db.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.avatar_url,
              u.is_verified, u.two_factor_enabled, u.last_login_at, u.created_at,
              w.balance, w.currency, w.is_active as wallet_active, u.wallet_frozen
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};