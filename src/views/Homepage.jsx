import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, LayoutTemplate, Plus, Trash2, X } from 'lucide-react';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Skeleton, useEscape, useLoad, useToast } from '../ui.jsx';

const THEMES = [
  ['default', 'Brand (default)'], ['christmas', 'Christmas'], ['blackfriday', 'Black Friday'],
  ['valentine', "Valentine's"], ['easter', 'Easter'], ['custom', 'Custom colours'],
];
const themeLabel = t => THEMES.find(([id]) => id === t)?.[1] || t;
const blank = { title: '', subtitle: '', badge: '', theme: 'default', bgColor: '#52148b', textColor: '#ffffff', image: '', ctaLabel: '', ctaLink: 'shop', startDate: '', endDate: '', active: true };
const toForm = b => (!b ? blank : {
  title: b.title, subtitle: b.subtitle || '', badge: b.badge || '', theme: b.theme || 'default',
  bgColor: b.bgColor || '#52148b', textColor: b.textColor || '#ffffff', image: b.image || '',
  ctaLabel: b.ctaLabel || '', ctaLink: b.ctaLink || '', startDate: b.startDate ? b.startDate.slice(0, 10) : '', endDate: b.endDate ? b.endDate.slice(0, 10) : '', active: b.active !== false,
});
const okUrl = u => !u || /^(https?:\/\/|\/)/i.test(u);

function status(b) {
  const now = new Date();
  if (!b.active) return { label: 'Off', tone: 'grey' };
  if (b.startDate && new Date(b.startDate) > now) return { label: 'Scheduled', tone: 'purple' };
  if (b.endDate && new Date(b.endDate) < now) return { label: 'Ended', tone: 'grey' };
  return { label: 'Live now', tone: 'purple' };
}

export default function Homepage({ api }) {
  const toast = useToast();
  const list = useLoad(() => api('/admin/home-banners'), [api]);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const all = (list.data || []).slice().sort((a, b) => (a.order - b.order) || (new Date(a.createdAt) - new Date(b.createdAt)));
  const addButton = <button className="primary" onClick={() => setEditing(null)}><Plus size={18} /> Add section</button>;

  async function remove() {
    setBusy(true);
    try { await api(`/admin/home-banners/${deleting._id}`, { method: 'DELETE' }); toast(`"${deleting.title}" deleted`); setDeleting(null); await list.reload(); }
    catch (e) { toast(e.message, 'error'); setDeleting(null); }
    setBusy(false);
  }

  async function move(banner, dir) {
    const idx = all.findIndex(b => b._id === banner._id);
    const swapWith = all[idx + dir];
    if (!swapWith) return;
    try {
      await Promise.all([
        api(`/admin/home-banners/${banner._id}/order`, { method: 'PATCH', body: { order: swapWith.order } }),
        api(`/admin/home-banners/${swapWith._id}/order`, { method: 'PATCH', body: { order: banner.order } }),
      ]);
      await list.reload();
    } catch (e) { toast(e.message, 'error'); }
  }

  if (list.loading && !list.data) return <section className="panel"><Skeleton rows={5} /></section>;
  if (list.error && !list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload} /></section>;

  return <section className="panel">
    {!all.length ? <EmptyState icon={LayoutTemplate} title="No homepage sections yet" hint="Add a banner for a sale, holiday or announcement — it will appear on your shop's home page." action={addButton} /> : <>
      <div className="toolbar row-between"><p className="hint" style={{ margin: 0 }}>Sections appear on the home page in this order, and only while they're active and within their dates.</p>{addButton}</div>
      {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
      <div className="productTable">{all.map((b, i) => { const s = status(b); return <div className="row" key={b._id}>
        <div className="couponIcon"><LayoutTemplate size={20} /></div>
        <div><b>{b.title}</b><small>{themeLabel(b.theme)}{b.badge ? ` · "${b.badge}"` : ''}{b.startDate || b.endDate ? ` · ${b.startDate ? new Date(b.startDate).toLocaleDateString() : 'now'} – ${b.endDate ? new Date(b.endDate).toLocaleDateString() : 'ongoing'}` : ''}</small></div>
        <span className="reorder-btns"><button onClick={() => move(b, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={15} /></button><button onClick={() => move(b, 1)} disabled={i === all.length - 1} aria-label="Move down"><ArrowDown size={15} /></button></span>
        <Badge tone={s.tone}>{s.label}</Badge>
        <button onClick={() => setEditing(b)} aria-label={`Edit ${b.title}`}><Edit3 size={16} /></button>
        <button onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`}><Trash2 size={16} /></button>
      </div>; })}</div>
    </>}
    {editing !== undefined && <BannerForm banner={editing} api={api} onClose={() => setEditing(undefined)} onSaved={async () => { toast(editing ? 'Section saved' : 'Section created'); setEditing(undefined); await list.reload(); }} />}
    {deleting && <ConfirmDialog title="Delete this section?" danger confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)}>
      <p><b>{deleting.title}</b> will be removed from the home page.</p>
    </ConfirmDialog>}
  </section>;
}

function BannerForm({ banner, api, onClose, onSaved }) {
  useEscape(onClose);
  const [f, setF] = useState(() => toForm(banner));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  function validate() {
    if (!f.title.trim()) return 'Enter a title.';
    if (!okUrl(f.image.trim())) return 'Image link must start with http:// or https://';
    if (f.startDate && f.endDate && f.startDate > f.endDate) return 'The end date must be after the start date.';
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    const problem = validate(); if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    const body = { ...f, startDate: f.startDate || null, endDate: f.endDate || null };
    try { await api(banner ? `/admin/home-banners/${banner._id}` : '/admin/home-banners', { method: banner ? 'PUT' : 'POST', body }); await onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  }

  return <div className="modal" role="dialog" aria-modal="true" aria-label={banner ? 'Edit section' : 'Add section'}>
    <form onSubmit={submit} noValidate className="product-form">
      <button type="button" className="close" onClick={onClose} aria-label="Close"><X /></button>
      <h2>{banner ? 'Edit' : 'Add'} homepage section</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label className="field">Title<input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Black Friday is here" autoFocus /></label>
      <label className="field">Subtitle<textarea rows={2} value={f.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. Up to 40% off mesh hair, this weekend only" /></label>
      <div className="two">
        <label className="field">Badge text (optional)<input value={f.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. BLACK FRIDAY" /></label>
        <label className="field">Theme<select value={f.theme} onChange={e => set('theme', e.target.value)}>{THEMES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      {f.theme === 'custom' && <div className="two">
        <label className="field">Background colour<input type="color" value={f.bgColor} onChange={e => set('bgColor', e.target.value)} /></label>
        <label className="field">Text colour<input type="color" value={f.textColor} onChange={e => set('textColor', e.target.value)} /></label>
      </div>}
      <label className="field">Image link (optional)<input value={f.image} onChange={e => set('image', e.target.value)} placeholder="https://…" /></label>
      <label className="field">Upload an image
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          try { const fd = new FormData(); fd.append('files', file); const d = await api('/admin/uploads/images', { method: 'POST', body: fd }); set('image', d.urls[0] || f.image); }
          catch (err) { setError(err.message); }
          finally { e.target.value = ''; }
        }} />
      </label>
      {f.image.trim() && okUrl(f.image.trim()) && <img className="preview" src={f.image.trim()} alt="Preview" onError={e => { e.currentTarget.style.display = 'none'; }} onLoad={e => { e.currentTarget.style.display = 'block'; }} />}
      <div className="two">
        <label className="field">Button text (optional)<input value={f.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} placeholder="e.g. Shop the sale" /></label>
        <label className="field">Button link<input value={f.ctaLink} onChange={e => set('ctaLink', e.target.value)} placeholder="shop, or https://…" /></label>
      </div>
      <div className="two">
        <label className="field">Starts (optional)<input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} /></label>
        <label className="field">Ends (optional)<input type="date" value={f.endDate} onChange={e => set('endDate', e.target.value)} /></label>
      </div>
      <div className="checks"><label><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Active</label></div>
      <p className="hint">Leave the dates blank to run indefinitely, or set them so it shows automatically for a holiday and disappears afterwards.</p>
      <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save section'}</button>
    </form>
  </div>;
}
