import React from 'react';
import { LayoutDashboard, FileText, Users, Receipt, TrendingUp } from 'lucide-react';
import { LOGO } from '../logo';
import { getUserProfile } from '../lib/supabase';

const TABS = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'invoices',  label: 'Invoices', icon: FileText },
  { id: 'customers', label: 'Clients',  icon: Users },
  { id: 'expenses',  label: 'Events',   icon: Receipt },
  { id: 'finance',   label: 'Finance',  icon: TrendingUp },
];

const TAB_LABELS = { dashboard: '🏠 Home', invoices: '📄 Invoices', customers: '👥 Clients', expenses: '🎪 Events', finance: '📊 Finance' };

export function TopNav({ tab, onTab, onProfile, user, onNew }) {
  const profile = getUserProfile(user?.email);
  const meta = user?.user_metadata || {};
  const avatarUrl = meta.avatar_url;

  const newLabel = { invoices: '+ Invoice', customers: '+ Client', expenses: '+ Event' }[tab];

  return (
    <header className="topnav no-print">
      <div className="topnav-brand">
        <img src={LOGO} alt="Crafty Cubs" />
        <div>
          <div className="topnav-brand-name">Crafty Cubs</div>
          <div className="topnav-brand-sub">Admin</div>
        </div>
      </div>

      <nav className="topnav-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`topnav-tab${tab === t.id ? ' active' : ''}`} onClick={() => onTab(t.id)}>
            {TAB_LABELS[t.id]}
          </button>
        ))}
      </nav>

      <div className="topnav-right">
        {newLabel && (
          <button className="btn btn-primary btn-sm" onClick={onNew}>{newLabel}</button>
        )}
        <button onClick={onProfile} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title={`${profile.name} — My Profile`}>
          <div className="avatar" style={{ background: profile.bg, color: profile.color, width: 34, height: 34, fontSize: 14 }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : profile.initial}
          </div>
        </button>
      </div>
    </header>
  );
}

export function BottomNav({ tab, onTab }) {
  return (
    <nav className="bnav no-print">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={`bnav-item${tab === id ? ' on' : ''}`} onClick={() => onTab(id)}>
          <Icon size={21} strokeWidth={tab === id ? 2.5 : 1.8} />
          <span>{label}</span>
          <span className="bnav-pip" />
        </button>
      ))}
    </nav>
  );
}
