export const fmt = (n) =>
  new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const today = () => new Date().toISOString().split('T')[0];

export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const INVOICE_STATUSES = [
  { id: 'unpaid',  label: 'Unpaid',           color: '#E85D5D', bg: '#FEF2F0' },
  { id: 'deposit', label: '50% Deposit Paid',  color: '#F6A435', bg: '#FEF7EC' },
  { id: 'balance', label: '50% Balance Due',   color: '#7B8FD4', bg: '#EEF0FB' },
  { id: 'partial', label: 'Partially Paid',    color: '#F78C6B', bg: '#FEF0EB' },
  { id: 'paid',    label: 'Fully Paid',        color: '#4CAF82', bg: '#E8F7EF' },
];

export const getStatus = (id) => INVOICE_STATUSES.find(s => s.id === id) || INVOICE_STATUSES[0];

export const EXP_CATS = [
  { id: 'supplies',  label: 'Supplies / Materials', color: '#6EC5B8', bg: '#EBF8F6' },
  { id: 'transport', label: 'Transport',             color: '#F6D365', bg: '#FEF9EC' },
  { id: 'venue',     label: 'Venue / Rentals',       color: '#F78C6B', bg: '#FEF0EB' },
  { id: 'staff',     label: 'Staff / Labour',        color: '#7B8FD4', bg: '#EEF0FB' },
  { id: 'marketing', label: 'Marketing',             color: '#E879A0', bg: '#FCE8F2' },
  { id: 'food',      label: 'Food & Beverages',      color: '#4CAF82', bg: '#E8F7EF' },
  { id: 'custom',    label: 'Custom',                color: '#A0ADBF', bg: '#F0F2F5' },
];

export const getCat = (id) => EXP_CATS.find(c => c.id === id) || EXP_CATS[EXP_CATS.length - 1];

export function calcTotals(items, discountType, discount, delivery) {
  const subtotal = (items || []).reduce((s, item) => {
    if (item.hasSubItems && item.subItems?.length) {
      return s + item.subItems.reduce((ss, si) =>
        ss + (parseFloat(si.qty) || 0) * (parseFloat(si.price) || 0), 0);
    }
    return s + (parseFloat(item.price) || 0);
  }, 0);
  const discAmt = discountType === 'pct'
    ? subtotal * (parseFloat(discount) || 0) / 100
    : parseFloat(discount) || 0;
  const del = parseFloat(delivery) || 0;
  return { subtotal, discAmt, total: Math.max(0, subtotal - discAmt + del) };
}

export function filterByDateRange(items, field, from, to) {
  return items.filter(item => {
    const d = item[field];
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

// Draft helpers — stored in Supabase, expire after 30 days
export function isDraftExpired(draft) {
  if (!draft?.saved_at) return false;
  const age = Date.now() - new Date(draft.saved_at).getTime();
  return age > 30 * 24 * 60 * 60 * 1000;
}
