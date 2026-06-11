import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Edit, Trash2, FileEdit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fmt, fmtDate, getStatus, INVOICE_STATUSES, filterByDateRange } from '../lib/utils';

export default function InvoicesPage({ invoices, drafts, onOpen, onEdit, onRefresh }) {
  const [search, setSearch]   = useState('');
  const [statusF, setStatusF] = useState('all');
  const [dateF, setDateF]     = useState('all');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [showF, setShowF]     = useState(false);

  const getRange = () => {
    const now = new Date();
    if (dateF === 'week')  { const f = new Date(now); f.setDate(now.getDate()-7); return { from: f.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; }
    if (dateF === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    if (dateF === 'year')  return { from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    if (dateF === 'custom') return { from, to };
    return { from: '', to: '' };
  };

  const filtered = useMemo(() => {
    let list = invoices || [];
    if (search) { const s = search.toLowerCase(); list = list.filter(i => (i.customer_name||'').toLowerCase().includes(s) || (i.invoice_number||'').toLowerCase().includes(s)); }
    if (statusF !== 'all') list = list.filter(i => i.status === statusF);
    const { from: f, to: t } = getRange();
    if (f || t) list = filterByDateRange(list, 'date', f, t);
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, statusF, dateF, from, to]);

  const totalVal   = filtered.reduce((s, i) => s + (i.total || 0), 0);
  const collected  = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + Math.max(0, (i.total||0) - (parseFloat(i.amount_paid)||0)), 0);

  async function changeStatus(id, status) {
    await supabase.from('invoices').update({ status }).eq('id', id);
    onRefresh();
  }

  async function del(id) {
    if (!window.confirm('Delete this invoice?')) return;
    await supabase.from('invoices').delete().eq('id', id);
    onRefresh();
  }

  async function deleteDraft(id) {
    if (!window.confirm('Delete this draft?')) return;
    await supabase.from('drafts').delete().eq('id', id);
    onRefresh();
  }

  function openDraft(draft) {
    // Load draft data into the editor
    onEdit({ ...draft.data, _isNew: true, _draftId: draft.id });
  }

  return (
    <div className="page">
      <div className="wrap">
        {/* Stats */}
        <div className="stats fu">
          <div className="stat" style={{ borderTopColor: 'var(--teal)' }}><div className="stat-lbl">Total</div><div className="stat-val">{filtered.length}</div></div>
          <div className="stat" style={{ borderTopColor: 'var(--coral)' }}><div className="stat-lbl">Value</div><div className="stat-val sm coral">LKR {fmt(totalVal)}</div></div>
          <div className="stat" style={{ borderTopColor: 'var(--green)' }}><div className="stat-lbl">Collected</div><div className="stat-val sm green">LKR {fmt(collected)}</div></div>
          <div className="stat" style={{ borderTopColor: 'var(--red)' }}><div className="stat-lbl">Outstanding</div><div className="stat-val sm red">LKR {fmt(outstanding)}</div></div>
        </div>

        {/* Drafts section */}
        {(drafts || []).length > 0 && (
          <div className="card fu" style={{ animationDelay: '.04s', border: '1.5px solid var(--yellow)' }}>
            <div className="card-h" style={{ background: 'var(--yellow-l)' }}>
              <div className="card-accent" style={{ background: 'var(--yellow)' }} />
              <span className="card-title">Drafts ({drafts.length})</span>
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' }}>Auto-deleted after 30 days</span>
            </div>
            {drafts.map(draft => {
              const d = draft.data || {};
              const ageMs = Date.now() - new Date(draft.saved_at).getTime();
              const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
              return (
                <div key={draft.id} className="list-row" style={{ gap: 10, cursor: 'pointer' }} onClick={() => openDraft(draft)}>
                  <FileEdit size={16} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>{d.invoice_number || 'Untitled draft'}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{d.customer_name || 'No customer'} · {ageDays === 0 ? 'Today' : `${ageDays}d ago`}</div>
                  </div>
                  {d.total > 0 && <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--t2)', fontSize: 13, flexShrink: 0 }}>LKR {fmt(d.total)}</div>}
                  <button className="btn btn-icon btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteDraft(draft.id); }} title="Delete draft"><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search + filter */}
        <div className="card fu" style={{ animationDelay: '.08s' }}>
          <div className="card-body-sm">
            <div style={{ display: 'flex', gap: 10, marginBottom: showF ? 14 : 0 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <Search size={14} />
                <input className="search-inp" placeholder="Search customer or #..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowF(f => !f)} style={showF ? { background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' } : {}}>
                <Filter size={13} />
              </button>
            </div>
            {showF && (
              <div className="fi">
                <div className="g2" style={{ marginBottom: 10 }}>
                  <div><label className="lbl">Status</label>
                    <select className="inp inp-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
                      <option value="all">All</option>
                      {INVOICE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className="lbl">Period</label>
                    <select className="inp inp-sm" value={dateF} onChange={e => setDateF(e.target.value)}>
                      <option value="all">All time</option>
                      <option value="week">Last 7 days</option>
                      <option value="month">This month</option>
                      <option value="year">This year</option>
                      <option value="custom">Custom…</option>
                    </select>
                  </div>
                  {dateF === 'custom' && (
                    <>
                      <div><label className="lbl">From</label><input className="inp inp-sm" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
                      <div><label className="lbl">To</label><input className="inp inp-sm" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {filtered.length === 0
            ? <div className="empty"><div className="empty-ico">📄</div><div className="empty-txt">{(invoices||[]).length === 0 ? 'No invoices yet' : 'No results'}</div></div>
            : filtered.map((inv, i) => {
              const st = getStatus(inv.status);
              const balanceDue = Math.max(0, (inv.total||0) - (parseFloat(inv.amount_paid)||0));
              return (
                <div key={inv.id} className="list-row clickable" style={{ flexWrap: 'wrap', gap: '6px 10px' }} onClick={() => onOpen(inv)}>
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{inv.invoice_number}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer_name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{fmtDate(inv.date)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--coral)', fontSize: 15 }}>LKR {fmt(inv.total)}</div>
                    {balanceDue > 0 && balanceDue < inv.total && <div style={{ fontSize: 11, color: 'var(--red)' }}>Due: LKR {fmt(balanceDue)}</div>}
                  </div>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <select
                      className="badge"
                      style={{ background: st.bg, color: st.color, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, padding: '4px 9px', borderRadius: 99 }}
                      value={inv.status || 'unpaid'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); changeStatus(inv.id, e.target.value); }}
                    >
                      {INVOICE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onOpen(inv)}><Eye size={13} /></button>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onEdit(inv)}><Edit size={13} /></button>
                      <button className="btn btn-icon btn-danger btn-sm" onClick={() => del(inv.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button className="fab no-print" onClick={() => onEdit(null)} style={{ background: 'var(--teal)' }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
      </button>
    </div>
  );
}
