const db = require('../config/database');
const { createNotification } = require('./notifications');

const LARGE_TXN_THRESHOLD = parseFloat(process.env.FRAUD_LARGE_TXN_THRESHOLD || '50000');
const RAPID_TXN_COUNT = parseInt(process.env.FRAUD_RAPID_TXN_COUNT || '5');
const RAPID_TXN_WINDOW = parseInt(process.env.FRAUD_RAPID_TXN_WINDOW_MINUTES || '10');
const FAILED_LOGIN_THRESHOLD = parseInt(process.env.FRAUD_FAILED_LOGIN_THRESHOLD || '5');

const createFraudAlert = async (userId, alertType, severity, description, metadata = {}) => {
  try {
    await db.query(
      `INSERT INTO fraud_alerts (user_id, alert_type, severity, description, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, alertType, severity, description, JSON.stringify(metadata)]
    );

    await createNotification(
      userId,
      '🚨 Security Alert',
      description,
      'fraud_alert',
      { alert_type: alertType }
    );
  } catch (err) {
    console.error('Failed to create fraud alert:', err);
  }
};

const checkFraudOnLogin = async (userId, failedAttempts) => {
  if (failedAttempts >= FAILED_LOGIN_THRESHOLD) {
    await createFraudAlert(
      userId,
      'multiple_failed_logins',
      failedAttempts >= 10 ? 'critical' : 'high',
      `${failedAttempts} failed login attempts detected. If this wasn't you, change your password immediately.`,
      { failed_attempts: failedAttempts }
    );
  }
};

const checkFraudOnTransaction = async (userId, amount, transactionId) => {
  // Check large transaction
  if (amount >= LARGE_TXN_THRESHOLD) {
    await createFraudAlert(
      userId,
      'large_transaction',
      amount >= LARGE_TXN_THRESHOLD * 2 ? 'high' : 'medium',
      `Large transaction of ₹${amount.toLocaleString('en-IN')} detected. Contact support if this wasn't you.`,
      { amount, transaction_id: transactionId }
    );
  }

  // Check rapid transactions
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM transactions
     WHERE sender_id = $1 AND type = 'send'
     AND created_at >= NOW() - INTERVAL '${RAPID_TXN_WINDOW} minutes'`,
    [userId]
  );

  if (parseInt(count) >= RAPID_TXN_COUNT) {
    await createFraudAlert(
      userId,
      'rapid_transactions',
      'high',
      `${count} transactions in ${RAPID_TXN_WINDOW} minutes detected. Please verify this activity.`,
      { count, window_minutes: RAPID_TXN_WINDOW }
    );
  }
};

module.exports = { checkFraudOnLogin, checkFraudOnTransaction, createFraudAlert };