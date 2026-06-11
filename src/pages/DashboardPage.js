import React from 'react';
import { fmt, fmtDate, getStatus, MONTHS } from '../lib/utils';
import { getUserProfile } from '../lib/supabase';

export default function DashboardPage({ user, invoices, customers, events, onOpenInvoice, onTab, onNew }) {
  const profile = getUserProfile(user?.email);
  const meta = user?.user_metadata || {};
  const displayName = meta.display_name || profile.name;

  const now = new Date();
  const thisMonth = (invoices || []).filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalRev  = (invoices || []).reduce((s, i) => s + (i.total || 0), 0);
  const monthRev  = thisMonth.reduce((s, i) => s + (i.total || 0), 0);
  const totalExp  = (events || []).reduce((s, e) => s + (e.total_expenses || 0), 0);
  const netProfit = totalRev - totalExp;
  const unpaid    = (invoices || []).filter(i => i.status !== 'paid');
  const recent    = (invoices || []).slice(0, 6);

  return (
    <div className="page">
      <div className="wrap">
        {/* Greeting */}
        <div style={{ marginBottom: 20 }} className="fu">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div className="avatar" style={{ background: profile.bg, color: profile.color, width: 44, height: 44, fontSize: 18 }}>
              {meta.avatar_url ? <img src={meta.avatar_url} alt="" /> : profile.initial}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 20, color: 'var(--navy)', lineHeight: 1 }}>
                Hey {displayName}! 👋
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 3 }}>
                {MONTHS[now.getMonth()]} {now.getFullYear()} — here's your overview
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats fu" style={{ animationDelay: '.04s' }}>
          <div className="stat" style={{ borderTopColor: 'var(--teal)' }}>
            <div className="stat-lbl">Total Revenue</div>
            <div className="stat-val sm teal">LKR {fmt(totalRev)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--yellow)' }}>
            <div className="stat-lbl">This Month</div>
            <div className="stat-val sm">LKR {fmt(monthRev)}</div>
          </div>
          <div className="stat" style={{ borderTopColor: netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            <div className="stat-lbl">Net Profit</div>
            <div className={`stat-val sm ${netProfit >= 0 ? 'green' : 'red'}`}>
              {netProfit < 0 ? '−' : ''}LKR {fmt(Math.abs(netProfit))}
            </div>
          </div>
          <div className="stat" style={{ borderTopColor: 'var(--coral)' }}>
            <div className="stat-lbl">Unpaid</div>
            <div className="stat-val coral">{unpaid.length}</div>
          </div>
        </div>

        {/* Unpaid alert */}
        {unpaid.length > 0 && (
          <div className="card fu" style={{ animationDelay: '.08s', border: '1.5px solid #F6D365' }}>
            <div className="card-h" style={{ background: 'var(--yellow-l)' }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span className="card-title">{unpaid.length} unpaid invoice{unpaid.length > 1 ? 's' : ''}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onTab('invoices')} style={{ marginLeft: 'auto' }}>View all</button>
            </div>
            <div style={{ padding: '4px 0' }}>
              {unpaid.slice(0, 3).map(inv => {
                const st = getStatus(inv.status);
                const due = (inv.total || 0) - (parseFloat(inv.amount_paid) || 0);
                return (
                  <div key={inv.id} className="list-row clickable" onClick={() => onOpenInvoice(inv)}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{inv.invoice_number}</span>
                      <span style={{ fontSize: 13, color: 'var(--t2)', marginLeft: 8 }}>{inv.customer_name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>LKR {fmt(due)}</div>
                      <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent invoices */}
        <div className="card fu" style={{ animationDelay: '.12s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--teal)' }} />
            <span className="card-title">Recent Invoices</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onTab('invoices')} style={{ marginLeft: 'auto' }}>See all</button>
          </div>
          {recent.length === 0
            ? <div className="empty"><div className="empty-ico">📄</div><div className="empty-txt">No invoices yet</div></div>
            : recent.map(inv => {
              const st = getStatus(inv.status);
              return (
                <div key={inv.id} className="list-row clickable" onClick={() => onOpenInvoice(inv)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{inv.invoice_number}</span>
                      <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.customer_name} · {fmtDate(inv.date)}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--coral)', flexShrink: 0 }}>LKR {fmt(inv.total)}</div>
                </div>
              );
            })}
        </div>

        {/* Quick actions — all buttons fully wired up */}
        <div className="fu" style={{ animationDelay: '.16s' }}>
          <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13, color: 'var(--t2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => { onTab('invoices'); onNew('invoices'); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', boxShadow: 'var(--sh1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28 }}>📄</span>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>New Invoice</span>
            </button>

            <button
              onClick={() => onTab('expenses')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', boxShadow: 'var(--sh1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--coral)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28 }}>🎪</span>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>New Event</span>
            </button>

            <button
              onClick={() => onTab('customers')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', boxShadow: 'var(--sh1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28 }}>👥</span>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>Clients</span>
            </button>

            <button
              onClick={() => onTab('finance')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', boxShadow: 'var(--sh1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28 }}>📊</span>
              <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>Finance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
