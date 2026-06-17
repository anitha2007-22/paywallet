const db = require('../config/database');
const { createNotification } = require('../utils/notifications');
const { emitToUser } = require('../utils/socket');

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let where = "u.role != 'admin'";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)`;
    }

    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.is_active, u.wallet_frozen,
              u.is_verified, u.last_login_at, u.created_at, u.failed_login_attempts,
              w.balance, w.currency
       FROM users u LEFT JOIN wallets w ON w.user_id = u.id
       WHERE ${where} ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM users u WHERE ${where}`, params
    );

    res.json({ success: true, data: { users: rows, total: parseInt(count) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.freezeWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE users SET wallet_frozen = TRUE WHERE id = $1', [userId]);
    await createNotification(userId, '🔒 Wallet Frozen', 'Your wallet has been frozen by admin. Please contact support.', 'warning');
    emitToUser(userId, 'wallet:frozen', {});
    res.json({ success: true, message: 'Wallet frozen' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to freeze wallet' });
  }
};

exports.unfreezeWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE users SET wallet_frozen = FALSE WHERE id = $1', [userId]);
    await createNotification(userId, '🔓 Wallet Unfrozen', 'Your wallet has been unfrozen. You can now use it normally.', 'success');
    emitToUser(userId, 'wallet:unfrozen', {});
    res.json({ success: true, message: 'Wallet unfrozen' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unfreeze wallet' });
  }
};

exports.disableUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
    res.json({ success: true, message: 'User disabled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to disable user' });
  }
};

exports.enableUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE users SET is_active = TRUE WHERE id = $1', [userId]);
    res.json({ success: true, message: 'User enabled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to enable user' });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (page - 1) * limit;
    let where = '1=1';
    const params = [];

    if (type) { params.push(type); where += ` AND t.type = $${params.length}`; }
    if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }

    const { rows } = await db.query(
      `SELECT t.*, s.full_name as sender_name, r.full_name as receiver_name
       FROM transactions t
       LEFT JOIN users s ON s.id = t.sender_id
       LEFT JOIN users r ON r.id = t.receiver_id
       WHERE ${where} ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, params);

    res.json({ success: true, data: { transactions: rows, total: parseInt(count) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

exports.getFraudAlerts = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT fa.*, u.full_name, u.email
       FROM fraud_alerts fa JOIN users u ON u.id = fa.user_id
       WHERE fa.is_resolved = FALSE ORDER BY fa.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch fraud alerts' });
  }
};

exports.resolveFraudAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    await db.query(
      'UPDATE fraud_alerts SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW() WHERE id = $2',
      [req.user.id, alertId]
    );
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
};

exports.sendNotificationToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message, type = 'info' } = req.body;
    await createNotification(userId, title, message, type);
    emitToUser(userId, 'notification:new', { title, message, type });
    res.json({ success: true, message: 'Notification sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days' AND role != 'admin') as new_users_month,
        (SELECT SUM(balance) FROM wallets) as total_balance,
        (SELECT COUNT(*) FROM transactions WHERE created_at >= TODAY) as transactions_today,
        (SELECT SUM(amount) FROM transactions WHERE type = 'send' AND created_at >= NOW() - INTERVAL '30 days') as volume_month,
        (SELECT COUNT(*) FROM fraud_alerts WHERE is_resolved = FALSE) as open_fraud_alerts
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    // Fallback query
    try {
      const [users, balance, fraudAlerts] = await Promise.all([
        db.query("SELECT COUNT(*) FROM users WHERE role != 'admin'"),
        db.query('SELECT COALESCE(SUM(balance),0) as total FROM wallets'),
        db.query('SELECT COUNT(*) FROM fraud_alerts WHERE is_resolved = FALSE'),
      ]);
      res.json({
        success: true,
        data: {
          total_users: users.rows[0].count,
          total_balance: balance.rows[0].total,
          open_fraud_alerts: fraudAlerts.rows[0].count,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  }
};