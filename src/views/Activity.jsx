import React, { useState } from 'react';
import { ChevronDown, History, Search } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Pager, Skeleton, fmtDate, money, useDebounced, useLoad } from '../ui.jsx';

const GROUPS = [['', 'All activity'], ['product', 'Products'], ['order', 'Orders'], ['auth', 'Sign-ins']];
const LABELS = {
  'product.create': 'Created product', 'product.update': 'Updated product', 'product.delete': 'Deleted product',
  'order.create': 'New order placed', 'order.status': 'Changed order status', 'auth.login': 'Signed in',
};
const TONES = { product: 'purple', order: 'blue', auth: 'grey' };
const FIELD = { name: 'Name', description: 'Description', category: 'Category', price: 'Price', compareAtPrice: 'Was price', stock: 'Stock', image: 'Image', images: 'More images', badge: 'Badge', featured: 'Featured', active: 'Active', status: 'Status' };
const MONEY = new Set(['price', 'compareAtPrice']);

const show = (field, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (MONEY.has(field)) return money(v);
  const t = String(v); return t.length > 90 ? `${t.slice(0, 90)}…` : t;
};

// Turns an audit entry's `changes` into readable rows.
export function describe(entry) {
  const c = entry.changes || {};
  if (c.created || c.deleted) {
    const snap = c.created || c.deleted;
    return [{ text: `${snap.name} · ${snap.category} · ${money(snap.price)} · stock ${snap.stock}` }];
  }
  if (entry.action === 'order.create') return [{ text: `Total ${money(c.total)} · ${c.items} item${c.items === 1 ? '' : 's'}` }];
  return Object.entries(c).flatMap(([field, v]) => field === 'restocked'
    ? [{ text: 'Items were returned to stock' }]
    : [{ label: FIELD[field] || field, from: show(field, v?.from), to: show(field, v?.to) }]);
}

export default function Activity({ api }) {
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const dq = useDebounced(q);
  const filtered = Boolean(group || dq || from || to);

  const list = useLoad(() => {
    const qs = new URLSearchParams({ page, limit: 25, ...(group && { group }), ...(dq && { q: dq }), ...(from && { from }), ...(to && { to }) });
    return api(`/admin/audit?${qs}`);
  }, [api, group, dq, from, to, page]);
  const reset = setter => v => { setter(v); setPage(1); setOpen(null); };
  const clear = () => { setGroup(''); setQ(''); setFrom(''); setTo(''); setPage(1); };
  const d = list.data;

  return <section className="panel">
    <div className="toolbar filters">
      <div className="search"><Search size={16} /><input placeholder="Search by person, item or request id" value={q} onChange={e => reset(setQ)(e.target.value)} aria-label="Search activity" /></div>
      <select value={group} onChange={e => reset(setGroup)(e.target.value)} aria-label="Type of activity">{GROUPS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <label className="date">From <input type="date" value={from} max={to || undefined} onChange={e => reset(setFrom)(e.target.value)} /></label>
      <label className="date">To <input type="date" value={to} min={from || undefined} onChange={e => reset(setTo)(e.target.value)} /></label>
    </div>

    {list.loading && !d ? <Skeleton rows={6} />
      : list.error && !d ? <ErrorState message={list.error} onRetry={list.reload} />
      : !d.items.length ? (filtered
          ? <EmptyState icon={Search} title="No activity matches your filters" hint="Try a wider date range or a different search." action={<button className="ghost" onClick={clear}>Clear filters</button>} />
          : <EmptyState icon={History} title="No activity yet" hint="Changes to products and orders, and admin sign-ins, are recorded here with who did them and when." />)
      : <>
        {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
        <ul className={list.loading ? 'audit dim' : 'audit'}>{d.items.map(e => {
          const rows = describe(e); const isOpen = open === e._id;
          return <li key={e._id}>
            <button className="audit-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e._id)}>
              <span className="when">{fmtDate(e.createdAt)}</span>
              <span className="what"><Badge tone={TONES[e.action.split('.')[0]] || 'grey'}>{LABELS[e.action] || e.action}</Badge> <b>{e.entity?.label}</b></span>
              <span className="who">{e.actor?.name || e.actor?.email || 'System'}{e.actor?.role === 'customer' && <small> customer</small>}</span>
              <ChevronDown size={16} className={isOpen ? 'chev open' : 'chev'} />
            </button>
            {isOpen && <div className="audit-body">
              {rows.length ? <ul className="diff">{rows.map((r, i) => <li key={i}>{r.text ? r.text : <><span className="field-name">{r.label}</span><del>{r.from}</del><span aria-hidden>→</span><ins>{r.to}</ins></>}</li>)}</ul> : <p className="muted">No field details recorded.</p>}
              <p className="meta">{e.actor?.email && <>By {e.actor.email} · </>}IP {e.ip || 'unknown'} · Request {e.requestId || '—'}</p>
            </div>}
          </li>;
        })}</ul>
        <Pager page={d.page} pages={d.pages} total={d.total} onPage={p => { setPage(p); setOpen(null); }} />
      </>}
  </section>;
}
