export const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount || 0);

export const formatDate = (date, opts = {}) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts }).format(new Date(date));

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const maskEmail = (email = '') => {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(0, user.length - 2))}@${domain}`;
};

export const txnSign = (txn, userId) => {
  if (txn.type === 'add_money' || txn.type === 'receive') return '+';
  if (txn.type === 'send' || txn.type === 'withdraw') return '-';
  return '';
};

export const txnColor = (txn) => {
  if (['add_money', 'receive'].includes(txn.type)) return 'amount-positive';
  if (['send', 'withdraw'].includes(txn.type)) return 'amount-negative';
  return 'amount-neutral';
};

export const txnIcon = (txn) => {
  const icons = {
    send: '↗',
    receive: '↙',
    add_money: '＋',
    withdraw: '↑',
    refund: '↩',
  };
  return icons[txn?.type] || '•';
};

export const categoryEmoji = (cat) => {
  const map = {
    transfer: '💸', food: '🍔', shopping: '🛍️',
    utilities: '⚡', entertainment: '🎬', travel: '✈️',
    health: '🏥', other: '📦',
  };
  return map[cat] || '💳';
};

export const statusBadge = (status) => {
  const map = {
    completed: 'badge-success',
    pending:   'badge-warning',
    failed:    'badge-danger',
    reversed:  'badge-gray',
  };
  return map[status] || 'badge-gray';
};

export const clsx = (...args) => args.filter(Boolean).join(' ');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));