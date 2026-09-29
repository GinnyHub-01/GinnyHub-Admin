import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Badge, cap, EmptyState, ErrorState, Skeleton, fmtDate, money, orderNo, useLoad } from '../ui.jsx';
import { STATUS_TONE } from './Orders.jsx';

function Stat({ title, value, hint, onClick }) {
  return <div className="stat"><span>{title}</span><b>{value}</b>{hint && (onClick ? <button className="stat-hint link" onClick={onClick}>{hint}</button> : <small className="stat-hint">{hint}</small>)}</div>;
}

export default function Dashboard({ api, goto }) {
  const stats = useLoad(() => api('/dashboard/stats'), [api]);
  const recent = useLoad(() => api('/orders?limit=6'), [api]);
  const s = stats.data;

  return <>
    {stats.error && !s ? <section className="panel"><ErrorState message={stats.error} onRetry={stats.reload} /></section> : <div className="stats">
      <Stat title="Revenue" value={s ? money(s.revenue) : '…'} hint="Excludes cancelled orders" />
      <Stat title="Orders" value={s ? s.orders : '…'} hint={s?.pending ? `${s.pending} pending` : undefined} onClick={s?.pending ? () => goto('orders', { status: 'pending' }) : undefined} />
      <Stat title="Products" value={s ? s.products : '…'} hint={s?.lowStock ? `${s.lowStock} low on stock` : undefined} onClick={s?.lowStock ? () => goto('products', { filter: 'low' }) : undefined} />
      <Stat title="Customers" value={s ? s.customers : '…'} />
    </div>}

    <section className="panel">
      <div className="panel-head"><h2>Recent orders</h2>{recent.data?.length > 0 && <button className="link" onClick={() => goto('orders')}>View all</button>}</div>
      {recent.loading && !recent.data ? <Skeleton rows={4} />
        : recent.error && !recent.data ? <ErrorState message={recent.error} onRetry={recent.reload} />
        : !recent.data.length ? <EmptyState icon={ShoppingBag} title="No orders yet" hint="When customers check out on your shop, their orders will appear here." />
        : <div className="orders">{recent.data.map(o => <button key={o._id} className="orderRow" onClick={() => goto('orders', { open: o._id })}>
            <div><b>{orderNo(o)}</b><small>{o.customer?.name} • {o.customer?.phone}</small></div>
            <span className="muted">{fmtDate(o.createdAt)}</span><strong>{money(o.total)}</strong><Badge tone={STATUS_TONE[o.status]}>{cap(o.status)}</Badge>
          </button>)}</div>}
    </section>
  </>;
}
