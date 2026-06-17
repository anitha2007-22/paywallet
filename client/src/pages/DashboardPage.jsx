import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, timeAgo, txnSign, txnColor, categoryEmoji } from '../utils/helpers';

const StatCard = ({ label, value, icon, color }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

const QuickAction = ({ icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} className="card-hover p-4 flex flex-col items-center gap-2 text-center">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    </button>
  );
};

const txnLabel = (type) => ({
  add_money: 'Money Added',
  withdraw: 'Withdrawal',
  refund: 'Refund',
}[type] || type);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 skeleton w-48 rounded-xl" />
    <div className="h-40 skeleton rounded-3xl" />
    <div className="grid grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
    </div>
    <div className="h-48 skeleton rounded-2xl" />
  </div>
);

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [w, t] = await Promise.all([
          api.get('/wallet'),
          api.get('/wallet/transactions?limit=5'),
        ]);
        setWallet(w.data.data);
        setTxns(t.data.data.transactions);
      } catch { }
      finally { setLoading(false); }
    };
    load();
    refreshUser();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">
            Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted text-sm mt-1">Here's what's happening with your wallet today.</p>
        </div>
        {user?.wallet_frozen && (
          <div className="badge badge-danger text-sm py-1.5 px-3">🔒 Wallet Frozen</div>
        )}
      </div>

      {/* Balance hero card */}
      <div className="gradient-card rounded-3xl p-6 text-white relative overflow-hidden shadow-glow">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium">Total Balance</p>
          <p className="text-4xl font-extrabold mt-1 font-mono tracking-tight">
            {formatCurrency(wallet?.balance || 0)}
          </p>
          <p className="text-indigo-200 text-xs mt-2">{wallet?.currency || 'INR'} • Active Wallet</p>
        </div>
        <div className="relative z-10 mt-4 flex gap-3">
          <button onClick={() => navigate('/wallet')}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl backdrop-blur-sm transition-colors">
            + Add Money
          </button>
          <button onClick={() => navigate('/send')}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl backdrop-blur-sm transition-colors">
            ↗ Send
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon="↗" label="Send"       to="/send"         color="bg-indigo-100 dark:bg-indigo-900" />
          <QuickAction icon="💳" label="Add Money" to="/wallet"       color="bg-emerald-100 dark:bg-emerald-900" />
          <QuickAction icon="📋" label="History"   to="/transactions" color="bg-amber-100 dark:bg-amber-900" />
          <QuickAction icon="📊" label="Analytics" to="/analytics"    color="bg-purple-100 dark:bg-purple-900" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="💸" label="Sent (30d)"     value={formatCurrency(0)} color="bg-red-50 dark:bg-red-900" />
        <StatCard icon="💰" label="Received (30d)" value={formatCurrency(0)} color="bg-emerald-50 dark:bg-emerald-900" />
        <StatCard icon="📦" label="Transactions"   value={txns.length}       color="bg-indigo-50 dark:bg-indigo-900" />
        <StatCard icon="✅" label="Wallet Status"  value={wallet?.is_active ? 'Active' : 'Inactive'} color="bg-slate-50 dark:bg-slate-800" />
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Recent Transactions</h2>
          <button onClick={() => navigate('/transactions')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            View all →
          </button>
        </div>

        <div className="card divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {txns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">💳</p>
              <p className="text-muted text-sm">No transactions yet</p>
              <button onClick={() => navigate('/wallet')} className="btn-primary btn btn-sm mt-3">
                Add Money
              </button>
            </div>
          ) : txns.map((txn) => (
            <div key={txn.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                ['receive', 'add_money'].includes(txn.type)
                  ? 'bg-emerald-100 dark:bg-emerald-900'
                  : 'bg-red-100 dark:bg-red-900'
              }`}>
                {categoryEmoji(txn.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {txn.type === 'receive' ? txn.sender_name :
                   txn.type === 'send' ? txn.receiver_name :
                   txnLabel(txn.type)}
                </p>
                <p className="text-xs text-muted truncate">{txn.remarks || txn.reference_id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${txnColor(txn)}`}>
                  {txnSign(txn, user?.id)}{formatCurrency(txn.amount)}
                </p>
                <p className="text-xs text-muted">{timeAgo(txn.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}