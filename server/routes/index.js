const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');

const { authenticate, requireAdmin, checkWalletNotFrozen } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const walletCtrl = require('../controllers/walletController');
const notifCtrl = require('../controllers/notificationController');
const adminCtrl = require('../controllers/adminController');
const userCtrl = require('../controllers/userController');

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many attempts. Try again later.' } });
const txnLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

// Multer for avatar upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
}});

// ── AUTH ──────────────────────────────────────────────────
router.post('/auth/register', authLimiter, authCtrl.register);
router.post('/auth/login', authLimiter, authCtrl.login);
router.post('/auth/refresh', authCtrl.refreshToken);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.post('/auth/forgot-password', authLimiter, authCtrl.forgotPassword);
router.post('/auth/reset-password', authLimiter, authCtrl.resetPassword);
router.get('/auth/me', authenticate, authCtrl.getMe);

// ── USER ──────────────────────────────────────────────────
router.put('/user/profile', authenticate, userCtrl.updateProfile);
router.post('/user/avatar', authenticate, upload.single('avatar'), userCtrl.uploadAvatar);
router.put('/user/password', authenticate, userCtrl.changePassword);
router.get('/user/lookup', authenticate, userCtrl.lookupUser);

// ── WALLET ────────────────────────────────────────────────
router.get('/wallet', authenticate, walletCtrl.getWallet);
router.post('/wallet/add-money', authenticate, txnLimiter, walletCtrl.addMoney);
router.post('/wallet/withdraw', authenticate, txnLimiter, checkWalletNotFrozen, walletCtrl.withdraw);
router.post('/wallet/send', authenticate, txnLimiter, checkWalletNotFrozen, walletCtrl.sendMoney);
router.get('/wallet/transactions', authenticate, walletCtrl.getTransactions);
router.get('/wallet/analytics', authenticate, walletCtrl.getAnalytics);

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', authenticate, notifCtrl.getNotifications);
router.put('/notifications/:id/read', authenticate, notifCtrl.markRead);
router.put('/notifications/mark-all-read', authenticate, notifCtrl.markAllRead);
router.delete('/notifications/:id', authenticate, notifCtrl.deleteNotification);

// ── ADMIN ─────────────────────────────────────────────────
router.get('/admin/dashboard', authenticate, requireAdmin, adminCtrl.getDashboardStats);
router.get('/admin/users', authenticate, requireAdmin, adminCtrl.getUsers);
router.put('/admin/users/:userId/freeze', authenticate, requireAdmin, adminCtrl.freezeWallet);
router.put('/admin/users/:userId/unfreeze', authenticate, requireAdmin, adminCtrl.unfreezeWallet);
router.put('/admin/users/:userId/disable', authenticate, requireAdmin, adminCtrl.disableUser);
router.put('/admin/users/:userId/enable', authenticate, requireAdmin, adminCtrl.enableUser);
router.get('/admin/transactions', authenticate, requireAdmin, adminCtrl.getAllTransactions);
router.get('/admin/fraud-alerts', authenticate, requireAdmin, adminCtrl.getFraudAlerts);
router.put('/admin/fraud-alerts/:alertId/resolve', authenticate, requireAdmin, adminCtrl.resolveFraudAlert);
router.post('/admin/users/:userId/notify', authenticate, requireAdmin, adminCtrl.sendNotificationToUser);

module.exports = router;