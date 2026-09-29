import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { EmptyState, Skeleton, useLoad, useToast, fmtDate } from '../ui.jsx';
export default function Notifications({api}){
 const data=useLoad(()=>api('/notifications?limit=50'),[api]); const toast=useToast();
 async function mark(id){await api(`/notifications/${id}/read`,{method:'PATCH'});data.reload();}
 async function all(){await api('/notifications/read-all',{method:'PATCH'});data.reload();}
 if(data.loading)return <div className="stack"><Skeleton/><Skeleton/><Skeleton/></div>;
 const items=data.data?.items||[];
 return <section className="panel"><div className="panel-head"><div><h2>Notifications</h2><p className="muted">New orders and important store activity.</p></div>{data.data?.unread>0&&<button className="ghost" onClick={all}><CheckCheck size={16}/> Mark all read</button>}</div>{!items.length?<EmptyState icon={Bell} title="No notifications" hint="New orders will appear here automatically."/>:<ul className="notification-list">{items.map(n=><li key={n._id} className={n.readAt?'read':'unread'}><button onClick={()=>mark(n._id)}><span className="notification-icon"><Bell size={17}/></span><span><b>{n.title}</b><small>{n.message}</small><em>{fmtDate(n.createdAt)}</em></span></button></li>)}</ul>}</section>
}
