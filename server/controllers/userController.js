const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const { rows: [user] } = await db.query(
      'UPDATE users SET full_name = $1, phone = $2, updated_at = NOW() WHERE id = $3 RETURNING id, full_name, email, phone, avatar_url, role',
      [full_name, phone, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatar_url = `/uploads/${req.file.filename}`;
    const { rows: [user] } = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
      [avatar_url, req.user.id]
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const { rows: [user] } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    await db.query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);

    res.json({ success: true, message: 'Password changed. Please login again.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

exports.lookupUser = async (req, res) => {
  try {
    const { identifier } = req.query;
    const { rows } = await db.query(
      `SELECT u.full_name, u.email, u.avatar_url,
              SUBSTRING(u.phone, 1, 4) || '******' || SUBSTRING(u.phone, -2) as masked_phone
       FROM users u WHERE u.email = $1 OR u.phone = $1 AND u.id != $2`,
      [identifier, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lookup failed' });
  }
};