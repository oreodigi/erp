import React,{useEffect,useState} from 'react';
import {loginERP,restoreERP,fetchERPDashboard,logoutERP,type ERPUser,type ERPDashboard} from '../lib/api';
import {LOGO} from '../assets';
import FullLiveDashboard from './full-live-dashboard';
import {PrototypeERP} from '../App.prototype';
import {useUI,setAuthenticatedPrincipal} from '../store/store';
export default function SecurePortal(){
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');
 const [user,setUser]=useState<ERPUser|null>(null);
 const [dashboard,setDashboard]=useState<ERPDashboard|null>(null);
 const setUI=useUI(s=>s.set);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{const onLogout=()=>{setUser(null);setDashboard(null);setUI({signedIn:false});};window.addEventListener('skt-erp-logout',onLogout);return()=>window.removeEventListener('skt-erp-logout',onLogout)},[setUI]);
 useEffect(()=>{let live=true;restoreERP().then(async u=>{if(!u)return;setAuthenticatedPrincipal({username:u.username,role:u.role});const data=await fetchERPDashboard();if(live){setUI({signedIn:true,route:'dashboard',simple:false});setUser(u);setDashboard(data);}}).catch(()=>{if(live){setAuthenticatedPrincipal(null);logoutERP();}});return()=>{live=false}},[setUI]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');
  try{const u=await loginERP(username,password);setAuthenticatedPrincipal({username:u.username,role:u.role});const data=await fetchERPDashboard();setUI({signedIn:true,route:'dashboard',simple:false});setUser(u);setDashboard(data);setPassword('');}
  catch(e){await logoutERP();setError(e instanceof Error?e.message:'Authentication failed');}finally{setBusy(false);}
 }
 if(user)return <PrototypeERP/>;
 return <div className="min-h-screen bg-bg p-5 sm:p-10">
  <div className="max-w-5xl mx-auto">
   <div className="flex items-center justify-between gap-4 mb-8"><img src={LOGO} alt="SK Translines" className="h-12 object-contain"/>{user&&<button className="btn-ghost" onClick={async()=>{await logoutERP();setUser(null);setDashboard(null);}}>Sign out</button>}</div>
   {!user?<form onSubmit={submit} className="card p-6 max-w-md mx-auto space-y-4">
    <h1 className="text-2xl font-semibold">SK Translines ERP</h1>
    <p className="text-muted text-sm">Secure PostgreSQL portal. Sign in with your assigned ERP credentials.</p>
    <label className="block text-sm">Username<input className="w-full border rounded-lg p-3 mt-1 bg-bg" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required/></label>
    <label className="block text-sm">Password<input className="w-full border rounded-lg p-3 mt-1 bg-bg" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
    {error&&<p role="alert" className="text-bad text-sm">{error}</p>}
    <button disabled={busy} className="btn-primary w-full p-3" type="submit">{busy?'Signing in…':'Sign in'}</button>
   </form>:<div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Dashboard overview</h1><p className="text-muted">Signed in as {user.username} · {user.role} · Historical database snapshot: {dashboard?.historicalAsOf}</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{dashboard&&Object.entries(dashboard.counts).map(([label,value])=><div key={label} className="card p-4"><div className="text-muted text-sm capitalize">{label.replace(/_/g,' ')}</div><div className="text-2xl font-semibold">{Number(value).toLocaleString('en-IN')}</div></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-4">{(['recentLrs','recentBills'] as const).map(key=><section key={key} className="card p-4 overflow-auto"><h2 className="font-semibold mb-3">{key==='recentLrs'?'Recent LRs':'Recent bills'}</h2><table className="text-xs w-full"><thead><tr>{Object.keys((dashboard?.[key]?.[0]||{}) as object).map(k=><th key={k} className="text-left p-2">{k.replace(/_/g,' ')}</th>)}</tr></thead><tbody>{dashboard?.[key]?.map((item,i)=><tr key={i} className="border-t">{Object.values(item as object).map((v,j)=><td key={j} className="p-2">{String(v??'')}</td>)}</tr>)}</tbody></table></section>)}</div>
    <p className="text-muted text-sm">Read-only verified database overview. Full ERP workflows remain under migration and are not yet production-ready.</p>
   </div>}
  </div>
 </div>;
}
