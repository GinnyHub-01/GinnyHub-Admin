import React, { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, ScrollText, Search } from 'lucide-react';
import { Badge, cap, Chips, EmptyState, ErrorState, Pager, Skeleton, fmtDate, useDebounced, useLoad } from '../ui.jsx';

const LEVELS = [['', 'All'], ['error', 'Errors'], ['warn', 'Warnings'], ['info', 'Info']];
const TONE = { error: 'red', warn: 'amber', info: 'blue' };

export default function SystemLogs({ api }) {
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [auto, setAuto] = useState(false);
  const dq = useDebounced(q);
  const filtered = Boolean(level || dq);

  const list = useLoad(() => {
    const qs = new URLSearchParams({ page, limit: 25, ...(level && { level }), ...(dq && { q: dq }) });
    return api(`/admin/logs?${qs}`);
  }, [api, level, dq, page]);
  const { reload } = list;
  useEffect(() => { if (!auto) return undefined; const t = setInterval(reload, 30000); return () => clearInterval(t); }, [auto, reload]);
  const d = list.data;

  return <section className="panel">
    <div className="toolbar row-between">
      <div className="search"><Search size={16} /><input placeholder="Search message, source or request id" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} aria-label="Search logs" /></div>
      <Chips value={level} onChange={v => { setLevel(v); setPage(1); setOpen(null); }} options={LEVELS} />
      <div className="log-tools">
        <label className="check"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh</label>
        <button className="ghost" onClick={reload} disabled={list.loading}><RefreshCw size={15} /> Refresh</button>
      </div>
    </div>

    {list.loading && !d ? <Skeleton rows={6} />
      : list.error && !d ? <ErrorState message={list.error} onRetry={reload} />
      : !d.items.length ? (filtered
          ? <EmptyState icon={Search} title="No log entries match" hint="Try another level or search." action={<button className="ghost" onClick={() => { setLevel(''); setQ(''); setPage(1); }}>Clear filters</button>} />
          : <EmptyState icon={ScrollText} title="No log entries" hint="Errors, warnings and key server events appear here. Old entries are removed automatically." />)
      : <>
        {list.error && <div className="banner">Could not refresh: {list.error} <button className="link" onClick={reload}>Retry</button></div>}
        <ul className={list.loading ? 'logs dim' : 'logs'}>{d.items.map(l => {
          const isOpen = open === l._id;
          return <li key={l._id}>
            <button className="log-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l._id)}>
              <Badge tone={TONE[l.level]}>{cap(l.level)}</Badge>
              <span className="when">{fmtDate(l.createdAt)}</span>
              <span className="src">{l.source}</span>
              <span className="msg">{l.message}</span>
              <ChevronDown size={16} className={isOpen ? 'chev open' : 'chev'} />
            </button>
            {isOpen && <div className="log-body">
              {l.context && <pre>{JSON.stringify(l.context, null, 2)}</pre>}
              {l.stack && <pre className="stack">{l.stack}</pre>}
              {!l.context && !l.stack && <p className="muted">No extra details.</p>}
            </div>}
          </li>;
        })}</ul>
        <Pager page={d.page} pages={d.pages} total={d.total} onPage={p => { setPage(p); setOpen(null); }} />
      </>}
  </section>;
}
