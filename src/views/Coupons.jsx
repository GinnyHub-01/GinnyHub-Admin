import React, { useState } from 'react';
import { Edit3, Plus, Tag, Trash2, X } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Skeleton, fmtDate, money, useEscape, useLoad, useToast } from '../ui.jsx';

const blank = { code: '', type: 'percent', value: '', minSubtotal: '', usageLimit: '', expiresAt: '', active: true };
const toForm = c => (!c ? blank : {
  code: c.code, type: c.type, value: String(c.value), minSubtotal: c.minSubtotal ? String(c.minSubtotal) : '',
  usageLimit: c.usageLimit ? String(c.usageLimit) : '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', active: c.active !== false,
});
const describe = c => c.type === 'percent' ? `${c.value}% off` : `${money(c.value)} off`;
const isExpired = c => c.expiresAt && new Date(c.expiresAt) < new Date();
const isUsedUp = c => c.usageLimit > 0 && c.usedCount >= c.usageLimit;

export default function Coupons({ api }) {
  const toast = useToast();
  const list = useLoad(() => api('/admin/coupons'), [api]);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const all = list.data || [];
  const addButton = <button className="primary" onClick={() => setEditing(null)}><Plus size={18} /> Add coupon</button>;

  async function remove() {
    setBusy(true);
    try { await api(`/admin/coupons/${deleting._id}`, { method: 'DELETE' }); toast(`"${deleting.code}" deleted`); setDeleting(null); await list.reload(); }
    catch (e) { toast(e.message, 'error'); setDeleting(null); }
    setBusy(false);
  }

  if (list.loading && !list.data) return <section className="panel"><Skeleton rows={5} /></section>;
  if (list.error && !list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload} /></section>;

  return <section className="panel">
    {!all.length ? <EmptyState icon={Tag} title="No coupons yet" hint="Create a discount code for your customers to use at checkout." action={addButton} /> : <>
      <div className="toolbar row-between"><div /> {addButton}</div>
      {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
      <div className="productTable">{all.map(c => <div className="row" key={c._id}>
        <div className="couponIcon"><Tag size={20} /></div>
        <div><b>{c.code}</b><small>{describe(c)}{c.minSubtotal > 0 ? ` · min ${money(c.minSubtotal)}` : ''}{c.expiresAt ? ` · expires ${fmtDate(c.expiresAt)}` : ''}</small></div>
        <span>{c.usageLimit > 0 ? `${c.usedCount}/${c.usageLimit} used` : `${c.usedCount} used`}</span>
        <span className={!c.active || isExpired(c) || isUsedUp(c) ? 'stock out' : 'stock'}>{!c.active ? 'Off' : isExpired(c) ? 'Expired' : isUsedUp(c) ? 'Used up' : 'Active'}</span>
        <button onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Edit3 size={16} /></button>
        <button onClick={() => setDeleting(c)} aria-label={`Delete ${c.code}`}><Trash2 size={16} /></button>
      </div>)}</div>
    </>}
    {editing !== undefined && <CouponForm coupon={editing} api={api} onClose={() => setEditing(undefined)} onSaved={async () => { toast(editing ? 'Coupon saved' : 'Coupon created'); setEditing(undefined); await list.reload(); }} />}
    {deleting && <ConfirmDialog title="Delete this coupon?" danger confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)}>
      <p><b>{deleting.code}</b> will no longer work at checkout.</p>
    </ConfirmDialog>}
  </section>;
}

function CouponForm({ coupon, api, onClose, onSaved }) {
  useEscape(onClose);
  const [f, setF] = useState(() => toForm(coupon));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  function validate() {
    if (!f.code.trim()) return 'Enter a coupon code.';
    const value = Number(f.value);
    if (!Number.isFinite(value) || value <= 0) return 'Enter a valid discount value.';
    if (f.type === 'percent' && value > 100) return 'A percentage discount cannot be more than 100.';
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    const problem = validate(); if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    const body = {
      code: f.code.trim(), type: f.type, value: Number(f.value),
      minSubtotal: f.minSubtotal === '' ? 0 : Number(f.minSubtotal),
      usageLimit: f.usageLimit === '' ? 0 : Number(f.usageLimit),
      expiresAt: f.expiresAt || null, active: f.active,
    };
    try { await api(coupon ? `/admin/coupons/${coupon._id}` : '/admin/coupons', { method: coupon ? 'PUT' : 'POST', body }); await onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  }

  return <div className="modal" role="dialog" aria-modal="true" aria-label={coupon ? 'Edit coupon' : 'Add coupon'}>
    <form onSubmit={submit} noValidate className="product-form">
      <button type="button" className="close" onClick={onClose} aria-label="Close"><X /></button>
      <h2>{coupon ? 'Edit' : 'Add'} coupon</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label className="field">Code<input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" autoFocus /></label>
      <div className="two">
        <label className="field">Type<select value={f.type} onChange={e => set('type', e.target.value)}><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></select></label>
        <label className="field">{f.type === 'percent' ? 'Percent (%)' : 'Amount (GH₵)'}<input type="number" min="0" step="0.01" value={f.value} onChange={e => set('value', e.target.value)} /></label>
      </div>
      <div className="two">
        <label className="field">Minimum bag total<input type="number" min="0" step="0.01" value={f.minSubtotal} onChange={e => set('minSubtotal', e.target.value)} placeholder="optional" /></label>
        <label className="field">Usage limit<input type="number" min="0" step="1" value={f.usageLimit} onChange={e => set('usageLimit', e.target.value)} placeholder="unlimited" /></label>
      </div>
      <label className="field">Expiry date<input type="date" value={f.expiresAt} onChange={e => set('expiresAt', e.target.value)} placeholder="never" /></label>
      <div className="checks"><label><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Active</label></div>
      <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save coupon'}</button>
    </form>
  </div>;
}
