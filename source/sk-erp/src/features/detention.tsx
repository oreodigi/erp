import React, { useMemo, useState } from 'react';
import { useDB, useUI, A, lookup } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Card, EmptyState, Tabs } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer } from '../components/overlays';
import { ymd, inr, fmtDate, cls } from '../lib/util';
import { AlertTriangle, BadgeCheck, Calculator, Clock, Database, FileSpreadsheet, Plus, Settings2 } from 'lucide-react';

const isoDate=(v:any)=>String(v||'').slice(0,10);
const dayDiff=(a:string,b:string)=>a&&b?Math.max(0,Math.round((+new Date(b)-+new Date(a))/864e5)):0;
const first=(xs:string[])=>xs.filter(Boolean).sort()[0]||'';
const last=(xs:string[])=>{const a=xs.filter(Boolean).sort();return a[a.length-1]||'';};

const defaultRules=[
 {id:'det-bipin',name:'Bipin Singh standard',party:'All',broker:'Bipin Kumar Singh',vehicle:'All',freightFrom:0,freightTo:999999,freeFirst:1,freeLast:1,tierDays:2,tierRate:1000,nextRate:1500,mode:'Days',active:true},
 {id:'det-big',name:'Big truck 32/36 HQ & 38 LQ',party:'All',broker:'All',vehicle:'32 HQ / 36 HQ / 38 LQ / 6 Wheeler',freightFrom:9000,freightTo:11000,freeFirst:1,freeLast:1,tierDays:0,tierRate:1500,nextRate:1500,mode:'Days',active:true},
 {id:'det-407',name:'Small truck / 407',party:'All',broker:'All',vehicle:'407',freightFrom:4000,freightTo:8000,freeFirst:1,freeLast:0,tierDays:0,tierRate:1000,nextRate:1000,mode:'24 Hours',active:true},
];

function ensureRules(db:any){return (db.detentionRules?.length?db.detentionRules:defaultRules) as any[];}
function lrDates(dc:any,db:any){
 const ids=[...new Set((dc.items||[]).map((x:any)=>x.lrId))] as string[];
 return ids.map(id=>{const l=db.lrs.find((x:any)=>x.id===id);const report=isoDate(l?.detention?.reportingDate||l?.delivery?.reportingDate||dc.ackClient?.reportingDate||dc.ackSupervisor?.reportingDate);const unload=isoDate(l?.detention?.unloadingDate||l?.ack?.receivedDate||dc.ackClient?.unloadingDate||dc.ackSupervisor?.unloadingDate||dc.ackSupervisor?.deliveryDate||l?.delivery?.date);return {id,lrNo:l?.lrNo||id,report,unload};});
}
function chooseRule(dc:any,db:any,rules:any[]){const broker=lookup.transName(db,dc.transporterId);const cap=String(dc.capacity||lookup.truck(db,dc.truckId)?.capacity||'');return rules.find(r=>r.active&&r.broker===broker)||rules.find(r=>r.active&&r.vehicle!=='All'&&r.vehicle.toLowerCase().includes(cap.toLowerCase())&&Number(dc.freight)>=r.freightFrom&&Number(dc.freight)<=r.freightTo)||rules.find(r=>r.active)||defaultRules[0];}
function calc(dc:any,db:any,rules:any[]){
 const lrs=lrDates(dc,db), ldc=isoDate(dc.loadingDate), dcReport=isoDate(dc.ackClient?.reportingDate||dc.ackSupervisor?.reportingDate), lrReport=first(lrs.map(x=>x.report)), finalReport=first([ldc,dcReport,lrReport]), finalUnload=last(lrs.map(x=>x.unload));
 const days=dayDiff(finalReport,finalUnload), rule=chooseRule(dc,db,rules), chargeable=Math.max(0,days-Number(rule.freeFirst||0)-Number(rule.freeLast||0));
 const tier=Number(rule.tierDays||0), amt=tier?Math.min(chargeable,tier)*Number(rule.tierRate||0)+Math.max(0,chargeable-tier)*Number(rule.nextRate||rule.tierRate||0):chargeable*Number(rule.nextRate||rule.tierRate||0);
 const claim=Number(dc.detention?.claimed??dc.ackClient?.detentionAmt??dc.ackCollection?.detentionAmt??0), approved=Number(dc.detention?.approved??Math.min(claim||amt,amt)), deduction=Math.max(0,claim-approved);
 const missing=[] as string[]; if(!finalReport)missing.push('Reporting date'); if(!finalUnload)missing.push('Unloading date'); if(!dc.transporterId)missing.push('Broker');
 return {lrs,ldc,dcReport,lrReport,finalReport,finalUnload,days,chargeable,rule,amt,claim,approved,deduction,missing};
}

export function DetentionWorkbench(){
 const db:any=useDB(), rules=ensureRules(db), nav=useUI.getState().nav;
 const [sel,setSel]=useState<any>(null), [tab,setTab]=useState('work');
 const rows=useMemo(()=>db.dcs.map((dc:any)=>({dc,...calc(dc,db,rules)})),[db,rules]);
 const pending=rows.filter((r:any)=>!r.dc.detention?.status||!['Approved','Tally Ready','Posted'].includes(r.dc.detention.status));
 const missing=rows.filter((r:any)=>r.missing.length);
 const claimed=rows.reduce((s:number,r:any)=>s+r.claim,0), approved=rows.reduce((s:number,r:any)=>s+Number(r.dc.detention?.approved||0),0);
 const save=(dc:any,c:any,status:string,approvedAmt?:number)=>A.patch('dcs',dc.id,{detention:{...(dc.detention||{}),finalReportingDate:c.finalReport,finalUnloadingDate:c.finalUnload,days:c.days,calculated:c.amt,claimed:c.claim,approved:approvedAmt??c.approved,deduction:Math.max(0,c.claim-(approvedAmt??c.approved)),ruleId:c.rule.id,status,verifiedAt:new Date().toISOString()}});
 return <div><PageHeader eyebrow="Finance · Transporter Payables" title="Detention Management" subtitle="Verify DC/LR reporting and unloading dates, apply broker/vehicle detention slabs, approve claims and hand the approved amount to transporter settlement." />
 <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5"><KPI label="DCs to verify" value={pending.length} icon={Clock}/><KPI label="Missing dates" value={missing.length} icon={AlertTriangle}/><KPI label="Claimed" value={inr(claimed)} icon={FileSpreadsheet}/><KPI label="Approved" value={inr(approved)} icon={BadgeCheck}/><KPI label="Rules active" value={rules.filter((r:any)=>r.active).length} icon={Settings2}/></div>
 <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{key:'work',label:'DC Detention Workbench',count:rows.length},{key:'exceptions',label:'Exceptions',count:missing.length}]} />
 <DataTable id="detention-workbench" rows={(tab==='exceptions'?missing:rows).slice().reverse()} onRow={(r:any)=>setSel(r)} cols={[
 {key:'dc',label:'Challan / LR',render:(r:any)=><div><b className="docno">{r.dc.dcNo}</b><div className="text-[11px] text-muted">{r.lrs.map((x:any)=>x.lrNo).join(', ')||'No LR'}</div></div>,mobile:'title'},
 {key:'truck',label:'Truck / Broker',render:(r:any)=><div>{lookup.truckNo(db,r.dc.truckId)}<div className="text-[11px] text-muted">{lookup.transName(db,r.dc.transporterId)}</div></div>,mobile:'sub'},
 {key:'report',label:'Final reporting',render:(r:any)=>fmtDate(r.finalReport)},{key:'unload',label:'Final unloading',render:(r:any)=>fmtDate(r.finalUnload)},
 {key:'days',label:'Days',align:'right',value:(r:any)=>r.days},{key:'calc',label:'ERP calculated',align:'right',render:(r:any)=>inr(r.amt)},
 {key:'claim',label:'Claimed',align:'right',render:(r:any)=>inr(r.claim)},{key:'status',label:'Status',render:(r:any)=><StatusBadge s={r.missing.length?'Exception':r.dc.detention?.status||'Pending Verification'}/>,mobile:'meta'}]} empty={<EmptyState icon={Calculator} title="No detention records" body="Delivery challans will appear here automatically."/>}/>
 {sel&&<DetentionDrawer row={sel} db={db} rules={rules} onClose={()=>setSel(null)} onSave={(status:string,amt?:number)=>{save(sel.dc,sel,status,amt);setSel(null);}} onPay={()=>{save(sel.dc,sel,'Approved',sel.approved);nav('fin/dc-approval');setSel(null);}}/>}</div>;
}

function DetentionDrawer({row:r,db,rules,onClose,onSave,onPay}:any){
 const [claim,setClaim]=useState(r.claim||r.amt),[approved,setApproved]=useState(r.dc.detention?.approved??Math.min(r.claim||r.amt,r.amt));
 const [ruleId,setRuleId]=useState(r.rule.id); const rule=rules.find((x:any)=>x.id===ruleId)||r.rule;
 const chargeable=Math.max(0,r.days-Number(rule.freeFirst||0)-Number(rule.freeLast||0));const amount=rule.tierDays?Math.min(chargeable,rule.tierDays)*rule.tierRate+Math.max(0,chargeable-rule.tierDays)*rule.nextRate:chargeable*(rule.nextRate||rule.tierRate);
 r={...r,claim:Number(claim),approved:Number(approved),amt:amount,rule};
 return <Drawer open onClose={onClose} title={`Detention · ${r.dc.dcNo}`} subtitle={`${lookup.truckNo(db,r.dc.truckId)} · ${lookup.transName(db,r.dc.transporterId)}`} footer={<><button className="btn-ghost" onClick={()=>onSave('Accounts Verified',approved)}>Save verification</button><button className="btn-primary" disabled={!!r.missing.length} onClick={()=>onPay()}><BadgeCheck size={15}/> Send to DC approval</button></>}>
 <div className="p-4 sm:p-5 grid gap-4">
 {r.missing.length>0&&<div className="rounded-lg bg-warn/10 text-warn px-3 py-2 text-[12.5px]"><b>Exception:</b> Missing {r.missing.join(', ')}. Complete operational dates before approval.</div>}
 <Card title="DC → LR date verification"><div className="grid sm:grid-cols-3 gap-3 text-[12.5px] mb-3"><div><span className="text-muted">LDC / loading date</span><b className="block">{fmtDate(r.ldc)}</b></div><div><span className="text-muted">DC report date</span><b className="block">{fmtDate(r.dcReport)}</b></div><div><span className="text-muted">Earliest LR report</span><b className="block">{fmtDate(r.lrReport)}</b></div></div>
 <div className="overflow-x-auto border border-line rounded-lg"><table className="w-full text-[12px]"><thead className="bg-surface2"><tr><th className="text-left p-2">LR</th><th className="text-left p-2">Reporting</th><th className="text-left p-2">Unloading</th></tr></thead><tbody>{r.lrs.map((l:any)=><tr className="border-t border-line" key={l.id}><td className="p-2 docno">{l.lrNo}</td><td className="p-2">{fmtDate(l.report)}</td><td className="p-2">{fmtDate(l.unload)}</td></tr>)}</tbody></table></div>
 <div className="grid grid-cols-3 gap-2 mt-3"><div className="p-3 bg-surface2 rounded-lg"><span className="text-[11px] text-muted">Final reporting · earliest</span><b className="block">{fmtDate(r.finalReport)}</b></div><div className="p-3 bg-surface2 rounded-lg"><span className="text-[11px] text-muted">Final unloading · latest</span><b className="block">{fmtDate(r.finalUnload)}</b></div><div className="p-3 bg-surface2 rounded-lg"><span className="text-[11px] text-muted">Elapsed</span><b className="block">{r.days} days</b></div></div></Card>
 <Card title="Commercial slab & calculation"><div className="grid sm:grid-cols-2 gap-3"><Field label="Detention rule"><Select value={ruleId} onChange={e=>setRuleId(e.target.value)} options={rules.map((x:any)=>({value:x.id,label:x.name}))}/></Field><div className="self-end pb-2 text-[12px] text-muted">First {rule.freeFirst||0} day free · last {rule.freeLast||0} day free · {chargeable} chargeable day(s)</div></div>
 <div className="mt-3 rounded-lg border border-line p-3 text-[12.5px]">System admissible detention <b className="float-right text-[16px]">{inr(amount)}</b><div className="text-muted mt-1">{rule.tierDays? `First ${Math.min(chargeable,rule.tierDays)} × ₹${rule.tierRate}; balance × ₹${rule.nextRate}`:`${chargeable} × ₹${rule.nextRate||rule.tierRate}`}</div></div></Card>
 <Card title="Claim verification"><div className="grid sm:grid-cols-4 gap-3"><Field label="Freight"><Input type="number" value={r.dc.freight||0} disabled/></Field><Field label="Advance"><Input type="number" value={r.dc.advance||0} disabled/></Field><Field label="Transporter claimed"><Input type="number" value={claim} onChange={e=>setClaim(Number(e.target.value))}/></Field><Field label="Accounts approved"><Input type="number" value={approved} onChange={e=>setApproved(Number(e.target.value))}/></Field></div><div className="mt-3 text-right text-[13px]">Deduction <b className={cls(Number(claim)>Number(approved)&&'text-bad')}>{inr(Math.max(0,Number(claim)-Number(approved)))}</b> · Net freight + approved detention − advance <b>{inr(Number(r.dc.freight||0)+Number(approved)-Number(r.dc.advance||0))}</b></div></Card>
 </div></Drawer>;
}

export function DetentionRules(){
 const db:any=useDB();const rules=ensureRules(db);const [sel,setSel]=useState<any>(null);
 const save=(x:any)=>{if(!db.detentionRules) A.save('detentionRules',x,'Detention rule');else A.save('detentionRules',x,'Detention rule');setSel(null);};
 return <div><PageHeader eyebrow="Masters · Finance" title="Detention Rules" subtitle="Configurable party/broker/vehicle detention slabs used automatically by the DC detention workbench." actions={<button className="btn-primary" onClick={()=>setSel({id:'',name:'New detention rule',party:'All',broker:'All',vehicle:'All',freightFrom:0,freightTo:999999,freeFirst:1,freeLast:1,tierDays:0,tierRate:1500,nextRate:1500,mode:'Days',active:true})}><Plus size={15}/> New rule</button>}/>
 <DataTable id="detention-rules" rows={rules} onRow={setSel} cols={[{key:'name',label:'Rule',mobile:'title'},{key:'broker',label:'Broker',filter:true},{key:'vehicle',label:'Vehicle',filter:true},{key:'range',label:'Freight range',render:(x:any)=>`${inr(x.freightFrom)} – ${inr(x.freightTo)}`},{key:'free',label:'Free time',render:(x:any)=>x.mode==='24 Hours'?'First 24 hours':`First ${x.freeFirst} / last ${x.freeLast} day`},{key:'rate',label:'Rate',render:(x:any)=>x.tierDays?`₹${x.tierRate} then ₹${x.nextRate}`:`₹${x.nextRate||x.tierRate}/day`},{key:'st',label:'Status',render:(x:any)=><StatusBadge s={x.active?'Active':'Inactive'}/>,mobile:'meta'}]}/>
 {sel&&<RuleDrawer value={sel} onClose={()=>setSel(null)} onSave={save}/>}</div>;
}
function RuleDrawer({value,onClose,onSave}:any){const [f,setF]=useState({...value});return <Drawer open onClose={onClose} title={f.id?'Edit detention rule':'New detention rule'} footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={()=>onSave(f)}>Save rule</button></>}><div className="p-5 grid sm:grid-cols-2 gap-3">{[['name','Rule name'],['broker','Broker / transporter'],['party','Party / client'],['vehicle','Vehicle type']].map(([k,l])=><Field key={k} label={l}><Input value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})}/></Field>)}{[['freightFrom','Freight from'],['freightTo','Freight to'],['freeFirst','Free first days'],['freeLast','Free last days'],['tierDays','Tier-1 days'],['tierRate','Tier-1 rate'],['nextRate','Next-day rate']].map(([k,l])=><Field key={k} label={l}><Input type="number" value={f[k]??0} onChange={e=>setF({...f,[k]:Number(e.target.value)})}/></Field>)}<Field label="Calculation mode"><Select value={f.mode} onChange={e=>setF({...f,mode:e.target.value})} options={['Days','24 Hours']}/></Field></div></Drawer>}
