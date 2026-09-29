import React, { useState } from 'react';
import { ArrowLeft, Edit3, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Chips, ConfirmDialog, EmptyState, ErrorState, Skeleton, money, useEscape, useLoad, useToast } from '../ui.jsx';

const CATEGORIES = ['Mesh Hair', 'Hair Cream', 'Hair Oil', 'Bundles', 'Accessories'];
const LOW = 5;
const isLow = p => p.active && p.stock <= LOW;
const blank = { name: '', category: 'Mesh Hair', price: '', compareAtPrice: '', stock: '0', image: '', images: '', description: '', badge: '', featured: false, active: true,
  autoPriceIncrease: false, priceIncreaseAmount: '', priceIncreaseEveryDays: '30' };
const toForm = p => (!p ? blank : {
  name: p.name, category: p.category, price: String(p.price), compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
  stock: String(p.stock), image: p.image || '', images: (p.images || []).join('\n'), description: p.description || '',
  badge: p.badge || '', featured: !!p.featured, active: p.active !== false,
  autoPriceIncrease: !!p.autoPriceIncrease, priceIncreaseAmount: p.priceIncreaseAmount ? String(p.priceIncreaseAmount) : '', priceIncreaseEveryDays: p.priceIncreaseEveryDays ? String(p.priceIncreaseEveryDays) : '30',
});
const okUrl = u => /^(https?:\/\/|\/)/i.test(u);

function validateForm(f) {
  const price = Number(f.price); const stock = Number(f.stock); const gallery = f.images.split('\n').map(s => s.trim()).filter(Boolean);
  if (!f.name.trim()) return 'Enter a product name.';
  if (f.price === '' || !Number.isFinite(price) || price < 0) return 'Enter a valid price.';
  if (f.compareAtPrice !== '' && !(Number(f.compareAtPrice) > price)) return 'The "was" price must be higher than the price.';
  if (f.stock === '' || !Number.isInteger(stock) || stock < 0) return 'Stock must be a whole number of 0 or more.';
  if ((f.image.trim() && !okUrl(f.image.trim())) || gallery.some(u => !okUrl(u))) return 'Image links must start with http:// or https://';
  return '';
}

function toBody(f) {
  return {
    name: f.name.trim(), category: f.category, price: Number(f.price), compareAtPrice: f.compareAtPrice === '' ? null : Number(f.compareAtPrice),
    stock: Number(f.stock), image: f.image.trim(), images: f.images.split('\n').map(s => s.trim()).filter(Boolean),
    description: f.description.trim(), badge: f.badge.trim(), featured: f.featured, active: f.active, autoPriceIncrease: f.autoPriceIncrease, priceIncreaseAmount: Number(f.priceIncreaseAmount || 0), priceIncreaseEveryDays: Math.max(1, Number(f.priceIncreaseEveryDays || 30)),
  };
}

export default function Products({ api, params }) {
  const toast = useToast();
  const list = useLoad(() => api('/products/all'), [api]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(params?.filter || 'all');
  const [creating, setCreating] = useState(false); // dedicated "Create product" page
  const [editing, setEditing] = useState(undefined); // undefined = closed, object = editing it (modal)
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const all = list.data || [];
  const needle = q.trim().toLowerCase();
  const shown = all.filter(p => (filter === 'all' || (filter === 'low' && isLow(p)) || (filter === 'hidden' && !p.active)) && p.name.toLowerCase().includes(needle));
  const addButton = <button className="primary" onClick={() => setCreating(true)}><Plus size={18} /> Add product</button>;

  async function remove() {
    setBusy(true);
    try { await api(`/products/${deleting._id}`, { method: 'DELETE' }); toast(`"${deleting.name}" deleted`); setDeleting(null); await list.reload(); }
    catch (e) { toast(e.message, 'error'); setDeleting(null); }
    setBusy(false);
  }

  if (creating) return <CreateProductPage api={api} onCancel={() => setCreating(false)} onSaved={async () => { toast('Product created'); setCreating(false); await list.reload(); }} />;

  if (list.loading && !list.data) return <section className="panel"><Skeleton rows={6} /></section>;
  if (list.error && !list.data) return <section className="panel"><ErrorState message={list.error} onRetry={list.reload} /></section>;

  return <section className="panel">
    {!all.length ? <EmptyState icon={Package} title="No products yet" hint="Add your first product to start selling on your shop." action={addButton} /> : <>
      <div className="toolbar row-between">
        <div className="search"><Search size={16} /><input placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" /></div>
        <Chips value={filter} onChange={setFilter} options={[['all', 'All', all.length], ['low', 'Low stock', all.filter(isLow).length], ['hidden', 'Hidden', all.filter(p => !p.active).length]]} />
        {addButton}
      </div>
      {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={list.reload}>Retry</button></div>}
      {!shown.length ? <EmptyState icon={Search} title="No matching products" hint="Try a different search or filter." action={<button className="ghost" onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</button>} />
        : <div className="productTable">{shown.map(p => <div className="row" key={p._id}>
            <img src={p.image || '/placeholder.webp'} alt="" width="50" height="50" loading="lazy" />
            <div><b>{p.name}</b><small>{p.category}{!p.active && <Badge tone="grey">Hidden</Badge>}{p.featured && <Badge tone="purple">Featured</Badge>}</small></div>
            <span>{money(p.price)}</span>
            <span className={p.stock <= 0 ? 'stock out' : p.stock <= LOW ? 'stock low' : 'stock'}>{p.stock <= 0 ? 'Out of stock' : `${p.stock} in stock`}</span>
            <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Edit3 size={16} /></button>
            <button onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
          </div>)}</div>}
    </>}
    {editing !== undefined && <ProductForm product={editing} api={api} onClose={() => setEditing(undefined)} onSaved={async () => { toast('Product saved'); setEditing(undefined); await list.reload(); }} />}
    {deleting && <ConfirmDialog title="Delete this product?" danger confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)}>
      <p><b>{deleting.name}</b> will be removed from your shop for good.</p>
      <p className="hint">Tip: to take it off the shop but keep it, edit it and untick “Active” instead.</p>
    </ConfirmDialog>}
  </section>;
}

// Shared fields for both the "Create product" page and the "Edit product" modal.
function ProductFields({ f, set, api, setError }) {
  return <>
    <label className="field">Name<input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Product name" autoFocus /></label>
    <div className="two">
      <label className="field">Category<select value={f.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="field">Badge (optional)<input value={f.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. New" /></label>
    </div>
    <div className="three">
      <label className="field">Price (GH₵)<input type="number" step="0.01" min="0" value={f.price} onChange={e => set('price', e.target.value)} /></label>
      <label className="field">Was price<input type="number" step="0.01" min="0" value={f.compareAtPrice} onChange={e => set('compareAtPrice', e.target.value)} placeholder="optional" /></label>
      <label className="field">Stock<input type="number" step="1" min="0" value={f.stock} onChange={e => set('stock', e.target.value)} /></label>
    </div>
    <label className="field">Main image link<input value={f.image} onChange={e => set('image', e.target.value)} placeholder="https://…" /></label>
    <label className="field">Upload images from device
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={async e => {
        const files = e.target.files;
        if (!files?.length) return;
        try {
          const d = await api('/admin/uploads/images', { method: 'POST', body: (() => { const fd = new FormData(); [...files].forEach(file => fd.append('files', file)); return fd; })() });
          set('image', d.urls[0] || f.image);
          set('images', [...(f.images ? f.images.split('\\n').filter(Boolean) : []), ...d.urls].join('\\n'));
        } catch (err) { setError(err.message); }
        finally { e.target.value = ''; }
      }} />
      <small className="hint">JPG, PNG, WEBP or GIF • up to 10 images • 10MB each</small>
    </label>
    {f.image.trim() && okUrl(f.image.trim()) && <img className="preview" src={f.image.trim()} alt="Preview" onError={e => { e.currentTarget.style.display = 'none'; }} onLoad={e => { e.currentTarget.style.display = 'block'; }} />}
    <label className="field">More images (one link per line)<textarea rows={3} value={f.images} onChange={e => set('images', e.target.value)} placeholder="https://…" /></label>
    <label className="field">Description<textarea rows={4} value={f.description} onChange={e => set('description', e.target.value)} /></label>
    <div className="two">
      <label className="field">Automatic price increase (GH₵)
        <input type="number" min="0" step="0.01" value={f.priceIncreaseAmount} onChange={e => set('priceIncreaseAmount', e.target.value)} placeholder="e.g. 1, 2, 3, 4 or 5" />
      </label>
      <label className="field">Increase every (days)
        <input type="number" min="1" step="1" value={f.priceIncreaseEveryDays} onChange={e => set('priceIncreaseEveryDays', e.target.value)} />
      </label>
    </div>
    <div className="checks">
      <label><input type="checkbox" checked={f.autoPriceIncrease} onChange={e => set('autoPriceIncrease', e.target.checked)} /> Automatically increase the price when the interval is due</label>
      <label><input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} /> Featured on the home page</label>
      <label><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Active (visible in the shop)</label>
    </div>
  </>;
}

// Edit flow stays a modal, same as before.
function ProductForm({ product, api, onClose, onSaved }) {
  useEscape(onClose);
  const [f, setF] = useState(() => toForm(product));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const problem = validateForm(f); if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    try { await api(product ? `/products/${product._id}` : '/products', { method: product ? 'PUT' : 'POST', body: toBody(f) }); await onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  }

  return <div className="modal" role="dialog" aria-modal="true" aria-label={product ? 'Edit product' : 'Add product'}>
    <form onSubmit={submit} noValidate className="product-form">
      <button type="button" className="close" onClick={onClose} aria-label="Close"><X /></button>
      <h2>{product ? 'Edit' : 'Add'} product</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <ProductFields f={f} set={set} api={api} setError={setError} />
      <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
    </form>
  </div>;
}

// Create flow: a dedicated full page (not a modal), reached from the "Add product" button.
function CreateProductPage({ api, onCancel, onSaved }) {
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const problem = validateForm(f); if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    try { await api('/products', { method: 'POST', body: toBody(f) }); await onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  }

  return <section className="panel create-product-page">
    <div className="toolbar row-between">
      <button className="ghost" type="button" onClick={onCancel}><ArrowLeft size={16} /> Back to products</button>
    </div>
    <form onSubmit={submit} noValidate className="product-form page-form">
      <h2>Create product</h2>
      <p className="hint">Add a new item to your shop. It will be visible on the shopfront once saved (unless you untick “Active”).</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <ProductFields f={f} set={set} api={api} setError={setError} />
      <div className="dialog-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create product'}</button>
      </div>
    </form>
  </section>;
}
