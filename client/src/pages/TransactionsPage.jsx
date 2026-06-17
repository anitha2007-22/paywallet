import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDateTime, txnSign, txnColor, categoryEmoji, statusBadge, timeAgo } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const TYPES      = [{ v:'',          l:'All Types' },{ v:'send', l:'Sent' },{ v:'receive', l:'Received' },{ v:'add_money', l:'Added' },{ v:'withdraw', l:'Withdrawn' }];
const CATEGORIES = [{ v:'', l:'All Categories' },{ v:'transfer',l:'Transfer' },{ v:'food',l:'Food' },{ v:'shopping',l:'Shopping' },{ v:'utilities',l:'Utilities' },{ v:'entertainment',l:'Entertainment' },{ v:'travel',l:'Travel' },{ v:'health',l:'Health' },{ v:'other',l:'Other' }];

export default function TransactionsPage() {
  const { user } = useAuth();
  const [txns, setTxns]         = useState([]);
  const [pagination, setPag]    = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);

  const [filters, setFilters] = useState({
    search: '', type: '', category: '', sort: 'created_at', order: 'DESC',
    start_date: '', end_date: '', page: 1,
  });

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.set('limit', '15');
      const { data } = await api.get(`/wallet/transactions?${params}`);
      setTxns(data.data.transactions);
      setPag(data.data.pagination);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const setPage = (p) => setFilters((f) => ({ ...f, page: p }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-header">Transactions</h1>
        <span className="text-sm text-muted">{pagination.total} total</span>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input value={filters.search} onChange={setF('search')} placeholder="Search by remark or reference…"
              className="input pl-9" />
          </div>
          <select value={filters.type} onChange={setF('type')} className="input">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={filters.category} onChange={setF('category')} className="input">
            {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="date" value={filters.start_date} onChange={setF('start_date')} className="input text-sm" placeholder="From" />
          <input type="date" value={filters.end_date} onChange={setF('end_date')} className="input text-sm" placeholder="To" />
          <select value={filters.sort} onChange={setF('sort')} className="input text-sm">
            <option value="created_at">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
          <select value={filters.order} onChange={setF('order')} className="input text-sm">
            <option value="DESC">Newest First</option>
            <option value="ASC">Oldest First</option>
          </select>
        </div>
        {(filters.search || filters.type || filters.category || filters.start_date) && (
          <button onClick={() => setFilters({ search:'',type:'',category:'',sort:'created_at',order:'DESC',start_date:'',end_date:'',page:1 })}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
            Clear all filters ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_,i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        ) : txns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">No transactions found</p>
            <p className="text-sm text-muted mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Header row — desktop only */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-muted border-b border-slate-100 dark:border-slate-800">
              <span>Type</span>
              <span>Details</span>
              <span>Category</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {txns.map((txn) => (
                <div key={txn.id} onClick={() => setSelected(txn)}
                  className="flex md:grid md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 md:gap-4 px-4 md:px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    ['receive','add_money'].includes(txn.type) ? 'bg-accent-100 dark:bg-accent-900/30' : 'bg-danger-100 dark:bg-danger-900/30'
                  }`}>
                    {categoryEmoji(txn.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {txnPartyName(txn, user?.id)}
                    </p>
                    <p className="text-xs text-muted truncate">{txn.remarks || txn.reference_id} · {timeAgo(txn.created_at)}</p>
                  </div>
                  <span className="hidden md:inline badge badge-gray capitalize">{txn.category}</span>
                  <span className={`hidden md:inline badge ${statusBadge(txn.status)} capitalize`}>{txn.status}</span>
                  <p className={`text-sm font-bold text-right flex-shrink-0 ${txnColor(txn)}`}>
                    {txnSign(txn, user?.id)}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(filters.page - 1)} disabled={filters.page <= 1} className="btn-secondary btn-sm">← Prev</button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const p = Math.max(1, Math.min(filters.page - 2, pagination.pages - 4)) + i;
              return p <= pagination.pages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`btn-sm btn ${p === filters.page ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
              ) : null;
            })}
            <button onClick={() => setPage(filters.page + 1)} disabled={filters.page >= pagination.pages} className="btn-secondary btn-sm">Next →</button>
          </div>
        </div>
      )}

      {/* Transaction detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Transaction Details</h3>
              <button onClick={() => setSelected(null)} className="btn-ghost btn-icon text-slate-400">✕</button>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto ${
              ['receive','add_money'].includes(selected.type) ? 'bg-accent-100 dark:bg-accent-900/30' : 'bg-danger-100 dark:bg-danger-900/30'
            }`}>
              {categoryEmoji(selected.category)}
            </div>
            <p className={`text-3xl font-extrabold text-center font-mono ${txnColor(selected)}`}>
              {txnSign(selected, user?.id)}{formatCurrency(selected.amount)}
            </p>
            <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
              {[
                ['Type', selected.type.replace('_', ' ').toUpperCase()],
                ['Status', selected.status],
                ['Reference', selected.reference_id],
                ['Category', selected.category],
                ['Date & Time', formatDateTime(selected.created_at)],
                selected.remarks && ['Remarks', selected.remarks],
                selected.sender_name && ['From', selected.sender_name],
                selected.receiver_name && ['To', selected.receiver_name],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4">
                  <span className="text-muted flex-shrink-0">{k}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const txnPartyName = (txn, userId) => {
  if (txn.type === 'receive') return `From: ${txn.sender_name || 'Unknown'}`;
  if (txn.type === 'send')    return `To: ${txn.receiver_name || 'Unknown'}`;
  if (txn.type === 'add_money') return 'Money Added';
  if (txn.type === 'withdraw')  return 'Withdrawal';
  return txn.type;
};