import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fmt, fmtDate, uid } from '../lib/utils';

function CustomerModal({ customer, invoices, onSave, onClose }) {
  const isNew = !customer?.id;
  const [d, setD] = useState(customer || { name:'', phone:'', email:'', address:'', notes:'', custom_fields:[] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setD(x => ({...x,[k]:v}));
  const addCF = () => setD(x => ({...x, custom_fields:[...(x.custom_fields||[]),{id:uid(),label:'',value:''}]}));
  const setCF = (id,k,v) => setD(x => ({...x, custom_fields:(x.custom_fields||[]).map(f=>f.id===id?{...f,[k]:v}:f)}));
  const removeCF = (id) => setD(x => ({...x, custom_fields:(x.custom_fields||[]).filter(f=>f.id!==id)}));

  const custInvoices = (invoices||[]).filter(i => i.customer_id===d.id || i.customer_name===d.name);
  const totalSpend = custInvoices.reduce((s,i)=>s+(i.total||0),0);

  async function save() {
    if (!d.name?.trim()) { setErr('Name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      if (isNew) {
        const newId = uid();
        const { error } = await supabase.from('customers').insert([{ ...d, id: newId }]);
        if (error) throw error;
        onSave({ ...d, id: newId });
      } else {
        const { error } = await supabase.from('customers').update(d).eq('id', d.id);
        if (error) throw error;
        onSave(d);
      }
    } catch(e) {
      setErr('Could not save: ' + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="overlay fi" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-drag"/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 className="modal-title" style={{marginBottom:0}}>{isNew?'New Client':'Edit Client'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15}/></button>
        </div>

        {err && <div style={{background:'var(--red-l)',color:'var(--red)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:13,marginBottom:14}}>⚠ {err}</div>}

        <div className="g2">
          <div className="field span2"><label className="lbl">Name *</label><input className="inp" value={d.name} onChange={e=>set('name',e.target.value)} placeholder="Full name"/></div>
          <div className="field"><label className="lbl">Phone</label><input className="inp" value={d.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
          <div className="field"><label className="lbl">Email</label><input className="inp" value={d.email||''} onChange={e=>set('email',e.target.value)}/></div>
          <div className="field span2"><label className="lbl">Address</label><input className="inp" value={d.address||''} onChange={e=>set('address',e.target.value)}/></div>
          <div className="field span2"><label className="lbl">Notes</label><textarea className="inp" rows={2} value={d.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <label className="lbl" style={{marginBottom:0}}>Custom Fields</label>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={addCF}><Plus size={11}/> Add</button>
          </div>
          {(d.custom_fields||[]).map(cf=>(
            <div key={cf.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 30px',gap:8,marginBottom:8}}>
              <input className="inp inp-sm" placeholder="Label" value={cf.label} onChange={e=>setCF(cf.id,'label',e.target.value)}/>
              <input className="inp inp-sm" placeholder="Value" value={cf.value} onChange={e=>setCF(cf.id,'value',e.target.value)}/>
              <button className="btn btn-icon btn-danger" style={{height:36,width:30}} onClick={()=>removeCF(cf.id)}><X size={11}/></button>
            </div>
          ))}
        </div>

        {custInvoices.length>0 && (
          <div style={{background:'var(--surface2)',borderRadius:'var(--rl)',padding:'12px 14px',marginBottom:16}}>
            <div style={{fontFamily:'var(--fn)',fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:8}}>Invoice History ({custInvoices.length})</div>
            {custInvoices.slice(0,5).map(inv=>(
              <div key={inv.id} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:5,color:'var(--t2)'}}>
                <span style={{color:'var(--teal)',fontWeight:700}}>{inv.invoice_number}</span>
                <span>{fmtDate(inv.date)}</span>
                <span style={{fontWeight:600}}>LKR {fmt(inv.total)}</span>
              </div>
            ))}
            <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontFamily:'var(--fn)',fontWeight:800,fontSize:13}}>
              <span>Total Spend</span><span style={{color:'var(--coral)'}}>LKR {fmt(totalSpend)}</span>
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Client'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage({ customers, invoices, onRefresh }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = (customers||[]).filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function del(id) {
    if (!window.confirm('Delete this client?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
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
        <div className="stats-3 fu">
          <div className="stat" style={{borderTopColor:'var(--teal)'}}><div className="stat-lbl">Total Clients</div><div className="stat-val">{(customers||[]).length}</div></div>
          <div className="stat" style={{borderTopColor:'var(--coral)'}}><div className="stat-lbl">Total Revenue</div><div className="stat-val sm coral">LKR {fmt((invoices||[]).reduce((s,i)=>s+(i.total||0),0))}</div></div>
          <div className="stat" style={{borderTopColor:'var(--yellow)'}}><div className="stat-lbl">Repeat Clients</div><div className="stat-val">{(customers||[]).filter(c=>(invoices||[]).filter(i=>i.customer_id===c.id||i.customer_name===c.name).length>1).length}</div></div>
        </div>

        <div className="card fu" style={{animationDelay:'.07s'}}>
          <div className="card-body-sm">
            <div className="search-wrap"><Search size={14}/><input className="search-inp" placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          </div>
          {filtered.length===0
            ? <div className="empty"><div className="empty-ico">👥</div><div className="empty-txt">{(customers||[]).length===0?'No clients yet — tap + to add':'No results'}</div></div>
            : filtered.map((c,i) => {
              const ci = (invoices||[]).filter(inv=>inv.customer_id===c.id||inv.customer_name===c.name);
              const ts = ci.reduce((s,inv)=>s+(inv.total||0),0);
              return (
                <div key={c.id} className="list-row clickable" style={{gap:12}} onClick={()=>setModal(c)}>
                  <div className="avatar" style={{background:'var(--teal-l)',color:'var(--teal)',width:38,height:38,fontSize:15,flexShrink:0}}>
                    {(c.name||'?')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                    <div style={{fontSize:12,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{[c.phone,c.email].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--fn)',fontWeight:700,color:'var(--coral)',fontSize:13}}>LKR {fmt(ts)}</div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>{ci.length} invoice{ci.length!==1?'s':''}</div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>setModal(c)}><Edit size={13}/></button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={()=>del(c.id)}><Trash2 size={13}/></button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button className="fab" onClick={()=>setModal('new')} title="New Client">
        <span style={{fontSize:24,lineHeight:1}}>+</span>
      </button>

      {modal && (
        <CustomerModal
          customer={modal==='new'?null:modal}
          invoices={invoices}
          onSave={handleSave}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}
