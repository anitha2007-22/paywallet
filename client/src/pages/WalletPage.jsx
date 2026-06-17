import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function WalletPage() {
  const { refreshUser } = useAuth();
  const [wallet, setWallet]   = useState(null);
  const [tab, setTab]         = useState('add'); // 'add' | 'withdraw'
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod]   = useState('upi');
  const [bankAcc, setBankAcc] = useState('');

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/wallet');
      setWallet(data.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/add-money', { amount: parseFloat(amount), payment_method: method });
      toast.success(data.message);
      setAmount('');
      fetchWallet();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add money');
    } finally { setLoading(false); }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    if (!bankAcc) return toast.error('Enter bank account / UPI ID');
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/withdraw', { amount: parseFloat(amount), bank_account: bankAcc });
      toast.success(data.message);
      setAmount('');
      setBankAcc('');
      fetchWallet();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">My Wallet</h1>

      {/* Balance card */}
      <div className="gradient-card rounded-3xl p-6 text-white relative overflow-hidden shadow-glow">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <p className="text-indigo-200 text-sm">Available Balance</p>
        <p className="text-5xl font-extrabold mt-1 font-mono">{formatCurrency(wallet?.balance || 0)}</p>
        <div className="mt-4 flex gap-4 text-sm text-indigo-200">
          <span>Currency: {wallet?.currency || 'INR'}</span>
          <span>•</span>
          <span className={wallet?.is_active ? 'text-green-300' : 'text-red-300'}>
            {wallet?.is_active ? '● Active' : '● Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {[['add','💰 Add Money'],['withdraw','🏦 Withdraw']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setAmount(''); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === k ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-muted hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {l}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'add' ? (
            <form onSubmit={handleAddMoney} className="space-y-5">
              <div>
                <label className="label">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" className="input pl-8 text-lg font-semibold" min="1" max="100000" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {AMOUNTS.map((a) => (
                    <button key={a} type="button" onClick={() => setAmount(a.toString())}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        amount === a.toString()
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-400'
                      }`}>
                      ₹{a.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['upi','📲 UPI'],['card','💳 Card'],['bank_transfer','🏦 Net Banking']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setMethod(v)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                        method === v ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-muted'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !amount} className="btn-success w-full btn-lg">
                {loading ? 'Processing…' : `Add ${amount ? formatCurrency(parseFloat(amount)) : '₹0'} to Wallet`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-5">
              <div>
                <label className="label">Withdraw Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" className="input pl-8 text-lg font-semibold" min="1" max={wallet?.balance || 0} />
                </div>
                {wallet && <p className="text-xs text-muted mt-1">Available: {formatCurrency(wallet.balance)}</p>}
              </div>

              <div>
                <label className="label">Bank Account / UPI ID</label>
                <input value={bankAcc} onChange={(e) => setBankAcc(e.target.value)}
                  placeholder="e.g. yourname@upi or 1234567890" className="input" />
              </div>

              <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/40 text-xs text-warning-700 dark:text-warning-400">
                ⚠️ Withdrawals may take 1–3 business days to reflect in your bank account.
              </div>

              <button type="submit" disabled={loading || !amount || !bankAcc} className="btn-primary w-full btn-lg">
                {loading ? 'Processing…' : `Withdraw ${amount ? formatCurrency(parseFloat(amount)) : '₹0'}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}