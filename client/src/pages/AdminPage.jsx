import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime, getInitials, timeAgo } from '../utils/helpers';

const TABS = ['users', 'transactions', 'fraud'];

export default function AdminPage() {
  const [tab, setTab]           = useState('users');
  const [users, setUsers]       = useState([]);
  const [txns, setTxns]         = useState([]);
  const [fraud, setFraud]       = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [notifModal, setNotifModal] = useState(null);
  const [notifForm, setNotifForm]   = useState({ title: '', message: '', type: 'info' });

  const load = async () => {
    setLoading(true);
    try {
      const [u, t, f, s] = await Promise.all([
        api.get(`/admin/users?search=${search}`),
        api.get('/admin/transactions'),
        api.get('/admin/fraud-alerts'),
        api.get('/admin/dashboard').catch(() => ({ data: { data: {} } })),
      ]);
      setUsers(u.data.data.users);
      setTxns(t.data.data.transactions);
      setFraud(f.data.data);
      setStats(s.data.data || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const freezeToggle = async (userId, frozen) => {
    try {
      await api.put(`/admin/users/${userId}/${frozen ? 'unfreeze' : 'freeze'}`);
      toast.success(`Wallet ${frozen ? 'unfrozen' : 'frozen'}`);
      load();
    } catch { toast.error('Action failed'); }
  };

  const toggleActive = async (userId, active) => {
    try {
      await api.put(`/admin/users/${userId}/${active ? 'disable' : 'enable'}`);
      toast.success(`User ${active ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast.error('Action failed'); }
  };

  const resolveAlert = async (alertId) => {
    try {
      await api.put(`/admin/fraud-alerts/${alertId}/resolve`);
      toast.success('Alert resolved');
      load();
    } catch { toast.error('Failed'); }
  };

  const sendNotification = async () => {
    if (!notifForm.title || !notifForm.message) return toast.error('Fill all fields');
    try {
      await api.post(`/admin/users/${notifModal}/notify`, notifForm);
      toast.success('Notification sent!');
      setNotifModal(null);
      setNotifForm({ title: '', message: '', type: 'info' });
    } catch { toast.error('Failed to send'); }
  };

  const severityColor = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'bg-red-600 text-white badge' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-header">🛡️ Admin Dashboard</h1>
        <span className="badge badge-danger">Admin Access</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'Total Users',     v: stats.total_users      || users.length, icon: '👥', c: 'bg-primary-50 dark:bg-primary-900/20' },
          { l: 'Total Balance',   v: formatCurrency(stats.total_balance || 0), icon: '💰', c: 'bg-accent-50 dark:bg-accent-900/20' },
          { l: 'Open Fraud Alerts', v: fraud.length,         icon: '🚨', c: 'bg-danger-50 dark:bg-danger-900/20' },
          { l: 'Total Transactions', v: txns.length,         icon: '📋', c: 'bg-warning-50 dark:bg-warning-900/20' },
        ].map((s) => (
          <div key={s.l} className="card p-4">
            <div className={`w-10 h-10 ${s.c} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <p className="text-xs text-muted">{s.l}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-muted hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            {t}{t === 'fraud' && fraud.length > 0 && <span className="ml-1.5 bg-danger-500 text-white text-xs rounded-full px-1.5 py-0.5">{fraud.length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 space-y-4">
          {[...Array(5)].map((_,i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Users tab */}
          {tab === 'users' && (
            <div className="space-y-3 animate-fade-in">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search users by name, email or phone…" className="input" />
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-muted">
                      <tr>
                        {['User','Balance','Status','Wallet','Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 gradient-card rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {getInitials(u.full_name)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{u.full_name}</p>
                                <p className="text-xs text-muted">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(u.balance || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${u.wallet_frozen ? 'badge-warning' : 'badge-success'}`}>
                              {u.wallet_frozen ? '🔒 Frozen' : '✓ Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => freezeToggle(u.id, u.wallet_frozen)}
                                className={`btn-sm btn ${u.wallet_frozen ? 'btn-success' : 'btn-secondary'}`}>
                                {u.wallet_frozen ? 'Unfreeze' : 'Freeze'}
                              </button>
                              <button onClick={() => toggleActive(u.id, u.is_active)}
                                className={`btn-sm btn ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}>
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button onClick={() => setNotifModal(u.id)} className="btn-sm btn-secondary btn">
                                📨
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Transactions tab */}
          {tab === 'transactions' && (
            <div className="card overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-muted">
                    <tr>
                      {['Reference','From','To','Amount','Type','Status','Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {txns.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted">{t.reference_id}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.sender_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.receiver_name || '—'}</td>
                        <td className="px-4 py-3 font-bold font-mono">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3"><span className="badge badge-gray capitalize">{t.type.replace('_',' ')}</span></td>
                        <td className="px-4 py-3"><span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{t.status}</span></td>
                        <td className="px-4 py-3 text-xs text-muted">{timeAgo(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fraud alerts tab */}
          {tab === 'fraud' && (
            <div className="space-y-3 animate-fade-in">
              {fraud.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">No open fraud alerts</p>
                </div>
              ) : fraud.map((a) => (
                <div key={a.id} className="card p-5 border-l-4 border-danger-500 flex items-start gap-4">
                  <span className="text-2xl mt-0.5">🚨</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${severityColor[a.severity] || 'badge-warning'} capitalize`}>{a.severity}</span>
                      <span className="text-xs font-mono text-muted">{a.alert_type.replace(/_/g,' ')}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.full_name} — {a.email}</p>
                    <p className="text-sm text-muted mt-1">{a.description}</p>
                    <p className="text-xs text-muted mt-1">{timeAgo(a.created_at)}</p>
                  </div>
                  <button onClick={() => resolveAlert(a.id)} className="btn-success btn-sm btn flex-shrink-0">
                    Resolve ✓
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Send notification modal */}
      {notifModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 space-y-4 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Send Notification</h3>
              <button onClick={() => setNotifModal(null)} className="btn-ghost btn-icon text-slate-400">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Title</label>
                <input value={notifForm.title} onChange={(e) => setNotifForm((f) => ({ ...f, title: e.target.value }))} className="input" placeholder="Notification title" />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea value={notifForm.message} onChange={(e) => setNotifForm((f) => ({ ...f, message: e.target.value }))} className="input h-24 resize-none" placeholder="Your message…" />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={notifForm.type} onChange={(e) => setNotifForm((f) => ({ ...f, type: e.target.value }))} className="input">
                  {['info','success','warning','error','fraud_alert'].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setNotifModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={sendNotification} className="btn-primary flex-1">Send 📨</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}