import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceEditor from './pages/InvoiceEditor';
import InvoicePreview from './pages/InvoicePreview';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import FinancePage from './pages/FinancePage';
import SettingsPage from './pages/SettingsPage';
import { TopNav, BottomNav } from './components/Nav';
import './styles/app.css';

const DEFAULT_SETTINGS = {
  coName: 'Crafty Cubs',
  coAddr: '32, Lorenz Road, Colombo 04',
  coPhone: '+94 77 763 4750',
  coEmail: '',
  prefix: 'CC',
  nextNum: 351,
  bname: 'Thamana Mahuroof',
  bacc: '200220052081',
  bbank: 'Nations Trust Bank (Crescat Branch)',
  terms: 'A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.\nThe remaining fifty percent (50%) is due upon completion of the event/session.\nStaff to handle stations will be provided.\nActivity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour.',
};

function Loader({ message }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)', gap: 14 }}>
      <div style={{ fontSize: 44 }}>🎨</div>
      <div style={{ fontFamily: 'var(--fn)', fontWeight: 800, color: 'var(--navy)', fontSize: 17 }}>{message || 'Loading…'}</div>
    </div>
  );
}

export default function App() {
  const [authState, setAuthState] = useState('loading');
  const [user, setUser]           = useState(null);
  const [tab, setTab]             = useState('dashboard');
  const [view, setView]           = useState('list');
  const [settings, setSettings]   = useState(DEFAULT_SETTINGS);
  const [invoices, setInvoices]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [events, setEvents]       = useState([]);
  const [drafts, setDrafts]       = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [dataLoading, setDataLoading]     = useState(false);
  const [dbError, setDbError]             = useState('');

  // ── AUTH ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user); setAuthState('in');
      } else {
        setAuthState('out');
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user); setAuthState('in');
      } else {
        setUser(null); setAuthState('out');
        setInvoices([]); setCustomers([]); setEvents([]); setDrafts([]);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ── LOAD ALL DATA — always reloads, no caching ───────────────────
  const loadAll = useCallback(async () => {
    if (authState !== 'in') return;
    setDataLoading(true);
    setDbError('');
    try {
      const [sRes, iRes, cRes, eRes, dRes] = await Promise.all([
        supabase.from('settings').select('data').eq('id', 'global').maybeSingle(),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('drafts').select('*').order('saved_at', { ascending: false }),
      ]);

      // Check for errors
      if (iRes.error) throw new Error('Invoices: ' + iRes.error.message);
      if (cRes.error) throw new Error('Customers: ' + cRes.error.message);
      if (eRes.error) throw new Error('Events: ' + eRes.error.message);

      const s = { ...DEFAULT_SETTINGS, ...(sRes.data?.data || {}) };
      setSettings(s);
      setInvoices(iRes.data || []);
      setCustomers(cRes.data || []);
      setEvents(eRes.data || []);

      // Drafts — filter expired (>30 days)
      const now = Date.now();
      const validDrafts = (dRes.data || []).filter(d =>
        now - new Date(d.saved_at).getTime() < 30 * 24 * 60 * 60 * 1000
      );
      setDrafts(validDrafts);

      // Clean expired drafts
      const expiredIds = (dRes.data || [])
        .filter(d => now - new Date(d.saved_at).getTime() >= 30 * 24 * 60 * 60 * 1000)
        .map(d => d.id);
      if (expiredIds.length) supabase.from('drafts').delete().in('id', expiredIds).then(() => {});

    } catch (e) {
      console.error('Load error:', e);
      setDbError(e.message);
    }
    setDataLoading(false);
  }, [authState]);

  useEffect(() => { if (authState === 'in') loadAll(); }, [authState, loadAll]);

  // ── NAV ───────────────────────────────────────────────────────────
  function goTab(t) { setTab(t); setView('list'); setActiveInvoice(null); }

  function goBack() {
    if (view === 'editor') setView(activeInvoice && !activeInvoice._isNew ? 'preview' : 'list');
    else setView('list');
    setActiveInvoice(null);
  }

  // ── INVOICE ACTIONS ───────────────────────────────────────────────
  function newInvoice() {
    setActiveInvoice({ _isNew: true, invoice_number: `${settings.prefix}-${settings.nextNum}` });
    setTab('invoices'); setView('editor');
  }

  function openInvoice(inv)  { setActiveInvoice(inv); setTab('invoices'); setView('preview'); }
  function editInvoice(inv)  { setActiveInvoice(inv || { _isNew: true, invoice_number: `${settings.prefix}-${settings.nextNum}` }); setView('editor'); }
  function savedInvoice(inv) { setActiveInvoice(inv); setView('preview'); loadAll(); }
  function handleNew(forTab) {
    const target = forTab || tab;
    if (target === 'invoices') newInvoice();
  }
  function handleSaveSettings(s) { setSettings(s); setView('list'); }

  // ── RENDER ────────────────────────────────────────────────────────
  if (authState === 'loading') return <Loader message="Starting up…" />;
  if (authState === 'out')     return <LoginPage />;
  if (dataLoading && !invoices.length) return <Loader message="Loading your data…" />;

  const isFullscreen = ['editor', 'preview', 'settings', 'profile'].includes(view);

  return (
    <>
      {/* DB Error banner */}
      {dbError && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--red)', color: '#fff', padding: '10px 16px', fontSize: 13, zIndex: 9999, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ Database error: {dbError}</span>
          <button onClick={() => setDbError('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {!isFullscreen && <TopNav tab={tab} onTab={goTab} onProfile={() => setView('profile')} user={user} onNew={handleNew} />}

      {view === 'profile'  && <ProfilePage user={user} onBack={goBack} onLogout={() => {}} />}
      {view === 'settings' && <SettingsPage settings={settings} onSave={handleSaveSettings} onBack={goBack} />}
      {view === 'editor'   && (
        <InvoiceEditor
          invoice={activeInvoice?._isNew ? null : activeInvoice}
          settings={{ ...settings, _nextNumber: activeInvoice?.invoice_number }}
          customers={customers}
          user={user}
          onSave={savedInvoice}
          onBack={goBack}
          onPreview={(inv) => { setActiveInvoice(inv); setView('preview'); }}
        />
      )}
      {view === 'preview' && activeInvoice && (
        <InvoicePreview invoice={activeInvoice} settings={settings} onBack={goBack} onEdit={() => editInvoice(activeInvoice)} />
      )}

      {!isFullscreen && tab === 'dashboard'  && <DashboardPage user={user} invoices={invoices} customers={customers} events={events} onOpenInvoice={openInvoice} onTab={goTab} onNew={handleNew} />}
      {!isFullscreen && tab === 'invoices'   && <InvoicesPage invoices={invoices} drafts={drafts} onOpen={openInvoice} onEdit={editInvoice} onRefresh={loadAll} />}
      {!isFullscreen && tab === 'customers'  && <CustomersPage customers={customers} invoices={invoices} onRefresh={loadAll} />}
      {!isFullscreen && tab === 'expenses'   && <ExpensesPage events={events} invoices={invoices} onRefresh={loadAll} />}
      {!isFullscreen && tab === 'finance'    && <FinancePage user={user} invoices={invoices} events={events} />}

      {!isFullscreen && (
        <button onClick={() => setView('settings')} className="no-print" title="Settings"
          style={{ position: 'fixed', bottom: 'calc(var(--bnav) + 12px)', left: 16, width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, boxShadow: 'var(--sh2)', zIndex: 200 }}>
          ⚙️
        </button>
      )}
      {!isFullscreen && <BottomNav tab={tab} onTab={goTab} />}
    </>
  );
}
