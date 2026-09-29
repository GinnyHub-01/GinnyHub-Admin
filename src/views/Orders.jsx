import React, { useState } from 'react';
import { Download, Search, ShoppingBag, X } from 'lucide-react';
import { Badge, Chips, ConfirmDialog, cap, downloadCsv, EmptyState, ErrorState, Skeleton, fmtDate, money, orderNo, useEscape, useLoad, useToast } from '../ui.jsx';

export const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
export const STATUS_TONE = { pending: 'amber', confirmed: 'blue', processing: 'blue', shipped: 'purple', delivered: 'green', cancelled: 'red' };

export default function Orders({ api, params }) {
  const toast = useToast();
  const list = useLoad(() => api('/orders'), [api]);
  const [status, setStatus] = useState(params?.status || 'all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(params?.open || null);

  const all = list.data || [];
  const counts = Object.fromEntries(STATUSES.map(s => [s, all.filter(o => o.status === s).length]));
  const needle = q.trim().toLowerCase();
  const shown = all.filter(o => (status === 'all' || o.status === status) && (!needle
    || orderNo(o).toLowerCase().includes(needle) || String(o._id).toLowerCase().includes(needle.replace('#', ''))
    || (o.customer?.name || '').toLowerCase().includes(needle) || (o.customer?.phone || '').includes(needle)));
  const selected = openId ? all.find(o => o._id === openId) : null;

  async function changeStatus(order, next) {
    try {
      await api(`/orders/${order._id}/status`, { method: 'PATCH', body: { status: next } });
      toast(`${orderNo(order)} marked as ${next}`);
    } catch (e) { toast(e.message, 'error'); }
    await list.reload();
  }

  function exportCsv() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order', 'Date', 'Customer', 'Phone', 'Email', 'Status', 'Payment', 'Subtotal', 'Discount', 'Coupon', 'Delivery', 'Total', 'Address'],
      shown.map(o => [orderNo(o), fmtDate(o.createdAt), o.customer?.name, o.customer?.phone, o.customer?.email, o.status, o.paymentMethod, o.subtotal, o.discount || 0, o.couponCode || '', o.deliveryFee || 0, o.total, o.deliveryAddress]));
  }

  if (list.loading && !list.data) return <section className="panel"><Skeleton rows={6} /></section>;
  if (list.error && !list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload} /></section>;

  return <section className="panel">
    {!all.length ? <EmptyState icon={ShoppingBag} title="No orders yet" hint="When customers check out on your shop, their orders will appear here." /> : <>
      <div className="toolbar row-between">
        <div className="search"><Search size={16} /><input placeholder="Search name, phone or order number" value={q} onChange={e => setQ(e.target.value)} aria-label="Search orders" /></div>
        <Chips value={status} onChange={setStatus} options={[['all', 'All', all.length], ...STATUSES.map(s => [s, cap(s), counts[s]])]} />
        <button className="ghost" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </div>
      {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
      {!shown.length ? <EmptyState icon={Search} title="No orders match" hint="Try a different status or search." action={<button className="ghost" onClick={() => { setQ(''); setStatus('all'); }}>Clear filters</button>} />
        : <div className="orders">{shown.map(o => <button key={o._id} className="orderRow" onClick={() => setOpenId(o._id)}>
            <div><b>{orderNo(o)}</b><small>{o.customer?.name} • {o.customer?.phone}</small></div>
            <span className="muted">{fmtDate(o.createdAt)}</span><strong>{money(o.total)}</strong><Badge tone={STATUS_TONE[o.status]}>{cap(o.status)}</Badge>
          </button>)}</div>}
    </>}
    {selected && <OrderDrawer order={selected} onClose={() => setOpenId(null)} onStatus={changeStatus} />}
  </section>;
}

function OrderDrawer({ order, onClose, onStatus }) {
  useEscape(onClose);
  const [pending, setPending] = useState(null); // status awaiting confirmation
  const [busy, setBusy] = useState(false);
  const locked = order.status === 'cancelled';
  const choose = next => { if (next !== order.status) (next === 'cancelled' ? setPending(next) : onStatus(order, next)); };
  const confirm = async () => { setBusy(true); await onStatus(order, pending); setBusy(false); setPending(null); };

  return <div className="drawer-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="drawer" role="dialog" aria-modal="true" aria-label={`Order ${orderNo(order)}`}>
      <button className="close" onClick={onClose} aria-label="Close"><X /></button>
      <h2>{orderNo(order)}</h2>
      <p className="muted">Placed {fmtDate(order.createdAt)}</p>

      <label className="field">Status
        <select value={order.status} onChange={e => choose(e.target.value)} disabled={locked}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      {locked && <p className="hint">Cancelled orders can't be changed. Their items were returned to stock.</p>}

      <h3>Customer</h3>
      <dl className="kv">
        <dt>Name</dt><dd>{order.customer?.name || '—'}</dd>
        <dt>Phone</dt><dd>{order.customer?.phone ? <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : '—'}</dd>
        {order.customer?.email && <><dt>Email</dt><dd>{order.customer.email}</dd></>}
        <dt>Address</dt><dd>{order.deliveryAddress || '—'}</dd>
        <dt>Payment</dt><dd>{order.paymentMethod}</dd>
        {order.notes && <><dt>Notes</dt><dd>{order.notes}</dd></>}
      </dl>

      <h3>Items</h3>
      <ul className="items">{(order.items || []).map((i, n) => <li key={n}><span>{i.quantity} × {i.name}</span><b>{money(i.price * i.quantity)}</b></li>)}</ul>
      <dl className="kv totals">
        <dt>Subtotal</dt><dd>{money(order.subtotal)}</dd>
        {order.discount > 0 && <><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{money(order.discount)}</dd></>}
        <dt>Delivery</dt><dd>{order.deliveryFee ? money(order.deliveryFee) : 'Free'}</dd>
        <dt>Total</dt><dd><b>{money(order.total)}</b></dd>
      </dl>
    </div>
    {pending && <ConfirmDialog title="Cancel this order?" danger confirmLabel="Cancel order" busy={busy} onConfirm={confirm} onCancel={() => setPending(null)}>
      <p>The items will be returned to stock, and a cancelled order can't be reopened.</p>
    </ConfirmDialog>}
  </div>;
}
