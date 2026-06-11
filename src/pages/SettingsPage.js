import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SettingsPage({ settings, onSave, onBack }) {
  const [d, setD]       = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));

  async function save() {
    setSaving(true);
    const updated = { ...d };
    const { error } = await supabase.from('settings').upsert({ id: 'global', data: updated });
    if (!error) {
      onSave(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert('Save failed: ' + error.message);
    }
    setSaving(false);
  }

  return (
    <div className="page-full">
      <div className="subheader no-print">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span className="subheader-title">Settings</span>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}
          style={saved ? { background: '#22c55e' } : {}}>
          <Save size={13} /> {saving ? '…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="wrap-sm" style={{ paddingTop: 72 }}>
        <div className="card fu">
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--teal)' }} /><span className="card-title">Company Details</span></div>
          <div className="card-body">
            <div className="g2">
              <div className="field"><label className="lbl">Company Name</label><input className="inp" value={d.coName || ''} onChange={e => set('coName', e.target.value)} /></div>
              <div className="field"><label className="lbl">Phone</label><input className="inp" value={d.coPhone || ''} onChange={e => set('coPhone', e.target.value)} /></div>
              <div className="field"><label className="lbl">Email</label><input className="inp" value={d.coEmail || ''} onChange={e => set('coEmail', e.target.value)} /></div>
              <div className="field span2"><label className="lbl">Address</label><input className="inp" value={d.coAddr || ''} onChange={e => set('coAddr', e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="card fu" style={{ animationDelay: '.05s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--coral)' }} /><span className="card-title">Invoice Numbering</span></div>
          <div className="card-body">
            <div className="g2">
              <div className="field">
                <label className="lbl">Prefix</label>
                <input className="inp" value={d.prefix || 'CC'} onChange={e => set('prefix', e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>e.g. "CC" → invoices will be CC-351, CC-352…</div>
              </div>
              <div className="field">
                <label className="lbl">Next Invoice Number</label>
                <input className="inp" type="number" min="1" value={d.nextNum || 351} onChange={e => set('nextNum', parseInt(e.target.value) || 1)} />
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Next invoice will be: <strong>{d.prefix || 'CC'}-{d.nextNum || 351}</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card fu" style={{ animationDelay: '.1s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--yellow)' }} /><span className="card-title">Bank Details</span></div>
          <div className="card-body">
            <div className="g2">
              <div className="field"><label className="lbl">Account Name</label><input className="inp" value={d.bname || ''} onChange={e => set('bname', e.target.value)} /></div>
              <div className="field"><label className="lbl">Account Number</label><input className="inp" value={d.bacc || ''} onChange={e => set('bacc', e.target.value)} /></div>
              <div className="field span2"><label className="lbl">Bank</label><input className="inp" value={d.bbank || ''} onChange={e => set('bbank', e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="card fu" style={{ animationDelay: '.15s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--navy)' }} /><span className="card-title">Default Terms</span></div>
          <div className="card-body">
            <label className="lbl">Applied to every new invoice (editable per invoice)</label>
            <textarea className="inp" rows={5} value={d.terms || ''} onChange={e => set('terms', e.target.value)} style={{ resize: 'vertical', fontSize: 12.5, marginTop: 6 }} />
          </div>
        </div>

        <div style={{ paddingBottom: 40 }} />
      </div>
    </div>
  );
}
