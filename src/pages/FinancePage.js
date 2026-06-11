import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, X } from 'lucide-react';
import { supabase, getUserProfile } from '../lib/supabase';
import { fmt, uid, MONTHS } from '../lib/utils';

export default function FinancePage({ user, invoices = [], events = [] }) {
  const profile = getUserProfile(user?.email);
  const [view, setView]           = useState('combined');
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'new'
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ person: 'R', type: 'investment', amount: '', note: '', month: '', year: '' });

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase.from('finance_entries').select('*').order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }

  async function saveEntry() {
    if (!form.amount || parseFloat(form.amount) <= 0) { alert('Enter a valid amount'); return; }
    setSaving(true);
    await supabase.from('finance_entries').insert([{
      id: uid(),
      person: form.person,
      type: form.type,
      amount: parseFloat(form.amount),
      note: form.note,
      month: parseInt(form.month) || new Date().getMonth() + 1,
      year: parseInt(form.year) || new Date().getFullYear(),
      created_by: user?.id,
      created_by_email: user?.email,
    }]);
    setSaving(false);
    setModal(null);
    setForm({ person: 'R', type: 'investment', amount: '', note: '', month: '', year: '' });
    loadEntries();
  }

  async function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    await supabase.from('finance_entries').delete().eq('id', id);
    loadEntries();
  }

  // ── Auto-calculate from invoices + events ──────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();

  const monthlyData = MONTHS.map((label, idx) => {
    const m = idx + 1;
    const revenue = invoices
      .filter(i => { const d = new Date(i.date); return d.getMonth() + 1 === m && d.getFullYear() === currentYear; })
      .reduce((s, i) => s + (i.total || 0), 0);
    const cost = events
      .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === m && d.getFullYear() === currentYear; })
      .reduce((s, e) => s + (e.total_expenses || 0), 0);
    return { month: m, label, revenue, cost, profit: revenue - cost };
  }).filter(m => m.revenue > 0 || m.cost > 0);

  const totals = monthlyData.reduce(
    (s, m) => ({ revenue: s.revenue + m.revenue, cost: s.cost + m.cost, profit: s.profit + m.profit }),
    { revenue: 0, cost: 0, profit: 0 }
  );

  // ── Per-person entries ─────────────────────────────────────────────
  const filterPerson = (person) => entries.filter(e => person === 'combined' || e.person === person);
  const sumType = (person, type) => filterPerson(person).filter(e => e.type === type).reduce((s, e) => s + (e.amount || 0), 0);

  const investR = sumType('R', 'investment');
  const withdrawR = sumType('R', 'withdrawal');
  const investT = sumType('T', 'investment');
  const withdrawT = sumType('T', 'withdrawal');

  const roiR = investR > 0 ? ((withdrawR - investR) / investR * 100) : 0;
  const roiT = investT > 0 ? ((withdrawT - investT) / investT * 100) : 0;

  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

  // ── CSV export ─────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Month', 'Revenue (LKR)', 'Expenses (LKR)', 'Profit (LKR)'],
      ...monthlyData.map(m => [m.label + ' ' + currentYear, m.revenue, m.cost, m.profit]),
      [],
      ['Person Entries'],
      ['Person', 'Type', 'Amount', 'Note', 'Month', 'Year', 'By'],
      ...entries.map(e => [e.person === 'R' ? 'Rumana' : 'Thaman', e.type, e.amount, e.note || '', e.month || '', e.year || '', e.created_by_email || '']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CraftyCubs_Finance_${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const personLabel = { R: 'Rumana', T: 'Thaman' };

  return (
    <div className="page">
      <div className="wrap">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="fu">
          <div>
            <div style={{ fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 17, color: 'var(--navy)' }}>Finance Overview</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Auto-calculated from invoices & events · {currentYear}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={13} /> Export CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={13} /> Add Entry</button>
          </div>
        </div>

        {/* Overall stats */}
        <div className="stats fu" style={{ animationDelay: '.04s' }}>
          <div className="stat" style={{ borderTopColor: 'var(--teal)' }}>
            <div className="stat-lbl">Revenue</div>
            <div className="stat-val sm teal">LKR {fmt(totals.revenue)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--coral)' }}>
            <div className="stat-lbl">Expenses</div>
            <div className="stat-val sm coral">LKR {fmt(totals.cost)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: totals.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            <div className="stat-lbl">Net Profit</div>
            <div className={`stat-val sm ${totals.profit >= 0 ? 'green' : 'red'}`}>
              {totals.profit < 0 ? '−' : ''}LKR {fmt(Math.abs(totals.profit))}
            </div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--purple)' }}>
            <div className="stat-lbl">Margin</div>
            <div className="stat-val sm">{totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) + '%' : '—'}</div>
          </div>
        </div>

        {/* View toggle */}
        <div className="toggle fu" style={{ marginBottom: 16, animationDelay: '.06s' }}>
          {['combined', 'R', 'T'].map(v => (
            <button key={v} className={`toggle-btn${view === v ? ' on' : ''}`} onClick={() => setView(v)}>
              {v === 'combined' ? '🏢 Combined' : v === 'R' ? '👩 Rumana' : '🧑 Thaman'}
            </button>
          ))}
        </div>

        {/* Rumana card */}
        {(view === 'combined' || view === 'R') && (
          <div className="card fu" style={{ animationDelay: '.08s', borderTop: '3px solid var(--coral)' }}>
            <div className="card-h">
              <div className="card-accent" style={{ background: 'var(--coral)' }} />
              <span className="card-title">Rumana (R)</span>
            </div>
            <div className="card-body">
              <div className="g2" style={{ marginBottom: 12 }}>
                <div style={{ background: 'var(--coral-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                  <div className="stat-lbl">Total Invested</div>
                  <div className="stat-val sm coral">LKR {fmt(investR)}</div>
                </div>
                <div style={{ background: 'var(--green-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                  <div className="stat-lbl">Total Withdrawn</div>
                  <div className="stat-val sm green">LKR {fmt(withdrawR)}</div>
                </div>
              </div>
              <div style={{ background: 'var(--navy-l)', borderRadius: 'var(--rl)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>ROI</span>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 18, color: roiR >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {roiR >= 0 ? '+' : ''}{roiR.toFixed(1)}%
                </span>
              </div>
              {/* R entries */}
              {entries.filter(e => e.person === 'R').length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="stat-lbl" style={{ marginBottom: 8 }}>Entry History</div>
                  {entries.filter(e => e.person === 'R').map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span className="badge" style={{ background: e.type === 'investment' ? 'var(--coral-l)' : 'var(--green-l)', color: e.type === 'investment' ? 'var(--coral)' : 'var(--green)', marginRight: 8 }}>{e.type}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{e.note || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>LKR {fmt(e.amount)}</span>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteEntry(e.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thaman card */}
        {(view === 'combined' || view === 'T') && (
          <div className="card fu" style={{ animationDelay: '.10s', borderTop: '3px solid var(--teal)' }}>
            <div className="card-h">
              <div className="card-accent" style={{ background: 'var(--teal)' }} />
              <span className="card-title">Thaman (T)</span>
            </div>
            <div className="card-body">
              <div className="g2" style={{ marginBottom: 12 }}>
                <div style={{ background: 'var(--coral-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                  <div className="stat-lbl">Total Invested</div>
                  <div className="stat-val sm coral">LKR {fmt(investT)}</div>
                </div>
                <div style={{ background: 'var(--green-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                  <div className="stat-lbl">Total Withdrawn</div>
                  <div className="stat-val sm green">LKR {fmt(withdrawT)}</div>
                </div>
              </div>
              <div style={{ background: 'var(--navy-l)', borderRadius: 'var(--rl)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>ROI</span>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 18, color: roiT >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {roiT >= 0 ? '+' : ''}{roiT.toFixed(1)}%
                </span>
              </div>
              {entries.filter(e => e.person === 'T').length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="stat-lbl" style={{ marginBottom: 8 }}>Entry History</div>
                  {entries.filter(e => e.person === 'T').map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span className="badge" style={{ background: e.type === 'investment' ? 'var(--coral-l)' : 'var(--green-l)', color: e.type === 'investment' ? 'var(--coral)' : 'var(--green)', marginRight: 8 }}>{e.type}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{e.note || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>LKR {fmt(e.amount)}</span>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteEntry(e.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly chart */}
        {monthlyData.length > 0 && (
          <div className="card fu" style={{ animationDelay: '.14s' }}>
            <div className="card-h">
              <div className="card-accent" style={{ background: 'var(--navy)' }} />
              <span className="card-title">Monthly Breakdown — {currentYear}</span>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              {monthlyData.map((m, i) => {
                const barW = (m.revenue / maxRev * 100);
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</span>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                        <span style={{ color: 'var(--teal)', fontWeight: 700 }}>LKR {fmt(m.revenue)}</span>
                        <span style={{ color: 'var(--coral)', fontWeight: 700 }}>−{fmt(m.cost)}</span>
                        <span style={{ color: m.profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                          {m.profit >= 0 ? '+' : '−'}{fmt(Math.abs(m.profit))}
                        </span>
                      </div>
                    </div>
                    <div className="pbar">
                      <div className="pbar-fill" style={{ width: `${barW}%`, background: m.profit >= 0 ? 'var(--teal)' : 'var(--red)' }} />
                    </div>
                  </div>
                );
              })}
              {monthlyData.length === 0 && (
                <div className="empty"><div className="empty-ico">📊</div><div className="empty-txt">No data yet — create invoices and events to see breakdown</div></div>
              )}
            </div>
          </div>
        )}

        {monthlyData.length === 0 && (
          <div className="card fu" style={{ animationDelay: '.14s' }}>
            <div className="empty"><div className="empty-ico">📊</div><div className="empty-txt">No data for {currentYear} yet</div><div className="empty-sub">Revenue and expenses are calculated automatically from your invoices and events</div></div>
          </div>
        )}

      </div>

      {/* Add Entry Modal */}
      {modal === 'new' && (
        <div className="overlay fi" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-drag" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Add Finance Entry</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}><X size={15} /></button>
            </div>

            <div className="g2">
              <div className="field">
                <label className="lbl">Person</label>
                <select className="inp" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))}>
                  <option value="R">Rumana (R)</option>
                  <option value="T">Thaman (T)</option>
                </select>
              </div>
              <div className="field">
                <label className="lbl">Type</label>
                <select className="inp" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="investment">Investment (money in)</option>
                  <option value="withdrawal">Withdrawal (money out)</option>
                </select>
              </div>
              <div className="field">
                <label className="lbl">Amount (LKR)</label>
                <input className="inp" type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="field">
                <label className="lbl">Month</label>
                <select className="inp" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                  <option value="">This month</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="lbl">Year</label>
                <input className="inp" type="number" placeholder={currentYear} value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="field span2">
                <label className="lbl">Note (optional)</label>
                <input className="inp" placeholder="e.g. Initial capital, Monthly profit share…" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEntry} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
