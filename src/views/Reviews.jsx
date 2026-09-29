import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, fmtDate, useLoad, useToast } from '../ui.jsx';

export default function Reviews({ api }) {
  const toast=useToast();
  const list=useLoad(()=>api('/reviews/admin'),[api]);
  async function toggle(r){
    try { await api(`/reviews/admin/${r._id}`,{method:'PATCH',body:{visible:!r.visible}}); toast(r.visible?'Review hidden':'Review published'); await list.reload(); }
    catch(e){toast(e.message,'error')}
  }
  if(list.loading&&!list.data) return <section className="panel"><Skeleton rows={6}/></section>;
  if(list.error&&!list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload}/></section>;
  const items=list.data||[];
  return <section className="panel">
    <div className="panel-head"><div><h2>Customer reviews</h2><p className="muted">Only verified purchases can publish reviews.</p></div></div>
    {!items.length?<EmptyState icon={MessageSquare} title="No reviews yet" hint="Verified customer reviews will appear here after delivered orders."/>:
      <div className="review-admin-list">{items.map(r=><article className="review-admin-card" key={r._id}>
        <div className="review-admin-top"><div><b>{r.productId?.name||'Product'}</b><small>{r.userId?.name||'Customer'} · {r.userId?.email||''}</small></div><Badge tone={r.visible?'green':'grey'}>{r.visible?'Published':'Hidden'}</Badge></div>
        <div className="review-admin-rating">{[1,2,3,4,5].map(i=><Star key={i} size={15} fill={i<=r.rating?'currentColor':'none'}/>)}</div>
        <p>{r.comment}</p><small className="muted">{fmtDate(r.createdAt)}</small>
        <button className="ghost" onClick={()=>toggle(r)}>{r.visible?'Hide review':'Publish review'}</button>
      </article>)}</div>}
  </section>;
}
