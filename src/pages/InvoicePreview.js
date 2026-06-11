import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Edit, BookmarkCheck, CreditCard, X } from 'lucide-react';
import { fmt, fmtDate, uid } from '../lib/utils';
import { LOGO } from '../logo';
import { supabase } from '../lib/supabase';

export default function InvoicePreview({ invoice, settings, onBack, onEdit }) {
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [payments, setPayments]     = useState([]);
  const [payModal, setPayModal]     = useState(false);
  const [payForm, setPayForm]       = useState({ amount: '', note: '', method: 'bank' });
  const [payLoading, setPayLoading] = useState(false);

  const isPaid = invoice?.status === 'paid';
  const isUnsaved = invoice?._isNew;

  // Load payment history
  useEffect(() => {
    if (!invoice?.id || isUnsaved) return;
    supabase.from('payments').select('*').eq('invoice_id', invoice.id).order('created_at', { ascending: false })
      .then(({ data }) => setPayments(data || []));
  }, [invoice?.id, isUnsaved]);

  async function saveDraft() {
    setSaving(true);
    const draftId = invoice._draftId || `draft_${invoice.invoice_number || Date.now()}`;
    await supabase.from('drafts').upsert({
      id: draftId,
      data: invoice,
      invoice_number: invoice.invoice_number || '',
      customer_name: invoice.customer_name || '',
      saved_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Save invoice to DB then download PDF
  async function downloadPDF() {
    // If invoice exists in DB already, just generate PDF
    if (!isUnsaved && invoice.id) {
      return generatePDF();
    }
    // Otherwise save it first
    setSaving(true);
    try {
      const row = {
        invoice_number: invoice.invoice_number, date: invoice.date,
        customer_id: invoice.customer_id || null, customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone, customer_email: invoice.customer_email,
        customer_address: invoice.customer_address, items: invoice.items,
        subtotal: invoice.subtotal, discount_type: invoice.discount_type,
        discount: invoice.discount, discount_amt: invoice.discount_amt,
        delivery: invoice.delivery, total: invoice.total,
        status: invoice.status || 'unpaid', amount_paid: invoice.amount_paid,
        notes: invoice.notes, terms: invoice.terms,
        bank_account_name: invoice.bank_account_name, bank_account: invoice.bank_account, bank_name: invoice.bank_name,
      };
      await supabase.from('invoices').upsert([{ id: invoice.id, ...row }]);
      if (invoice._draftId) await supabase.from('drafts').delete().eq('id', invoice._draftId);
    } catch (e) { console.error('Auto-save before PDF failed:', e); }
    setSaving(false);
    generatePDF();
  }

  async function generatePDF() {
    const { default: html2pdf } = await import('html2pdf.js');
    const el = document.getElementById('inv-print');
    html2pdf().set({
      margin: [7, 7, 7, 7],
      filename: `CraftyCubs_${invoice.invoice_number || 'Invoice'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  }

  // Record a payment
  async function recordPayment() {
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }
    if (!invoice?.id) { alert('Save the invoice first before recording payments'); return; }
    setPayLoading(true);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0) + amt;
    const newStatus = totalPaid >= (invoice.total || 0) ? 'paid' : 'partial';
    try {
      await supabase.from('payments').insert([{
        id: uid(),
        invoice_id: invoice.id,
        amount: amt,
        note: payForm.note || '',
        method: payForm.method,
      }]);
      await supabase.from('invoices').update({
        amount_paid: totalPaid,
        status: newStatus,
      }).eq('id', invoice.id);
      // Refresh payments
      const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoice.id).order('created_at', { ascending: false });
      setPayments(data || []);
      setPayModal(false);
      setPayForm({ amount: '', note: '', method: 'bank' });
    } catch (e) { alert('Could not record payment: ' + e.message); }
    setPayLoading(false);
  }

  const {
    invoice_number, date, customer_name, customer_address, customer_phone, customer_email,
    items = [], subtotal, discount_type, discount, discount_amt, delivery, total,
    notes, terms, bank_account_name, bank_account, bank_name, amount_paid, status,
  } = invoice;

  const renderItems = () => (items || []).filter(i => i.name).map((item, idx) => {
    const hasSub = item.hasSubItems && item.subItems?.length > 0;
    const itemTotal = hasSub
      ? item.subItems.reduce((s, si) => s + (parseFloat(si.qty)||0) * (parseFloat(si.price)||0), 0)
      : parseFloat(item.price) || 0;
    return (
      <React.Fragment key={item.id || idx}>
        <div className="inv-tbl-row" style={{ background: idx % 2 === 0 ? '#fff' : '#FAFCFB' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#2E3A59' }}>{item.name}</div>
            {item.description && <div style={{ fontSize: 11.5, color: '#6B7A99', marginTop: 1 }}>{item.description}</div>}
          </div>
          <span style={{ textAlign: 'right', fontSize: 12, color: '#6B7A99' }}>{hasSub ? '—' : '1'}</span>
          <span style={{ textAlign: 'right', fontSize: 12, color: '#6B7A99' }}>{hasSub ? '—' : `LKR ${fmt(item.price)}`}</span>
          <span style={{ textAlign: 'right', fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13 }}>LKR {fmt(itemTotal)}</span>
        </div>
        {hasSub && (item.subItems || []).map(si => {
          const st = (parseFloat(si.qty)||0) * (parseFloat(si.price)||0);
          return (
            <div key={si.id} className="inv-sub-row">
              <span style={{ fontSize: 11.5, color: '#6B7A99' }}>↳ {si.description}</span>
              <span style={{ textAlign: 'right', fontSize: 11.5, color: '#6B7A99' }}>{si.qty}</span>
              <span style={{ textAlign: 'right', fontSize: 11.5, color: '#6B7A99' }}>LKR {fmt(si.price)}</span>
              <span style={{ textAlign: 'right', fontSize: 12, color: '#2E3A59', fontWeight: 600 }}>LKR {fmt(st)}</span>
            </div>
          );
        })}
      </React.Fragment>
    );
  });

  const termLines = (terms || '').split('\n').filter(Boolean);
  const balanceDue = Math.max(0, (total || 0) - (parseFloat(amount_paid) || 0));
  const totalPaymentsLogged = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page-full" style={{ background: '#DDE4E2' }}>
      <div className="subheader no-print" style={{ background: 'var(--navy)', borderColor: 'transparent' }}>
        <button className="btn btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,.12)', border: 'none' }} onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span style={{ fontFamily: 'var(--fn)', fontWeight: 800, color: '#fff', fontSize: 14 }}>Preview</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isUnsaved && (
            <button className="btn btn-sm" style={{ color: '#fff', background: saved ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.12)', border: 'none' }} onClick={saveDraft} disabled={saving}>
              <BookmarkCheck size={13} /> {saving ? '…' : saved ? 'Saved!' : 'Save Draft'}
            </button>
          )}
          {!isUnsaved && !isPaid && (
            <button className="btn btn-sm" style={{ color: '#fff', background: 'rgba(110,197,184,.25)', border: 'none' }} onClick={() => setPayModal(true)}>
              <CreditCard size={13} /> Record Payment
            </button>
          )}
          {onEdit && <button className="btn btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,.12)', border: 'none' }} onClick={onEdit}><Edit size={13} /> Edit</button>}
          <button className="btn btn-primary btn-sm" onClick={downloadPDF} disabled={saving}>
            <Download size={13} /> {saving ? 'Saving…' : 'PDF'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '72px 12px 60px' }}>

        {/* Payment history (above invoice, not in print) */}
        {payments.length > 0 && (
          <div className="card no-print" style={{ marginBottom: 16, borderTop: '3px solid var(--green)' }}>
            <div className="card-h">
              <div className="card-accent" style={{ background: 'var(--green)' }} />
              <span className="card-title">Payment History</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--green)', fontSize: 13 }}>LKR {fmt(totalPaymentsLogged)} received</span>
            </div>
            {payments.map(p => (
              <div key={p.id} className="list-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.method === 'cash' ? '💵 Cash' : p.method === 'card' ? '💳 Card' : '🏦 Bank Transfer'}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{p.note || '—'} · {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : ''}</div>
                </div>
                <div style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>LKR {fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        )}

        <div id="inv-print" style={{ position: 'relative' }}>
          {/* PAID watermark */}
          {isPaid && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: 90, fontWeight: 900, color: 'rgba(76,175,130,0.13)',
              fontFamily: "'Nunito',sans-serif", pointerEvents: 'none',
              zIndex: 10, letterSpacing: 8, whiteSpace: 'nowrap', userSelect: 'none',
            }}>PAID</div>
          )}

          {/* Header */}
          <div className="inv-hdr">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={LOGO} alt="Crafty Cubs" style={{ height: 50, width: 'auto', objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 18, color: '#fff', lineHeight: 1 }}>{settings?.coName || 'Crafty Cubs'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>{settings?.coAddr}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{settings?.coPhone}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}>INVOICE</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Invoice #</span>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{invoice_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Date</span>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{fmtDate(date)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="inv-stripe" />

          <div className="inv-body">
            {/* Bill to */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6EC5B8', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 5 }}>Bill To</div>
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 16, color: '#2E3A59' }}>{customer_name}</div>
              {customer_address && <div style={{ color: '#6B7A99', fontSize: 12.5 }}>{customer_address}</div>}
              {customer_phone  && <div style={{ color: '#6B7A99', fontSize: 12.5 }}>{customer_phone}</div>}
              {customer_email  && <div style={{ color: '#6B7A99', fontSize: 12.5 }}>{customer_email}</div>}
            </div>

            {/* Items table */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #E2ECEA', marginBottom: 18 }}>
              <div className="inv-tbl-hd">
                {['Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              {renderItems()}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <div style={{ width: 260 }}>
                <div className="sum-row"><span>Subtotal</span><span>LKR {fmt(subtotal)}</span></div>
                {discount_amt > 0 && <div className="sum-row" style={{ color: '#F78C6B' }}><span>Discount{discount_type === 'pct' ? ` (${discount}%)` : ''}</span><span>− LKR {fmt(discount_amt)}</span></div>}
                {parseFloat(delivery) > 0 && <div className="sum-row"><span>Delivery</span><span>LKR {fmt(parseFloat(delivery))}</span></div>}
                <div style={{ height: 1, background: '#E2ECEA', margin: '8px 0' }} />
                <div className="inv-total-pill">
                  <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Due</span>
                  <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 14, color: '#6EC5B8', letterSpacing: '0.01em' }}>LKR {fmt(total)}</span>
                </div>
                {parseFloat(amount_paid) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: '#4CAF82', fontWeight: 700 }}>
                    <span>Amount Paid</span><span>LKR {fmt(parseFloat(amount_paid))}</span>
                  </div>
                )}
                {balanceDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12.5, color: '#E85D5D', fontWeight: 700 }}>
                    <span>Balance Due</span><span>LKR {fmt(balanceDue)}</span>
                  </div>
                )}
                {isPaid && (
                  <div style={{ marginTop: 10, background: '#E8F7EF', borderRadius: 8, padding: '6px 12px', textAlign: 'center', fontFamily: "'Nunito',sans-serif", fontWeight: 900, color: '#4CAF82', fontSize: 13, letterSpacing: 1 }}>
                    ✓ FULLY PAID
                  </div>
                )}
              </div>
            </div>

            {/* Terms + Bank */}
            <div style={{ height: 1, background: '#E2ECEA', marginBottom: 18 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              {terms && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#F78C6B', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Terms & Conditions</div>
                  <div style={{ fontSize: 11, color: '#6B7A99', lineHeight: 1.7 }}>
                    {termLines.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>• {l}</div>)}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6EC5B8', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Bank Details</div>
                <div style={{ fontSize: 12, color: '#2E3A59', lineHeight: 1.9 }}>
                  <div><span style={{ fontSize: 10, color: '#6B7A99' }}>Account Name</span><br /><strong>{bank_account_name}</strong></div>
                  <div style={{ marginTop: 3 }}><span style={{ fontSize: 10, color: '#6B7A99' }}>Bank</span><br /><strong>{bank_name}</strong></div>
                  <div style={{ marginTop: 3 }}><span style={{ fontSize: 10, color: '#6B7A99' }}>Account No.</span><br /><strong>{bank_account}</strong></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: 'linear-gradient(135deg,#F0F5F4,#EAF4F2)', borderRadius: 11, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #D8EDEA' }}>
              <div>
                <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: '#2E3A59' }}>{notes || 'Thank you for supporting creative learning! 💛'}</div>
                <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 2 }}>We look forward to seeing you at the next session.</div>
              </div>
              <div style={{ fontSize: 18 }}>🎨</div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {payModal && (
        <div className="overlay fi" onClick={() => setPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-drag" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Record Payment</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPayModal(false)}><X size={15} /></button>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--rl)', padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--t2)' }}>Invoice Total</span>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 700 }}>LKR {fmt(total)}</span>
              </div>
              {balanceDue < total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: 'var(--t2)' }}>Already Paid</span>
                  <span style={{ fontFamily: 'var(--fn)', fontWeight: 700, color: 'var(--green)' }}>LKR {fmt(parseFloat(amount_paid) || 0)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                <span style={{ fontWeight: 700 }}>Balance Due</span>
                <span style={{ fontFamily: 'var(--fn)', fontWeight: 800, color: 'var(--red)' }}>LKR {fmt(balanceDue)}</span>
              </div>
            </div>
            <div className="g2">
              <div className="field">
                <label className="lbl">Amount Received (LKR)</label>
                <input className="inp" type="number" min="0" max={balanceDue} placeholder={fmt(balanceDue)} value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div className="field">
                <label className="lbl">Payment Method</label>
                <select className="inp" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="field span2">
                <label className="lbl">Note (optional)</label>
                <input className="inp" placeholder="e.g. Deposit received, Balance cleared…" value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setPayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={recordPayment} disabled={payLoading}>{payLoading ? 'Saving…' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
