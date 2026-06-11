import React from 'react';
import { ArrowLeft, Download, Edit } from 'lucide-react';
import { fmt, fmtDate } from '../lib/utils';
import { LOGO } from '../logo';

export default function InvoicePreview({ invoice, settings, onBack, onEdit }) {
  async function downloadPDF() {
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

  const {
    invoice_number, date, customer_name, customer_address, customer_phone, customer_email,
    items = [], subtotal, discount_type, discount, discount_amt, delivery, total,
    notes, terms, bank_account_name, bank_account, bank_name, amount_paid,
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

  return (
    <div className="page-full" style={{ background: '#DDE4E2' }}>
      <div className="subheader no-print" style={{ background: 'var(--navy)', borderColor: 'transparent' }}>
        <button className="btn btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,.12)', border: 'none' }} onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span style={{ fontFamily: 'var(--fn)', fontWeight: 800, color: '#fff', fontSize: 14 }}>Preview</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && <button className="btn btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,.12)', border: 'none' }} onClick={onEdit}><Edit size={13} /> Edit</button>}
          <button className="btn btn-primary btn-sm" onClick={downloadPDF}><Download size={13} /> PDF</button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '72px 12px 60px' }}>
        <div id="inv-print">
          {/* Header — logo directly on dark bg, NO white box */}
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

            {/* Totals — fixed LKR size to match surrounding text */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <div style={{ width: 260 }}>
                <div className="sum-row"><span>Subtotal</span><span>LKR {fmt(subtotal)}</span></div>
                {discount_amt > 0 && <div className="sum-row" style={{ color: '#F78C6B' }}><span>Discount{discount_type === 'pct' ? ` (${discount}%)` : ''}</span><span>− LKR {fmt(discount_amt)}</span></div>}
                {parseFloat(delivery) > 0 && <div className="sum-row"><span>Delivery</span><span>LKR {fmt(parseFloat(delivery))}</span></div>}
                <div style={{ height: 1, background: '#E2ECEA', margin: '8px 0' }} />
                {/* Total pill — consistent font size, no oversized LKR */}
                <div className="inv-total-pill">
                  <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Due</span>
                  <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 14, color: '#6EC5B8', letterSpacing: '0.01em' }}>LKR {fmt(total)}</span>
                </div>
                {parseFloat(amount_paid) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: '#E85D5D', fontWeight: 700 }}>
                    <span>Balance Due</span><span>LKR {fmt(balanceDue)}</span>
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
    </div>
  );
}
