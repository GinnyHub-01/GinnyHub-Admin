import React, { useState } from 'react';
import { Download, Search, Users, X } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, cap, downloadCsv, fmtDate, money, orderNo, useEscape, useLoad, useToast } from '../ui.jsx';
import { STATUS_TONE } from './Orders.jsx';

export default function Customers({ api, goto }) {
  const list = useLoad(() => api('/admin/customers'), [api]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);

  const all = list.data || [];
  const needle = q.trim().toLowerCase();
  const shown = all.filter(c => !needle
    || (c.name || '').toLowerCase().includes(needle)
    || (c.email || '').toLowerCase().includes(needle)
    || (c.phone || '').includes(needle));

  function exportCsv() {
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Total spent'],
      shown.map(c => [c.name, c.email, c.phone, fmtDate(c.createdAt), c.orders, c.spent]));
  }

  if (list.loading && !list.data) return <section className="panel"><Skeleton rows={6} /></section>;
  if (list.error && !list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload} /></section>;

  return <section className="panel">
    {!all.length ? <EmptyState icon={Users} title="No customers yet" hint="Anyone who creates an account on your shop will appear here." /> : <>
      <div className="toolbar row-between">
        <div className="search"><Search size={16} /><input placeholder="Search name, email or phone" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" /></div>
        <button className="ghost" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </div>
      {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
      {!shown.length ? <EmptyState icon={Search} title="No matching customers" hint="Try a different search." action={<button className="ghost" onClick={() => setQ('')}>Clear search</button>} />
        : <div className="orders">{shown.map(c => <button key={c._id} className="orderRow" onClick={() => setOpenId(c._id)}>
            <div><b>{c.name}</b><small>{c.email}{c.phone ? ` • ${c.phone}` : ''}</small></div>
            <span className="muted">Joined {fmtDate(c.createdAt)}</span>
            <span>{c.orders} order{c.orders === 1 ? '' : 's'}</span>
            <strong>{money(c.spent)}</strong>
          </button>)}</div>}
    </>}
    {openId && <CustomerDrawer id={openId} api={api} goto={goto} onClose={() => setOpenId(null)} />}
  </section>;
}

function CustomerDrawer({ id, api, goto, onClose }) {
  useEscape(onClose);
  const toast = useToast();
  const detail = useLoad(() => api(`/admin/customers/${id}`), [api, id]);
  const c = detail.data?.customer;
  const orders = detail.data?.orders || [];
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { if (c) { setNotes(c.adminNotes || ''); setSavedNotes(c.adminNotes || ''); } }, [c?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveNotes() {
    setSaving(true);
    try { await api(`/admin/customers/${id}/notes`, { method: 'PATCH', body: { notes } }); setSavedNotes(notes); toast('Notes saved'); }
    catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  }

  return <div className="drawer-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Customer details">
      <button className="close" onClick={onClose} aria-label="Close"><X /></button>
      {detail.loading && !detail.data && <Skeleton rows={5} />}
      {detail.error && !detail.data && <ErrorState message={detail.error} onRetry={detail.reload} />}
      {c && <>
        <h2>{c.name}</h2>
        <p className="muted">Customer since {fmtDate(c.createdAt)}</p>

        <dl className="kv">
          <dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
          <dt>Phone</dt><dd>{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—'}</dd>
        </dl>

        <label className="field">Notes (only visible to admins)
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Prefers WhatsApp, VIP customer…" />
        </label>
        {notes !== savedNotes && <button className="primary" onClick={saveNotes} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</button>}

        <h3>Orders ({orders.length})</h3>
        {!orders.length ? <p className="hint">This customer has not placed an order yet.</p> : <ul className="items">
          {orders.map(o => <li key={o._id}>
            <span><button className="link" onClick={() => goto('orders', { open: o._id })}>{orderNo(o)}</button> · {fmtDate(o.createdAt)}</span>
            <span><Badge tone={STATUS_TONE[o.status]}>{cap(o.status)}</Badge> <b>{money(o.total)}</b></span>
          </li>)}
        </ul>}
      </>}
    </div>
  </div>;
}
