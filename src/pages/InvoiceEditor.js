import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft, Eye, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fmt, today, uid, calcTotals, INVOICE_STATUSES } from '../lib/utils';

const DEFAULT_TERMS = `A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.
The remaining fifty percent (50%) is due upon completion of the event/session.
Staff to handle stations will be provided.
Activity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour.`;

function emptyMain() { return { id: uid(), name: '', description: '', price: '', hasSubItems: false, subItems: [] }; }
function emptySub()  { return { id: uid(), description: '', qty: 1, price: '' }; }

function initData(invoice, settings) {
  if (invoice && !invoice._isNew) {
    return { ...invoice, items: invoice.items?.length ? invoice.items : [emptyMain()] };
  }
  return {
    _isNew: true,
    _draftId: null,
    id: uid(),
    invoice_number: settings?._nextNumber || `${settings?.prefix || 'CC'}-${settings?.nextNum || 351}`,
    date: today(),
    customer_id: '', customer_name: '', customer_phone: '', customer_email: '', customer_address: '',
    items: [emptyMain()],
    discount_type: 'fixed', discount: 0, delivery: 0,
    status: 'unpaid', amount_paid: 0, notes: '',
    terms: settings?.terms || DEFAULT_TERMS,
    bank_account_name: settings?.bname || '',
    bank_account: settings?.bacc || '',
    bank_name: settings?.bbank || '',
  };
}

export default function InvoiceEditor({ invoice, settings, customers, onSave, onBack, onPreview }) {
  const isNew = !invoice?.id || invoice?._isNew;
  const [data, setData]     = useState(() => initData(invoice, settings));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimer = useRef(null);
  const draftIdRef = useRef(data._draftId);

  // ── AUTO-SAVE DRAFT ────────────────────────────────────────────────
  const saveDraft = useCallback(async (d) => {
    if (!isNew) return; // only draft new invoices
    try {
      const payload = {
        data: d,
        saved_at: new Date().toISOString(),
        invoice_number: d.invoice_number,
        customer_name: d.customer_name,
      };
      if (draftIdRef.current) {
        await supabase.from('drafts').update(payload).eq('id', draftIdRef.current);
      } else {
        const newId = uid();
        await supabase.from('drafts').insert([{ id: newId, ...payload }]);
        draftIdRef.current = newId;
        setData(prev => ({ ...prev, _draftId: newId }));
      }
      setLastSaved(new Date());
    } catch (e) { console.error('Draft save error:', e); }
  }, [isNew]);

  // Auto-save 2 seconds after last keystroke
  useEffect(() => {
    if (!isNew) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraft(data), 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [data, isNew, saveDraft]);

  // Save on unmount / navigate away
  useEffect(() => {
    return () => {
      if (isNew) saveDraft(data);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── HELPERS ────────────────────────────────────────────────────────
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  function fillCustomer(cid) {
    const c = (customers || []).find(x => x.id === cid);
    if (!c) return;
    setData(d => ({ ...d, customer_id: cid, customer_name: c.name || '', customer_phone: c.phone || '', customer_email: c.email || '', customer_address: c.address || '' }));
  }

  const setItem  = (id, k, v) => setData(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, [k]: v } : i) }));
  const addMain  = ()          => setData(d => ({ ...d, items: [...d.items, emptyMain()] }));
  const rmMain   = (id)        => { if (data.items.length === 1) return; setData(d => ({ ...d, items: d.items.filter(i => i.id !== id) })); };
  const toggleSub = (id)       => setData(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, hasSubItems: !i.hasSubItems, subItems: !i.hasSubItems && !i.subItems?.length ? [emptySub()] : i.subItems } : i) }));
  const addSub   = (mid)       => setData(d => ({ ...d, items: d.items.map(i => i.id === mid ? { ...i, subItems: [...(i.subItems || []), emptySub()] } : i) }));
  const rmSub    = (mid, sid)  => setData(d => ({ ...d, items: d.items.map(i => i.id === mid ? { ...i, subItems: (i.subItems || []).filter(s => s.id !== sid) } : i) }));
  const setSub   = (mid, sid, k, v) => setData(d => ({ ...d, items: d.items.map(i => i.id === mid ? { ...i, subItems: (i.subItems || []).map(s => s.id === sid ? { ...s, [k]: v } : s) } : i) }));

  const { subtotal, discAmt, total } = calcTotals(data.items, data.discount_type, data.discount, data.delivery);
  const getFinal = () => ({ ...data, subtotal, discount_amt: discAmt, total });

  function validate() {
    const e = {};
    if (!data.customer_name?.trim()) e.name = 'Customer name required';
    if ((data.items || []).every(i => !i.name?.trim())) e.items = 'Add at least one item';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const inv = getFinal();
    try {
      const row = {
        invoice_number: inv.invoice_number, date: inv.date,
        customer_id: inv.customer_id || null, customer_name: inv.customer_name,
        customer_phone: inv.customer_phone, customer_email: inv.customer_email,
        customer_address: inv.customer_address, items: inv.items,
        subtotal: inv.subtotal, discount_type: inv.discount_type, discount: inv.discount,
        discount_amt: inv.discount_amt, delivery: inv.delivery, total: inv.total,
        status: inv.status, amount_paid: inv.amount_paid, notes: inv.notes, terms: inv.terms,
        bank_account_name: inv.bank_account_name, bank_account: inv.bank_account, bank_name: inv.bank_name,
      };
      if (isNew) {
        const nextNum = (settings?.nextNum || 351) + 1;
        await supabase.from('settings').upsert({ id: 'global', data: { ...settings, nextNum } });
        const { error } = await supabase.from('invoices').insert([{ id: inv.id, ...row }]);
        if (error) throw error;
        // Delete draft after successful save
        if (draftIdRef.current) {
          await supabase.from('drafts').delete().eq('id', draftIdRef.current);
        }
      } else {
        const { error } = await supabase.from('invoices').update({ ...row, updated_at: new Date().toISOString() }).eq('id', inv.id);
        if (error) throw error;
      }
      onSave(inv);
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
    setSaving(false);
  }

  const lbl = (t, req) => (
    <label className="lbl">{t}{req && <span style={{ color: 'var(--red)' }}> *</span>}</label>
  );

  return (
    <div className="page-full">
      {/* Sub-header */}
      <div className="subheader no-print">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="subheader-title">{isNew ? 'New Invoice' : `Edit ${data.invoice_number}`}</span>
          {lastSaved && <span style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>Draft saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onPreview(getFinal())}><Eye size={13} /></button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="wrap-sm" style={{ paddingTop: 72 }}>

        {/* Invoice meta */}
        <div className="card fu">
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--teal)' }} /><span className="card-title">Invoice Details</span></div>
          <div className="card-body">
            <div className="g2">
              <div className="field"><label className="lbl">Invoice #</label><input className="inp" value={data.invoice_number} onChange={e => set('invoice_number', e.target.value)} /></div>
              <div className="field"><label className="lbl">Date</label><input className="inp" type="date" value={data.date} onChange={e => set('date', e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="card fu" style={{ animationDelay: '.05s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--coral)' }} /><span className="card-title">Customer</span></div>
          <div className="card-body">
            {(customers || []).length > 0 && (
              <div className="field">
                <label className="lbl">Fill from existing client</label>
                <select className="inp" value={data.customer_id || ''} onChange={e => fillCustomer(e.target.value)}>
                  <option value="">— New customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                </select>
              </div>
            )}
            {errors.name && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10 }}>⚠ {errors.name}</div>}
            <div className="g2">
              <div className="field span2">{lbl('Name', true)}<input className={`inp${errors.name ? ' err' : ''}`} value={data.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="e.g. Mrs. Christa" /></div>
              <div className="field">{lbl('Phone')}<input className="inp" value={data.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+94..." /></div>
              <div className="field">{lbl('Email')}<input className="inp" value={data.customer_email} onChange={e => set('customer_email', e.target.value)} /></div>
              <div className="field span2">{lbl('Address')}<input className="inp" value={data.customer_address} onChange={e => set('customer_address', e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card fu" style={{ animationDelay: '.10s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--yellow)' }} /><span className="card-title">Items & Services</span></div>
          <div className="card-body" style={{ paddingBottom: 12 }}>
            {errors.items && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10 }}>⚠ {errors.items}</div>}
            {data.items.map((item) => {
              const subTotal = item.hasSubItems
                ? (item.subItems || []).reduce((s, si) => s + (parseFloat(si.qty) || 0) * (parseFloat(si.price) || 0), 0)
                : parseFloat(item.price) || 0;
              return (
                <div key={item.id} style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', background: 'var(--surface2)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleSub(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--teal)', padding: 0, flexShrink: 0 }} title={item.hasSubItems ? 'Remove sub-items' : 'Add sub-items'}>
                      {item.hasSubItems ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <input className="inp" style={{ flex: '2 1 140px', fontWeight: 600 }} placeholder="Main item (e.g. Tote Bag Painting)" value={item.name} onChange={e => setItem(item.id, 'name', e.target.value)} />
                    <input className="inp" style={{ flex: '1.5 1 100px' }} placeholder="Description (optional)" value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)} />
                    {!item.hasSubItems
                      ? <input className="inp" type="number" min="0" style={{ flex: '0 0 110px' }} placeholder="Price (LKR)" value={item.price} onChange={e => setItem(item.id, 'price', e.target.value)} />
                      : <div style={{ flex: '0 0 110px', textAlign: 'right', fontFamily: 'var(--fn)', fontWeight: 700, fontSize: 14, paddingRight: 4 }}>LKR {fmt(subTotal)}</div>
                    }
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => rmMain(item.id)} disabled={data.items.length === 1} style={{ opacity: data.items.length === 1 ? .3 : 1, flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                  {item.hasSubItems && (
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 32px', gap: 8, marginBottom: 6 }}>
                        <span className="lbl">Description</span><span className="lbl">Qty</span><span className="lbl">Unit Price</span><span />
                      </div>
                      {(item.subItems || []).map(si => (
                        <div key={si.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <input className="inp inp-sm" value={si.description} onChange={e => setSub(item.id, si.id, 'description', e.target.value)} placeholder="e.g. 40 bags" />
                          <input className="inp inp-sm" type="number" min="0" value={si.qty} onChange={e => setSub(item.id, si.id, 'qty', e.target.value)} />
                          <input className="inp inp-sm" type="number" min="0" value={si.price} onChange={e => setSub(item.id, si.id, 'price', e.target.value)} placeholder="1700" />
                          <button className="btn btn-icon btn-danger" style={{ width: 28, height: 28, borderRadius: 7 }} onClick={() => rmSub(item.id, si.id)} disabled={(item.subItems || []).length === 1}><Trash2 size={11} /></button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--teal)', fontSize: 12 }} onClick={() => addSub(item.id)}><Plus size={12} /> Add sub-item</button>
                    </div>
                  )}
                </div>
              );
            })}
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--teal)', marginTop: 4 }} onClick={addMain}>
              <Plus size={15} /> Add Main Item
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="card fu" style={{ animationDelay: '.15s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--navy)' }} /><span className="card-title">Pricing & Status</span></div>
          <div className="card-body">
            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="field"><label className="lbl">Discount Type</label><select className="inp" value={data.discount_type} onChange={e => set('discount_type', e.target.value)}><option value="fixed">Fixed (LKR)</option><option value="pct">Percentage (%)</option></select></div>
              <div className="field"><label className="lbl">Discount</label><input className="inp" type="number" min="0" value={data.discount} onChange={e => set('discount', e.target.value)} /></div>
              <div className="field"><label className="lbl">Delivery (LKR)</label><input className="inp" type="number" min="0" value={data.delivery} onChange={e => set('delivery', e.target.value)} /></div>
              <div className="field"><label className="lbl">Payment Status</label>
                <select className="inp" value={data.status} onChange={e => set('status', e.target.value)}>
                  {INVOICE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              {['partial', 'deposit', 'balance'].includes(data.status) && (
                <div className="field"><label className="lbl">Amount Paid (LKR)</label><input className="inp" type="number" min="0" value={data.amount_paid} onChange={e => set('amount_paid', e.target.value)} /></div>
              )}
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--rl)', padding: 16, border: '1px solid var(--border)' }}>
              <div className="sum-row"><span>Subtotal</span><span>LKR {fmt(subtotal)}</span></div>
              {discAmt > 0 && <div className="sum-row" style={{ color: 'var(--coral)' }}><span>Discount{data.discount_type === 'pct' ? ` (${data.discount}%)` : ''}</span><span>− LKR {fmt(discAmt)}</span></div>}
              {parseFloat(data.delivery) > 0 && <div className="sum-row"><span>Delivery</span><span>LKR {fmt(parseFloat(data.delivery))}</span></div>}
              <div className="div" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 15 }}>TOTAL</span>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 20, color: 'var(--teal)' }}>LKR {fmt(total)}</span>
              </div>
              {parseFloat(data.amount_paid) > 0 && (
                <div className="sum-row" style={{ marginTop: 8 }}><span>Balance Due</span><span style={{ color: 'var(--red)', fontWeight: 700 }}>LKR {fmt(total - parseFloat(data.amount_paid))}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="card fu" style={{ animationDelay: '.2s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--teal)' }} /><span className="card-title">Notes & Terms</span></div>
          <div className="card-body">
            <div className="field"><label className="lbl">Notes</label><textarea className="inp" rows={2} value={data.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} placeholder="Thank you for your booking!" /></div>
            <div className="field"><label className="lbl">Terms</label><textarea className="inp" rows={4} value={data.terms} onChange={e => set('terms', e.target.value)} style={{ resize: 'vertical', fontSize: 12.5 }} /></div>
          </div>
        </div>

        {/* Bank */}
        <div className="card fu" style={{ animationDelay: '.25s' }}>
          <div className="card-h"><div className="card-accent" style={{ background: 'var(--coral)' }} /><span className="card-title">Bank Details</span></div>
          <div className="card-body">
            <div className="g2">
              <div className="field"><label className="lbl">Account Name</label><input className="inp" value={data.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} /></div>
              <div className="field"><label className="lbl">Account Number</label><input className="inp" value={data.bank_account} onChange={e => set('bank_account', e.target.value)} /></div>
              <div className="field span2"><label className="lbl">Bank</label><input className="inp" value={data.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-ghost" onClick={() => onPreview(getFinal())}><Eye size={14} /> Preview</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
