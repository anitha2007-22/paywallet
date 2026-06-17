import React, { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, getInitials } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'transfer', emoji: '💸', label: 'Transfer' },
  { value: 'food',     emoji: '🍔', label: 'Food' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { value: 'utilities',emoji: '⚡', label: 'Utilities' },
  { value: 'entertainment', emoji: '🎬', label: 'Entertainment' },
  { value: 'travel',   emoji: '✈️', label: 'Travel' },
  { value: 'health',   emoji: '🏥', label: 'Health' },
  { value: 'other',    emoji: '📦', label: 'Other' },
];

export default function SendMoneyPage() {
  const { user, refreshUser } = useAuth();
  const [step, setStep]       = useState(1); // 1=recipient, 2=amount, 3=confirm, 4=success
  const [recipient, setRecipient] = useState(null);
  const [lookupId, setLookupId]   = useState('');
  const [amount, setAmount]       = useState('');
  const [remarks, setRemarks]     = useState('');
  const [category, setCategory]   = useState('transfer');
  const [loading, setLoading]     = useState(false);
  const [txnResult, setTxnResult] = useState(null);

  const lookupUser = async () => {
    if (!lookupId.trim()) return toast.error('Enter email or phone');
    setLoading(true);
    try {
      const { data } = await api.get(`/user/lookup?identifier=${encodeURIComponent(lookupId)}`);
      setRecipient(data.data);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'User not found');
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/send', {
        receiver_identifier: lookupId,
        amount: parseFloat(amount),
        remarks,
        category,
      });
      setTxnResult(data.data);
      setStep(4);
      refreshUser();
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep(1); setRecipient(null); setLookupId('');
    setAmount(''); setRemarks(''); setCategory('transfer'); setTxnResult(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="page-header">Send Money</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['Recipient', 'Amount', 'Confirm'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 ${step > i + 1 || step === 4 ? 'text-accent-500' : step === i + 1 ? 'text-primary-600 dark:text-primary-400' : 'text-muted'}`}>
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step > i + 1 || step === 4 ? 'bg-accent-500 text-white' :
                step === i + 1 ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {step > i + 1 || step === 4 ? '✓' : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-accent-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="card p-6">
        {/* Step 1: Find recipient */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="section-title mb-1">Who are you sending to?</h2>
              <p className="text-xs text-muted">Enter email or phone number</p>
            </div>
            <div>
              <label className="label">Email or Phone</label>
              <input value={lookupId} onChange={(e) => setLookupId(e.target.value)}
                placeholder="e.g. friend@email.com or +91 98765 43210"
                className="input" onKeyDown={(e) => e.key === 'Enter' && lookupUser()} />
            </div>
            <button onClick={lookupUser} disabled={loading || !lookupId.trim()} className="btn-primary w-full btn-lg">
              {loading ? 'Searching…' : 'Find Recipient →'}
            </button>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === 2 && recipient && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="w-12 h-12 gradient-card rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {getInitials(recipient.full_name)}
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{recipient.full_name}</p>
                <p className="text-xs text-muted">{recipient.email}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-primary-500 hover:underline">Change</button>
            </div>

            <div>
              <label className="label">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-bold">₹</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="input pl-10 text-2xl font-bold h-14" min="1" autoFocus />
              </div>
            </div>

            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      category === c.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}>
                    <div className="text-xl mb-0.5">{c.emoji}</div>
                    <div className="text-[10px] font-medium text-muted">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Remarks (optional)</label>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Lunch split, Birthday gift…" className="input" maxLength={100} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
              <button onClick={() => { if (!amount || parseFloat(amount) <= 0) { toast.error('Enter amount'); return; } setStep(3); }}
                disabled={!amount} className="btn-primary flex-1">
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && recipient && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="section-title">Confirm Transfer</h2>
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <Row label="To"       value={`${recipient.full_name} (${recipient.email})`} />
              <Row label="Amount"   value={formatCurrency(parseFloat(amount))} bold accent />
              <Row label="Category" value={CATEGORIES.find((c) => c.value === category)?.label} />
              {remarks && <Row label="Remarks" value={remarks} />}
            </div>

            <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/30 text-xs text-warning-700 dark:text-warning-400">
              ⚠️ Please verify the recipient's details. Transfers cannot be undone.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1" disabled={loading}>← Edit</button>
              <button onClick={handleSend} disabled={loading} className="btn-success flex-1 btn-lg">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending…
                  </span>
                ) : `Send ${formatCurrency(parseFloat(amount))}`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && txnResult && (
          <div className="text-center space-y-5 py-4 animate-bounce-in">
            <div className="w-20 h-20 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto text-4xl">
              ✅
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer Successful!</h2>
              <p className="text-muted text-sm mt-1">
                {formatCurrency(parseFloat(amount))} sent to {recipient?.full_name}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-left space-y-2">
              <Row label="Reference" value={txnResult.transaction?.reference_id} mono />
              <Row label="New Balance" value={formatCurrency(txnResult.new_balance)} accent bold />
            </div>
            <button onClick={reset} className="btn-primary w-full btn-lg">Send Another</button>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ label, value, bold, accent, mono }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted">{label}</span>
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${accent ? 'text-accent-600 dark:text-accent-400' : 'text-slate-800 dark:text-slate-200'} ${mono ? 'font-mono text-xs' : ''}`}>
      {value}
    </span>
  </div>
);