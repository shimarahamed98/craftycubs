import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { fmt, fmtDate, MONTHS, isOverdue } from '../lib/utils';

export default function ReportsPage({ invoices = [], customers = [], events = [] }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const years = [...new Set(invoices.map(i => i.date?.split('-')[0]).filter(Boolean))].sort().reverse();
  if (!years.includes(String(year))) years.unshift(String(year));

  // ── Monthly revenue ────────────────────────────────────────────────
  const monthlyData = MONTHS.map((label, idx) => {
    const m = idx + 1;
    const monthInvs = invoices.filter(i => {
      const d = i.date?.split('-');
      return d && parseInt(d[0]) === year && parseInt(d[1]) === m;
    });
    const revenue  = monthInvs.reduce((s, i) => s + (i.total || 0), 0);
    const collected = monthInvs.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = monthInvs.filter(i => i.status !== 'paid').reduce((s, i) => s + Math.max(0, (i.total || 0) - (parseFloat(i.amount_paid) || 0)), 0);
    const count = monthInvs.length;
    return { label, month: m, revenue, collected, outstanding, count };
  }).filter(m => m.count > 0);

  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

  // ── Per-client breakdown ───────────────────────────────────────────
  const clientData = customers.map(c => {
    const ci = invoices.filter(i => i.customer_id === c.id || i.customer_name === c.name);
    const total = ci.reduce((s, i) => s + (i.total || 0), 0);
    const paid  = ci.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = ci.filter(i => i.status !== 'paid').reduce((s, i) => s + Math.max(0, (i.total || 0) - (parseFloat(i.amount_paid) || 0)), 0);
    return { ...c, total, paid, outstanding, count: ci.length };
  }).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  // ── Outstanding invoices ───────────────────────────────────────────
  const outstanding = invoices.filter(i => i.status !== 'paid').map(i => ({
    ...i,
    balanceDue: Math.max(0, (i.total || 0) - (parseFloat(i.amount_paid) || 0)),
    overdue: isOverdue(i),
  })).filter(i => i.balanceDue > 0).sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0));

  const totalOutstanding = outstanding.reduce((s, i) => s + i.balanceDue, 0);
  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);

  // ── CSV exports ────────────────────────────────────────────────────
  function exportMonthly() {
    const rows = [
      ['Month', 'Year', 'Invoices', 'Revenue (LKR)', 'Collected (LKR)', 'Outstanding (LKR)'],
      ...monthlyData.map(m => [m.label, year, m.count, m.revenue, m.collected, m.outstanding]),
    ];
    downloadCSV(rows, `CraftyCubs_Monthly_${year}.csv`);
  }

  function exportClients() {
    const rows = [
      ['Client', 'Phone', 'Email', 'Invoices', 'Total (LKR)', 'Collected (LKR)', 'Outstanding (LKR)'],
      ...clientData.map(c => [c.name, c.phone || '', c.email || '', c.count, c.total, c.paid, c.outstanding]),
    ];
    downloadCSV(rows, `CraftyCubs_Clients_Report.csv`);
  }

  function exportOutstanding() {
    const rows = [
      ['Invoice #', 'Client', 'Date', 'Total (LKR)', 'Balance Due (LKR)', 'Status', 'Overdue'],
      ...outstanding.map(i => [i.invoice_number, i.customer_name, i.date, i.total, i.balanceDue, i.status, i.overdue ? 'YES' : 'No']),
    ];
    downloadCSV(rows, `CraftyCubs_Outstanding.csv`);
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="wrap">

        {/* Overall stats */}
        <div className="stats fu">
          <div className="stat" style={{ borderTopColor: 'var(--teal)' }}>
            <div className="stat-lbl">Total Revenue</div>
            <div className="stat-val sm teal">LKR {fmt(totalRevenue)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--green)' }}>
            <div className="stat-lbl">Collected</div>
            <div className="stat-val sm green">LKR {fmt(totalCollected)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--red)' }}>
            <div className="stat-lbl">Outstanding</div>
            <div className="stat-val sm red">LKR {fmt(totalOutstanding)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--purple)' }}>
            <div className="stat-lbl">Total Clients</div>
            <div className="stat-val">{clientData.length}</div>
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="card fu" style={{ animationDelay: '.04s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--teal)' }} />
            <span className="card-title">Monthly Revenue</span>
            <select className="inp inp-sm" style={{ width: 'auto', marginLeft: 'auto', marginRight: 8 }}
              value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportMonthly}><Download size={12} /> CSV</button>
          </div>
          {monthlyData.length === 0
            ? <div className="empty"><div className="empty-ico">📅</div><div className="empty-txt">No invoices for {year}</div></div>
            : <div className="card-body" style={{ padding: '12px 14px' }}>
              {monthlyData.map((m, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.label} · <span style={{ color: 'var(--t3)', fontWeight: 400 }}>{m.count} invoice{m.count !== 1 ? 's' : ''}</span></span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span style={{ color: 'var(--teal)', fontWeight: 700 }}>LKR {fmt(m.revenue)}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {fmt(m.collected)}</span>
                      {m.outstanding > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}>⏳ {fmt(m.outstanding)}</span>}
                    </div>
                  </div>
                  <div className="pbar">
                    <div className="pbar-fill" style={{ width: `${(m.revenue / maxRev * 100)}%`, background: 'var(--teal)' }} />
                  </div>
                  {m.collected > 0 && (
                    <div className="pbar" style={{ marginTop: 3 }}>
                      <div className="pbar-fill" style={{ width: `${(m.collected / maxRev * 100)}%`, background: 'var(--green)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </div>

        {/* Outstanding invoices */}
        <div className="card fu" style={{ animationDelay: '.08s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--red)' }} />
            <span className="card-title">Outstanding Invoices ({outstanding.length})</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 13, color: 'var(--red)' }}>LKR {fmt(totalOutstanding)}</span>
              <button className="btn btn-ghost btn-sm" onClick={exportOutstanding}><Download size={12} /> CSV</button>
            </div>
          </div>
          {outstanding.length === 0
            ? <div className="empty"><div className="empty-ico">🎉</div><div className="empty-txt">All invoices collected!</div></div>
            : outstanding.map(inv => (
              <div key={inv.id} className="list-row" style={{ flexWrap: 'wrap', gap: '4px 10px' }}>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{inv.invoice_number}</span>
                    {inv.overdue && <span className="badge" style={{ background: '#FEF2F0', color: '#E85D5D', fontSize: 10 }}>OVERDUE</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 1 }}>{inv.customer_name} · {fmtDate(inv.date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--red)', fontSize: 14 }}>LKR {fmt(inv.balanceDue)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>of LKR {fmt(inv.total)}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Per-client breakdown */}
        <div className="card fu" style={{ animationDelay: '.12s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--coral)' }} />
            <span className="card-title">Client Breakdown</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={exportClients}><Download size={12} /> CSV</button>
          </div>
          {clientData.length === 0
            ? <div className="empty"><div className="empty-ico">👥</div><div className="empty-txt">No client data yet</div></div>
            : clientData.map((c, i) => {
              const pct = c.total > 0 ? (c.paid / c.total * 100) : 0;
              return (
                <div key={c.id} className="list-row" style={{ flexWrap: 'wrap', gap: '4px 10px' }}>
                  <div className="avatar" style={{ background: 'var(--teal-l)', color: 'var(--teal)', width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.count} invoice{c.count !== 1 ? 's' : ''}</div>
                    <div className="pbar" style={{ marginTop: 4 }}>
                      <div className="pbar-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--coral)', fontSize: 13 }}>LKR {fmt(c.total)}</div>
                    {c.outstanding > 0 && <div style={{ fontSize: 11, color: 'var(--red)' }}>Due: {fmt(c.outstanding)}</div>}
                  </div>
                </div>
              );
            })
          }
        </div>

      </div>
    </div>
  );
}
