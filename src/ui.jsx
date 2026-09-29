import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Inbox, RefreshCw, X } from 'lucide-react';

export const money = n => `GH₵ ${Number(n || 0).toFixed(2)}`;
export const fmtDate = d => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const orderNo = o => `#${String(o._id).slice(-6).toUpperCase()}`;

// ---------- data loading: { data, loading, error, reload } ----------
export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const seq = useRef(0);
  const run = useCallback(async () => {
    const id = ++seq.current;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const data = await loader();
      if (id === seq.current) setState({ data, loading: false, error: '' });
    } catch (e) {
      if (id === seq.current) setState(s => ({ ...s, loading: false, error: e.message || 'Something went wrong' }));
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useEscape(handler) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') handler(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}

// ---------- toasts ----------
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems(list => [...list, { id, message, type }]);
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), type === 'error' ? 7000 : 3500);
  }, []);
  return <ToastContext.Provider value={push}>
    {children}
    <div className="toasts" role="status" aria-live="polite">
      {items.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'error' ? <X size={16} /> : <Check size={16} />}<span>{t.message}</span></div>)}
    </div>
  </ToastContext.Provider>;
}

// ---------- states ----------
export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return <div className="empty"><div className="empty-icon"><Icon size={26} /></div><h3>{title}</h3>{hint && <p>{hint}</p>}{action}</div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="empty error" role="alert"><div className="empty-icon"><X size={26} /></div><h3>Could not load this</h3><p>{message}</p>{onRetry && <button className="primary" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}</div>;
}

export function Skeleton({ rows = 5 }) {
  return <div className="skeleton" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="sk-row" />)}</div>;
}

export function Badge({ tone = 'grey', children }) { return <span className={`badge ${tone}`}>{children}</span>; }

export function Pager({ page, pages, total, onPage, noun = 'entries' }) {
  if (!total) return null;
  return <div className="pager"><span>{total} {noun}</span>
    <div><button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
      <span>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div>
  </div>;
}

export function Chips({ options, value, onChange }) {
  return <div className="chips" role="tablist">{options.map(([id, label, count]) =>
    <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'chip active' : 'chip'} onClick={() => onChange(id)}>{label}{count !== undefined && <em>{count}</em>}</button>)}</div>;
}

// ---------- CSV export ----------
const csvCell = v => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  useEscape(onCancel);
  return <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
    <form onSubmit={e => { e.preventDefault(); onConfirm(); }}>
      <h2>{title}</h2><div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={danger ? 'primary danger' : 'primary'} type="submit" disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </form>
  </div>;
}
