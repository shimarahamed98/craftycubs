import React, { useState } from 'react';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fmt, fmtDate, uid, today, EXP_CATS } from '../lib/utils';

function EventModal({ event, invoices, onSave, onClose }) {
  const isNew = !event?.id;
  const [d, setD] = useState(event || { name:'', date:today(), notes:'', linked_invoice_id:'', items:[{id:uid(),description:'',category:'supplies',amount:0}] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setD(x=>({...x,[k]:v}));

  const addItem = () => setD(x=>({...x,items:[...x.items,{id:uid(),description:'',category:'supplies',amount:0}]}));
  const removeItem = (id) => { if(d.items.length===1)return; setD(x=>({...x,items:x.items.filter(i=>i.id!==id)})); };
  const setItem = (id,k,v) => setD(x=>({...x,items:x.items.map(i=>i.id===id?{...i,[k]:v}:i)}));

  const totalExp = d.items.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const linkedInv = d.linked_invoice_id ? (invoices||[]).find(i=>i.id===d.linked_invoice_id) : null;
  const profit = linkedInv ? (linkedInv.total||0) - totalExp : null;

  async function save() {
    if (!d.name?.trim()) { setErr('Event name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const ev = { ...d, total_expenses: totalExp };
      if (isNew) {
        const { error } = await supabase.from('events').insert([{ ...ev, id: uid() }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').update(ev).eq('id', ev.id);
        if (error) throw error;
      }
      onSave();
    } catch(e) {
      setErr('Could not save: ' + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="overlay fi" onClick={onClose}>
      <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
        <div className="modal-drag"/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 className="modal-title" style={{marginBottom:0}}>{isNew?'New Event':'Edit Event'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15}/></button>
        </div>

        {err && <div style={{background:'var(--red-l)',color:'var(--red)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:13,marginBottom:14}}>⚠ {err}</div>}

        <div className="g2" style={{marginBottom:14}}>
          <div className="field span2"><label className="lbl">Event Name *</label><input className="inp" value={d.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Birthday party — Mrs. Christa"/></div>
          <div className="field"><label className="lbl">Date</label><input className="inp" type="date" value={d.date} onChange={e=>set('date',e.target.value)}/></div>
          <div className="field">
            <label className="lbl">Link to Invoice</label>
            <select className="inp" value={d.linked_invoice_id||''} onChange={e=>set('linked_invoice_id',e.target.value)}>
              <option value="">— None —</option>
              {(invoices||[]).map(i=><option key={i.id} value={i.id}>{i.invoice_number} — {i.customer_name} (LKR {fmt(i.total)})</option>)}
            </select>
          </div>
          <div className="field span2"><label className="lbl">Notes</label><textarea className="inp" rows={2} value={d.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 140px 110px 32px',gap:8,marginBottom:6}}>
            <span className="lbl">Description</span><span className="lbl">Category</span><span className="lbl">Amount (LKR)</span><span/>
          </div>
          {d.items.map(it=>(
            <div key={it.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 110px 32px',gap:8,marginBottom:8,alignItems:'center'}}>
              <input className="inp inp-sm" value={it.description} onChange={e=>setItem(it.id,'description',e.target.value)} placeholder="e.g. Craft supplies"/>
              <select className="inp inp-sm" value={it.category} onChange={e=>setItem(it.id,'category',e.target.value)}>
                {EXP_CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input className="inp inp-sm" type="number" min="0" value={it.amount} onChange={e=>setItem(it.id,'amount',e.target.value)}/>
              <button className="btn btn-icon btn-danger" style={{height:34,width:32}} onClick={()=>removeItem(it.id)} disabled={d.items.length===1}><Trash2 size={12}/></button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{color:'var(--coral)',borderStyle:'dashed',width:'100%',justifyContent:'center',marginTop:4}} onClick={addItem}><Plus size={12}/> Add expense</button>
        </div>

        <div style={{background:'var(--navy-l)',borderRadius:'var(--rl)',padding:'12px 14px',marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>
            📊 Profit / Loss <span style={{background:'var(--navy)',color:'#fff',padding:'1px 6px',borderRadius:4,fontSize:9}}>ADMIN ONLY</span>
          </div>
          <div className="sum-row"><span>Total Expenses</span><span style={{color:'var(--coral)',fontWeight:700}}>LKR {fmt(totalExp)}</span></div>
          {linkedInv
            ? <>
                <div className="sum-row"><span>Revenue ({linkedInv.invoice_number})</span><span style={{color:'var(--teal)',fontWeight:700}}>LKR {fmt(linkedInv.total)}</span></div>
                <div className="div"/>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontFamily:'var(--fn)',fontWeight:800}}>Net {profit>=0?'Profit':'Loss'}</span>
                  <span style={{fontFamily:'var(--fn)',fontWeight:900,fontSize:17,color:profit>=0?'var(--green)':'var(--red)'}}>
                    {profit<0?'−':''}LKR {fmt(Math.abs(profit))}
                  </span>
                </div>
              </>
            : <div style={{fontSize:12,color:'var(--t3)'}}>Link an invoice above to see profit/loss</div>
          }
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-coral" onClick={save} disabled={saving}>{saving?'Saving…':'Save Event'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage({ events, invoices, onRefresh }) {
  const [modal, setModal] = useState(null);

  const totalSpent = (events||[]).reduce((s,e)=>s+(e.total_expenses||0),0);
  const totalRev = (events||[]).reduce((s,ev)=>{
    const inv = ev.linked_invoice_id?(invoices||[]).find(i=>i.id===ev.linked_invoice_id):null;
    return s+(inv?inv.total:0);
  },0);
  const netProfit = totalRev - totalSpent;

  async function del(id) {
    if (!window.confirm('Delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { alert('Could not delete: ' + error.message); return; }
    onRefresh();
  }

  function handleSave() {
    setModal(null);
    onRefresh();
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="stats fu">
          <div className="stat" style={{borderTopColor:'var(--coral)'}}><div className="stat-lbl">Events</div><div className="stat-val">{(events||[]).length}</div></div>
          <div className="stat" style={{borderTopColor:'var(--yellow)'}}><div className="stat-lbl">Total Spent</div><div className="stat-val sm coral">LKR {fmt(totalSpent)}</div></div>
          <div className="stat" style={{borderTopColor:'var(--teal)'}}><div className="stat-lbl">Revenue</div><div className="stat-val sm teal">LKR {fmt(totalRev)}</div></div>
          <div className="stat" style={{borderTopColor:netProfit>=0?'var(--green)':'var(--red)'}}><div className="stat-lbl">Net Profit</div><div className={`stat-val sm ${netProfit>=0?'green':'red'}`}>{netProfit<0?'−':''}LKR {fmt(Math.abs(netProfit))}</div></div>
        </div>

        <div className="card fu" style={{animationDelay:'.07s'}}>
          <div className="card-h">
            <div className="card-accent" style={{background:'var(--coral)'}}/>
            <span className="card-title">Events & Expenses</span>
          </div>
          {(events||[]).length===0
            ? <div className="empty"><div className="empty-ico">🎪</div><div className="empty-txt">No events yet — tap + to add</div></div>
            : (events||[]).map((ev) => {
              const inv = ev.linked_invoice_id?(invoices||[]).find(i=>i.id===ev.linked_invoice_id):null;
              const profit = inv ? (inv.total||0)-(ev.total_expenses||0) : null;
              return (
                <div key={ev.id} className="list-row clickable" style={{flexWrap:'wrap',gap:'6px 10px'}} onClick={()=>setModal(ev)}>
                  <div style={{flex:'1 1 160px',minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.name}</div>
                    <div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{fmtDate(ev.date)}{inv?` · 🔗 ${inv.invoice_number}`:''}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--fn)',fontWeight:700,color:'var(--coral)',fontSize:14}}>LKR {fmt(ev.total_expenses||0)}</div>
                    {profit!==null && <div style={{fontSize:11,fontWeight:700,color:profit>=0?'var(--green)':'var(--red)'}}>{profit>=0?'+':'−'}LKR {fmt(Math.abs(profit))}</div>}
                  </div>
                  <div style={{width:'100%',display:'flex',justifyContent:'flex-end',gap:6}} onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>setModal(ev)}><Edit size={13}/></button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={()=>del(ev.id)}><Trash2 size={13}/></button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button className="fab fab-coral no-print" onClick={()=>setModal('new')} title="New Event">
        <span style={{fontSize:24,lineHeight:1}}>+</span>
      </button>

      {modal && (
        <EventModal
          event={modal==='new'?null:modal}
          invoices={invoices}
          onSave={handleSave}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}
