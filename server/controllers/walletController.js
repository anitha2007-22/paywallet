const db = require('../config/database');
const { createNotification } = require('../utils/notifications');
const { checkFraudOnTransaction } = require('../utils/fraud');
const { emitToUser } = require('../utils/socket');

exports.getWallet = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT w.*, u.full_name, u.email
       FROM wallets w JOIN users u ON u.id = w.user_id
       WHERE w.user_id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
};

exports.addMoney = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { amount, payment_method = 'bank_transfer' } = req.body;
    const numAmount = parseFloat(amount);

    if (numAmount <= 0 || numAmount > 100000) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Amount must be between ₹1 and ₹1,00,000' });
    }

    if (req.user.wallet_frozen) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Wallet is frozen' });
    }

    const { rows: [txn] } = await client.query(
      `INSERT INTO transactions (receiver_id, amount, type, status, category, remarks, metadata)
       VALUES ($1, $2, 'add_money', 'completed', 'transfer', $3, $4)
       RETURNING *`,
      [req.user.id, numAmount, `Added via ${payment_method}`, JSON.stringify({ payment_method })]
    );

    const { rows: [wallet] } = await client.query(
      'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING balance',
      [numAmount, req.user.id]
    );

    await client.query('COMMIT');

    await createNotification(
      req.user.id,
      '💰 Money Added',
      `₹${numAmount.toLocaleString('en-IN')} has been added to your wallet. New balance: ₹${wallet.balance.toLocaleString('en-IN')}`,
      'success'
    );

    emitToUser(req.user.id, 'wallet:updated', { balance: wallet.balance });
    emitToUser(req.user.id, 'transaction:new', txn);

    res.json({ success: true, message: `₹${numAmount.toLocaleString('en-IN')} added successfully`, data: { transaction: txn, new_balance: wallet.balance } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add money error:', err);
    res.status(500).json({ success: false, message: 'Failed to add money' });
  } finally {
    client.release();
  }
};

exports.withdraw = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { amount, bank_account } = req.body;
    const numAmount = parseFloat(amount);

    const { rows: [wallet] } = await client.query(
      'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );

    if (!wallet || wallet.balance < numAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const { rows: [txn] } = await client.query(
      `INSERT INTO transactions (sender_id, amount, type, status, category, remarks, metadata)
       VALUES ($1, $2, 'withdraw', 'completed', 'transfer', 'Withdrawal to bank', $3)
       RETURNING *`,
      [req.user.id, numAmount, JSON.stringify({ bank_account: bank_account?.slice(-4) })]
    );

    const { rows: [updatedWallet] } = await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 RETURNING balance',
      [numAmount, req.user.id]
    );

    await client.query('COMMIT');

    await createNotification(
      req.user.id,
      '🏦 Withdrawal Initiated',
      `₹${numAmount.toLocaleString('en-IN')} withdrawal is being processed. Ref: ${txn.reference_id}`,
      'info'
    );

    emitToUser(req.user.id, 'wallet:updated', { balance: updatedWallet.balance });

    res.json({ success: true, message: 'Withdrawal initiated', data: { transaction: txn, new_balance: updatedWallet.balance } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Withdrawal failed' });
  } finally {
    client.release();
  }
};

exports.sendMoney = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { receiver_identifier, amount, remarks, category = 'transfer' } = req.body;
    const numAmount = parseFloat(amount);

    if (req.user.wallet_frozen) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Your wallet is frozen' });
    }

    // Find receiver
    const { rows: [receiver] } = await client.query(
      `SELECT u.id, u.full_name, u.email, u.wallet_frozen, w.is_active as wallet_active
       FROM users u JOIN wallets w ON w.user_id = u.id
       WHERE u.email = $1 OR u.phone = $1`,
      [receiver_identifier]
    );

    if (!receiver) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (receiver.id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot send money to yourself' });
    }

    if (receiver.wallet_frozen || !receiver.wallet_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Recipient wallet is unavailable' });
    }

    // Check sender balance
    const { rows: [senderWallet] } = await client.query(
      'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );

    if (!senderWallet || senderWallet.balance < numAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Lock receiver wallet too
    await client.query('SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE', [receiver.id]);

    // Create send transaction
    const { rows: [sendTxn] } = await client.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, status, category, remarks)
       VALUES ($1, $2, $3, 'send', 'completed', $4, $5) RETURNING *`,
      [req.user.id, receiver.id, numAmount, category, remarks]
    );

    // Create receive transaction with same reference
    await client.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, status, category, remarks, reference_id)
       VALUES ($1, $2, $3, 'receive', 'completed', $4, $5, $6)`,
      [req.user.id, receiver.id, numAmount, category, remarks, 'RCV-' + sendTxn.reference_id.slice(4)]
    );

    // Update balances
    const { rows: [newSenderWallet] } = await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 RETURNING balance',
      [numAmount, req.user.id]
    );

    await client.query(
      'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
      [numAmount, receiver.id]
    );

    await client.query('COMMIT');

    // Fraud check (async, don't await)
    checkFraudOnTransaction(req.user.id, numAmount, sendTxn.id).catch(console.error);

    const { rows: [sender] } = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);

    // Notifications
    await createNotification(
      req.user.id,
      '✅ Money Sent',
      `₹${numAmount.toLocaleString('en-IN')} sent to ${receiver.full_name}. Ref: ${sendTxn.reference_id}`,
      'success'
    );

    await createNotification(
      receiver.id,
      '💸 Money Received',
      `₹${numAmount.toLocaleString('en-IN')} received from ${sender?.full_name || 'Someone'}. Ref: ${sendTxn.reference_id}`,
      'success'
    );

    emitToUser(req.user.id, 'wallet:updated', { balance: newSenderWallet.balance });
    emitToUser(req.user.id, 'transaction:new', sendTxn);
    emitToUser(receiver.id, 'money:received', {
      amount: numAmount,
      from: sender?.full_name,
      reference: sendTxn.reference_id,
    });

    res.json({
      success: true,
      message: `₹${numAmount.toLocaleString('en-IN')} sent to ${receiver.full_name}`,
      data: { transaction: sendTxn, new_balance: newSenderWallet.balance, receiver: { full_name: receiver.full_name, email: receiver.email } },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Send money error:', err);
    res.status(500).json({ success: false, message: 'Transfer failed. Please try again.' });
  } finally {
    client.release();
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, search, sort = 'created_at', order = 'DESC', start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['(t.sender_id = $1 OR t.receiver_id = $1)'];
    let params = [req.user.id];
    let paramCount = 1;

    if (type) {
      paramCount++;
      whereConditions.push(`t.type = $${paramCount}`);
      params.push(type);
    }
    if (category) {
      paramCount++;
      whereConditions.push(`t.category = $${paramCount}`);
      params.push(category);
    }
    if (search) {
      paramCount++;
      whereConditions.push(`(t.remarks ILIKE $${paramCount} OR t.reference_id ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    if (start_date) {
      paramCount++;
      whereConditions.push(`t.created_at >= $${paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      paramCount++;
      whereConditions.push(`t.created_at <= $${paramCount}`);
      params.push(end_date + 'T23:59:59');
    }

    const whereStr = whereConditions.join(' AND ');
    const sortCol = ['created_at', 'amount'].includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const { rows: transactions } = await db.query(
      `SELECT t.*,
              s.full_name as sender_name, s.email as sender_email, s.avatar_url as sender_avatar,
              r.full_name as receiver_name, r.email as receiver_email, r.avatar_url as receiver_avatar
       FROM transactions t
       LEFT JOIN users s ON s.id = t.sender_id
       LEFT JOIN users r ON r.id = t.receiver_id
       WHERE ${whereStr}
       ORDER BY t.${sortCol} ${sortOrder}
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const { rows: [countRow] } = await db.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${whereStr}`,
      params
    );

    res.json({
      success: true,
      data: {
        transactions,
        pagination: { total: parseInt(countRow.count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(countRow.count / limit) },
      },
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Daily transactions (last 30 days)
    const { rows: daily } = await db.query(
      `SELECT DATE(created_at) as date, SUM(amount) as total, COUNT(*) as count, type
       FROM transactions
       WHERE (sender_id = $1 OR receiver_id = $1) AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at), type
       ORDER BY date ASC`,
      [userId]
    );

    // Monthly spending (last 6 months)
    const { rows: monthly } = await db.query(
      `SELECT TO_CHAR(created_at, 'Mon YYYY') as month, SUM(amount) as total, type
       FROM transactions
       WHERE (sender_id = $1 OR receiver_id = $1) AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'Mon YYYY'), type
       ORDER BY MIN(created_at) ASC`,
      [userId]
    );

    // Category breakdown
    const { rows: categories } = await db.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE sender_id = $1 AND type IN ('send', 'withdraw') AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY category`,
      [userId]
    );

    // Summary stats
    const { rows: [stats] } = await db.query(
      `SELECT
         SUM(CASE WHEN type IN ('send','withdraw') AND sender_id = $1 THEN amount ELSE 0 END) as total_spent,
         SUM(CASE WHEN type IN ('receive','add_money') AND (receiver_id = $1 OR sender_id IS NULL) THEN amount ELSE 0 END) as total_received,
         COUNT(DISTINCT CASE WHEN type = 'send' THEN id END) as total_sent_count,
         COUNT(DISTINCT CASE WHEN type = 'receive' THEN id END) as total_received_count
       FROM transactions
       WHERE (sender_id = $1 OR receiver_id = $1) AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    res.json({ success: true, data: { daily, monthly, categories, stats } });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};