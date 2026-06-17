# 💳 PayWallet — FinTech Digital Wallet & Payments System

A full-stack digital wallet application inspired by PhonePe, Paytm, and Revolut — built with React, Node.js, PostgreSQL, and Socket.IO.

---

## 🗂️ Project Structure

```
fintech-wallet/
├── backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL pool config
│   ├── controllers/
│   │   ├── authController.js    # Register, login, logout, JWT
│   │   ├── walletController.js  # Balance, add, withdraw, send, analytics
│   │   ├── notificationController.js
│   │   ├── adminController.js   # User management, fraud, stats
│   │   └── userController.js    # Profile, avatar, password
│   ├── middleware/
│   │   └── auth.js              # JWT guard, admin guard, wallet-frozen guard
│   ├── routes/
│   │   └── index.js             # All API routes
│   ├── utils/
│   │   ├── notifications.js     # createNotification helper + Socket.IO emit
│   │   ├── fraud.js             # Fraud detection logic
│   │   └── socket.js            # Socket.IO singleton
│   ├── schema.sql               # PostgreSQL DDL
│   ├── server.js                # Express + Socket.IO entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx         # Auth state, login/logout/register
    │   │   ├── ThemeContext.jsx        # Dark/light mode
    │   │   └── NotificationContext.jsx # Socket.IO + notifications
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── ForgotPasswordPage.jsx  # + ResetPasswordPage
    │   │   ├── DashboardPage.jsx
    │   │   ├── WalletPage.jsx          # Add money / withdraw
    │   │   ├── SendMoneyPage.jsx       # 4-step transfer flow
    │   │   ├── TransactionsPage.jsx    # Search/filter/sort/paginate
    │   │   ├── AnalyticsPage.jsx       # Line, Bar, Doughnut charts
    │   │   ├── NotificationsPage.jsx
    │   │   ├── ProfilePage.jsx         # Edit profile, change password
    │   │   └── AdminPage.jsx           # Users, transactions, fraud alerts
    │   ├── components/
    │   │   ├── auth/AuthLayout.jsx
    │   │   ├── common/AppLayout.jsx    # Sidebar + topbar
    │   │   └── notifications/NotificationDropdown.jsx
    │   ├── utils/
    │   │   ├── api.js                  # Axios + auto token refresh
    │   │   └── helpers.js              # formatCurrency, timeAgo, etc.
    │   ├── styles/index.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Auth | Register, Login, Logout, Forgot/Reset Password, JWT + Refresh Tokens |
| 💳 Wallet | Balance display, Add Money, Withdraw, Freeze/Unfreeze |
| 💸 Send Money | 4-step flow: Lookup → Amount → Confirm → Success |
| 📋 Transactions | Search, filter by type/category/date, sort, paginate, detail modal |
| 📊 Analytics | Line (daily), Bar (monthly), Doughnut (category) charts |
| 🔔 Notifications | Real-time via Socket.IO, browser push, in-app dropdown, mark read/delete |
| 🚨 Fraud Detection | Large txn, rapid txn, failed login alerts |
| 🛡️ Admin | Manage users, freeze wallets, view all transactions, resolve fraud alerts, send notifications |
| 👤 Profile | Edit name/phone, upload avatar, change password |
| 🌙 Dark Mode | System-aware, persisted in localStorage |
| 📱 Responsive | Mobile, tablet, desktop optimised |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env    # Edit with your DB credentials
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set up the database

```bash
createdb paywallet_db
psql paywallet_db -f backend/schema.sql
```

### 3. Configure .env

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/paywallet_db
JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open **http://localhost:3000**

**Demo admin:** `admin@paywallet.com` / `Admin@123`

---

## ☁️ Deploy to Render (Backend) + Vercel (Frontend)

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, select `backend/` as root directory
4. Set:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add environment variables from `.env.example`
6. Add a **PostgreSQL** database on Render, copy the `DATABASE_URL`
7. In the Render Shell, run: `npm run db:setup`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your repo, set root to `frontend/`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```
4. Deploy

### Update CORS on backend

In `.env` on Render:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get tokens |
| POST | `/api/auth/logout` | ✓ | Invalidate session |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| POST | `/api/auth/reset-password` | — | Reset with token |
| GET | `/api/auth/me` | ✓ | Current user profile |
| GET | `/api/wallet` | ✓ | Wallet balance |
| POST | `/api/wallet/add-money` | ✓ | Add funds |
| POST | `/api/wallet/withdraw` | ✓ | Withdraw funds |
| POST | `/api/wallet/send` | ✓ | Send to another user |
| GET | `/api/wallet/transactions` | ✓ | Paginated history |
| GET | `/api/wallet/analytics` | ✓ | Chart data |
| GET | `/api/notifications` | ✓ | Get notifications |
| PUT | `/api/notifications/:id/read` | ✓ | Mark read |
| DELETE | `/api/notifications/:id` | ✓ | Delete |
| GET | `/api/user/lookup?identifier=` | ✓ | Find user by email/phone |
| PUT | `/api/user/profile` | ✓ | Update name/phone |
| POST | `/api/user/avatar` | ✓ | Upload avatar |
| PUT | `/api/user/password` | ✓ | Change password |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/:id/freeze` | Admin | Freeze wallet |
| GET | `/api/admin/fraud-alerts` | Admin | Open fraud alerts |

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Chart.js, Socket.IO Client, React Hot Toast

**Backend:** Node.js, Express, PostgreSQL (pg), Socket.IO, JWT (jsonwebtoken), bcryptjs, express-rate-limit, multer, helmet

---

## 📄 License
MIT