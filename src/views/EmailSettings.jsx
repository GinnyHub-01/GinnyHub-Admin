import React, { useState } from 'react';
import { Mail, Send, ShieldCheck } from 'lucide-react';
import { Badge, ErrorState, Skeleton, useLoad, useToast } from '../ui.jsx';

export default function EmailSettings({ api }) {
  const toast=useToast();
  const status=useLoad(()=>api('/admin/email'),[api]);
  const [to,setTo]=useState('');
  const [busy,setBusy]=useState(false);
  async function test(e){
    e.preventDefault(); setBusy(true);
    try { await api('/admin/email/test',{method:'POST',body:{to}}); toast('Test email sent successfully.'); }
    catch(e){toast(e.message,'error')} finally{setBusy(false)}
  }
  if(status.loading&&!status.data) return <section className="panel"><Skeleton rows={5}/></section>;
  if(status.error&&!status.data) return <section className="panel"><ErrorState message={status.error} onRetry={status.reload}/></section>;
  const d=status.data;
  return <section className="panel email-settings">
    <div className="panel-head"><div><h2>Transactional email</h2><p className="muted">Cloudflare Email Service is kept server-side. The SMTP token is never returned to the admin browser.</p></div><Badge tone={d.configured?'green':'amber'}>{d.configured?'Configured':'Token missing'}</Badge></div>
    <div className="email-config-grid">
      <div><span>Provider</span><b>Cloudflare Email Service SMTP</b></div>
      <div><span>Host</span><b>{d.host}:{d.port}</b></div>
      <div><span>Username</span><b>{d.username}</b></div>
      <div><span>From</span><b>{d.from}</b></div>
      <div><span>Logo URL</span><b>{d.logoUrl||'Not configured — add EMAIL_LOGO_URL in backend .env'}</b></div>
    </div>
    <div className="email-test-card">
      <ShieldCheck size={22}/><div><h3>Send a test email</h3><p>Use this to verify Cloudflare SMTP and the sender configuration.</p><form onSubmit={test}><input type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="your@email.com" required/><button className="primary" disabled={busy}><Send size={15}/>{busy?'Sending…':'Send test'}</button></form></div>
    </div>
  </section>;
}
