import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase, getUserProfile } from '../lib/supabase';
import { fmt, MONTHS } from '../lib/utils';

export default function FinancePage({ user }) {
  const profile = getUserProfile(user?.email);
  const [cache, setCache]       = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [syncing, setSyncing]   = useState(false);
  const [error, setError]       = useState('');
  const [view, setView]         = useState(profile.initial);
  const hasSyncedRef            = useRef(false);

  // Load cached data first, then auto-sync in background
  useEffect(() => {
    loadThenSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadThenSync() {
    // 1. Load cached data immediately so UI shows something
    const { data } = await supabase
      .from('finance_cache')
      .select('data,synced_at')
      .eq('id', 'sheets')
      .maybeSingle();

    if (data?.data) {
      setCache(data.data);
      setSyncedAt(data.synced_at);
    }

    // 2. Check if last sync was more than 1 hour ago
    const lastSync = data?.synced_at ? new Date(data.synced_at) : null;
    const ageHrs = lastSync ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60) : 999;

    if (!hasSyncedRef.current && ageHrs > 1) {
      hasSyncedRef.current = true;
      await doSync(true); // silent = true
    }
  }

  async function doSync(silent = false) {
    if (!silent) setSyncing(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/sheets-sync');
      if (!res.ok) throw new Error(`Server responded with ${res.status}. Check Netlify function logs and environment variables.`);
      const freshData = await res.json();
      if (freshData.error) throw new Error(freshData.error);
      await supabase.from('finance_cache').upsert({
        id: 'sheets',
        data: freshData,
        synced_at: new Date().toISOString(),
      });
      setCache(freshData);
      setSyncedAt(new Date().toISOString());
    } catch (e) {
      if (!silent) setError(e.message);
      else console.warn('Auto-sync failed:', e.message);
    }
    if (!silent) setSyncing(false);
  }

  const monthly     = cache?.monthlyData || [];
  const withdrawals = cache?.withdrawals || { R: 0, T: 0 };
  const investment  = cache?.investment  || { R: 0, T: 0 };

  const totals = monthly.reduce(
    (s, m) => ({ revenue: s.revenue + (m.revenue||0), cost: s.cost + (m.cost||0), profit: s.profit + (m.profit||0) }),
    { revenue: 0, cost: 0, profit: 0 }
  );

  const roiR = investment.R > 0 ? ((withdrawals.R - investment.R) / investment.R * 100) : 0;
  const roiT = investment.T > 0 ? ((withdrawals.T - investment.T) / investment.T * 100) : 0;
  const recentMonths = monthly.slice(-8);
  const maxRev = Math.max(...recentMonths.map(m => m.revenue || 0), 1);

  function fmtSyncTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="page">
      <div className="wrap">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 17, color: 'var(--navy)' }}>Finance Overview</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
              {syncing ? '⏳ Syncing…' : syncedAt ? `Last synced: ${fmtSyncTime(syncedAt)}` : 'Not synced yet'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => doSync(false)} disabled={syncing}>
            <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 'var(--rl)', padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
            ⚠ {error}
          </div>
        )}

        {!cache && !syncing && (
          <div className="card">
            <div className="empty">
              <div className="empty-ico">📊</div>
              <div className="empty-txt">No finance data yet</div>
              <div className="empty-sub">Tap Sync Now to pull from Google Sheets</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => doSync(false)}>Sync Now</button>
            </div>
          </div>
        )}

        {cache && (
          <>
            {/* View toggle */}
            <div className="toggle" style={{ marginBottom: 16 }}>
              {['combined', 'R', 'T'].map(v => (
                <button key={v} className={`toggle-btn${view === v ? ' on' : ''}`} onClick={() => setView(v)}>
                  {v === 'combined' ? '🏢 Combined' : v === 'R' ? '👩 Rumana' : '👩‍💼 Thamana'}
                </button>
              ))}
            </div>

            {/* Overall stats */}
            <div className="stats fu">
              <div className="stat" style={{ borderTopColor: 'var(--teal)' }}>
                <div className="stat-lbl">Revenue</div>
                <div className="stat-val sm teal">LKR {fmt(totals.revenue)}</div>
              </div>
              <div className="stat" style={{ borderTopColor: 'var(--coral)' }}>
                <div className="stat-lbl">Costs</div>
                <div className="stat-val sm coral">LKR {fmt(totals.cost)}</div>
              </div>
              <div className="stat" style={{ borderTopColor: totals.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                <div className="stat-lbl">Profit</div>
                <div className={`stat-val sm ${totals.profit >= 0 ? 'green' : 'red'}`}>
                  {totals.profit < 0 ? '−' : ''}LKR {fmt(Math.abs(totals.profit))}
                </div>
              </div>
              <div className="stat" style={{ borderTopColor: 'var(--purple)' }}>
                <div className="stat-lbl">Margin</div>
                <div className="stat-val sm">{totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) + '%' : '—'}</div>
              </div>
            </div>

            {/* Rumana card */}
            {(view === 'combined' || view === 'R') && (
              <div className="card fu" style={{ animationDelay: '.07s', borderTop: '3px solid var(--coral)' }}>
                <div className="card-h"><div className="card-accent" style={{ background: 'var(--coral)' }} /><span className="card-title">Rumana (R)</span></div>
                <div className="card-body">
                  <div className="g2" style={{ marginBottom: 12 }}>
                    <div style={{ background: 'var(--coral-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                      <div className="stat-lbl">Invested</div>
                      <div className="stat-val sm coral">LKR {fmt(investment.R)}</div>
                    </div>
                    <div style={{ background: 'var(--green-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                      <div className="stat-lbl">Withdrawn</div>
                      <div className="stat-val sm green">LKR {fmt(withdrawals.R)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--navy-l)', borderRadius: 'var(--rl)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>ROI</span>
                    <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 18, color: roiR >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {roiR >= 0 ? '+' : ''}{roiR.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Thamana card */}
            {(view === 'combined' || view === 'T') && (
              <div className="card fu" style={{ animationDelay: '.10s', borderTop: '3px solid var(--teal)' }}>
                <div className="card-h"><div className="card-accent" style={{ background: 'var(--teal)' }} /><span className="card-title">Thamana (T)</span></div>
                <div className="card-body">
                  <div className="g2" style={{ marginBottom: 12 }}>
                    <div style={{ background: 'var(--coral-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                      <div className="stat-lbl">Invested</div>
                      <div className="stat-val sm coral">LKR {fmt(investment.T)}</div>
                    </div>
                    <div style={{ background: 'var(--green-l)', borderRadius: 'var(--rl)', padding: '13px 15px' }}>
                      <div className="stat-lbl">Withdrawn</div>
                      <div className="stat-val sm green">LKR {fmt(withdrawals.T)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--navy-l)', borderRadius: 'var(--rl)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 13 }}>ROI</span>
                    <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 18, color: roiT >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {roiT >= 0 ? '+' : ''}{roiT.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly bars */}
            {recentMonths.length > 0 && (
              <div className="card fu" style={{ animationDelay: '.14s' }}>
                <div className="card-h"><div className="card-accent" style={{ background: 'var(--navy)' }} /><span className="card-title">Monthly Breakdown</span></div>
                <div className="card-body" style={{ padding: '12px 14px' }}>
                  {recentMonths.map((m, i) => {
                    const barW = ((m.revenue || 0) / maxRev * 100);
                    const p = m.profit || 0;
                    return (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{MONTHS[(m.month || 1) - 1]} {m.year}</span>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>LKR {fmt(m.revenue)}</span>
                            <span style={{ color: 'var(--coral)', fontWeight: 700 }}>−{fmt(m.cost)}</span>
                            <span style={{ color: p >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{p >= 0 ? '+' : '−'}{fmt(Math.abs(p))}</span>
                          </div>
                        </div>
                        <div className="pbar">
                          <div className="pbar-fill" style={{ width: `${barW}%`, background: p >= 0 ? 'var(--teal)' : 'var(--red)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
