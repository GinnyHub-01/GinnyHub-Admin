import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, History, LayoutDashboard, LayoutTemplate, LogOut, Mail, Menu, Package, ScrollText, ShoppingBag, Star, Tag, Users, X } from 'lucide-react';
import { createApi } from './api.js';
import { ToastProvider } from './ui.jsx';
import Dashboard from './views/Dashboard.jsx';
import Products from './views/Products.jsx';
import Orders from './views/Orders.jsx';
import Customers from './views/Customers.jsx';
import Coupons from './views/Coupons.jsx';
import Homepage from './views/Homepage.jsx';
import Activity from './views/Activity.jsx';
import SystemLogs from './views/SystemLogs.jsx';
import Reviews from './views/Reviews.jsx';
import EmailSettings from './views/EmailSettings.jsx';
import Notifications from './views/Notifications.jsx';
import './styles.css';

const TOKEN_KEY = 'gh-admin-token';
const TABS = [
  ['dashboard', LayoutDashboard, 'Dashboard', 'Manage your Ginnys Hub store.'],
  ['products', Package, 'Products', 'Add, edit and hide what is in your shop.'],
  ['homepage', LayoutTemplate, 'Homepage', 'Add seasonal banners and sections.'],
  ['orders', ShoppingBag, 'Orders', 'Track and update customer orders.'],
  ['customers', Users, 'Customers', 'View customer profiles and their orders.'],
  ['coupons', Tag, 'Coupons', 'Create and manage discount codes.'],
  ['activity', History, 'Activity', 'Who changed what, and when.'],
  ['system', ScrollText, 'System', 'Errors, warnings and server events.'],
  ['reviews', Star, 'Reviews', 'Moderate customer ratings and comments.'],
  ['email', Mail, 'Email', 'Check transactional email configuration.'],
  ['notifications', Bell, 'Notifications', 'New orders and store alerts.'],
];

function Login({ onLogin, expired }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const d = await createApi(null)('/auth/login', { method: 'POST', body: form });
      if (d.user?.role !== 'admin') throw new Error('This account is not an admin.');
      onLogin(d.token);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return <div className="login"><form onSubmit={submit}>
    <img className="brandLogo loginLogo" src="/ginnys-logo.webp" alt="Ginnys Hub" width="300" height="151" />
    <p>Admin Portal</p>
    {expired && !error && <div className="form-error info" role="status">Your session expired. Please sign in again.</div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    <input placeholder="Email" type="email" autoComplete="username" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
    <input placeholder="Password" type="password" autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
    <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <small>Use the bootstrap admin credentials configured in backend .env</small>
  </form></div>;
}

function Shell({ api, logout }) {
  const [view, setView] = useState({ tab: 'dashboard', params: {} });
  const [navOpen, setNavOpen] = useState(false);
  const goto = useCallback((tab, params = {}) => { setView({ tab, params, n: Date.now() }); setNavOpen(false); }, []);
  const [, , title, subtitle] = TABS.find(t => t[0] === view.tab);
  const props = { api, goto, params: view.params };

  return <div className={`app ${navOpen ? 'nav-open' : ''}`}>
    {navOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <aside>
      <img className="brandLogo sidebarLogo" src="/ginnys-logo.webp" alt="Ginnys Hub" width="185" height="93" />
      <small>ADMIN</small>
      {TABS.map(([id, Icon, label]) => <button key={id} className={view.tab === id ? 'active' : ''} aria-current={view.tab === id ? 'page' : undefined} onClick={() => goto(id)}><Icon size={18} />{label}</button>)}
      <button className="logout" onClick={logout}><LogOut size={18} />Log out</button>
    </aside>
    <main>
      <header><div className="header-title"><button className="mobile-menu" aria-label={navOpen ? 'Close menu' : 'Open menu'} onClick={() => setNavOpen(v => !v)}>{navOpen ? <X size={20} /> : <Menu size={20} />}</button><div><h1>{title}</h1><p>{subtitle}</p></div></div></header>
      {/* key: opening a tab from a dashboard link (with params) remounts it so the filter applies */}
      {view.tab === 'dashboard' && <Dashboard key={view.n} {...props} />}
      {view.tab === 'products' && <Products key={view.n} {...props} />}
      {view.tab === 'homepage' && <Homepage key={view.n} {...props} />}
      {view.tab === 'orders' && <Orders key={view.n} {...props} />}
      {view.tab === 'customers' && <Customers key={view.n} {...props} />}
      {view.tab === 'coupons' && <Coupons key={view.n} {...props} />}
      {view.tab === 'activity' && <Activity key={view.n} {...props} />}
      {view.tab === 'system' && <SystemLogs key={view.n} {...props} />}
      {view.tab === 'reviews' && <Reviews key={view.n} {...props} />}
      {view.tab === 'email' && <EmailSettings key={view.n} {...props} />}
      {view.tab === 'notifications' && <Notifications key={view.n} {...props} />}
    </main>
  </div>;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [expired, setExpired] = useState(false);
  const signOut = useCallback((wasExpired = false) => { localStorage.removeItem(TOKEN_KEY); setToken(null); setExpired(wasExpired === true); }, []);
  const api = useMemo(() => createApi(token, () => signOut(true)), [token, signOut]);

  if (!token) return <Login expired={expired} onLogin={t => { localStorage.setItem(TOKEN_KEY, t); setExpired(false); setToken(t); }} />;
  return <ToastProvider><Shell api={api} logout={() => signOut(false)} /></ToastProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
