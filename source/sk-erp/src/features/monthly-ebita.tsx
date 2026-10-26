import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileText, TrendingUp, Wallet } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PageHeader, KPI, Card } from '../components/ui';
import { compactINR, inr } from '../lib/util';
import { useDB, useStore, isServerBacked } from '../store/store';

type Month = { key: string; revenue: number; diesel: number; transport: number; payroll: number; tolls: number; maintenance: number; admin: number; depreciation: number; interest: number; amortization: number; tax: number };
const lakh = 100000;
// Generated from the currently selected ERP dataset. No fixed monthly P&L numbers.
const sourceMonths = (db:any) => [...new Set([
  ...(db.bills||[]).map((r:any)=>String(r.date||'').slice(0,7)),
  ...(db.schedules||[]).map((r:any)=>String(r.date||'').slice(0,7))
].filter((x:string)=>/^\d{4}-\d{2}$/.test(x)))].sort().reverse() as string[];
const sourceMonth = (db:any, ym:string, railOnly:boolean):Month => {
  const lrMap = new Map((db.lrs||[]).map((x:any)=>[String(x.id),x]));
  const isRail=(lr:any)=>lr&&(lr.scheduleId||lr.mode==='Railway'||lr.mode==='Both');
  const eligible=(id:any)=>!railOnly||isRail(lrMap.get(String(id)));
  const bills=(db.bills||[]).filter((b:any)=>!b.deleted&&String(b.date||'').slice(0,7)===ym);
  // Revenue is from taxable invoice lines, not invoice GST or cash receipts.
  const revenue=bills.reduce((t:number,b:any)=>t+(b.rows||[]).filter((r:any)=>eligible(r.lrId)).reduce((a:number,r:any)=>a+Number(r.net??(Number(r.freight||0)+Number(r.add||0)-Number(r.sub||0))),0),0);
  const railway=(db.schedules||[]).filter((s:any)=>String(s.date||'').slice(0,7)===ym).reduce((t:number,s:any)=>t+(s.mrrr?.rows||[]).reduce((a:number,r:any)=>a+Number(r.railFreight||0),0),0);
  const tp=(db.tpSlips||[]).filter((s:any)=>String(s.date||'').slice(0,7)===ym).reduce((t:number,s:any)=>t+(s.rows||[]).filter((r:any)=>eligible(r.lrId)).reduce((a:number,r:any)=>a+Number(r.freight||0)+Number(r.detention||0)+Number(r.hamali||0)-Number(r.damage||0),0),0);
  const dcMap=new Map((db.dcs||[]).map((d:any)=>[String(d.id),d]));
  const delivery=(db.dcPayslips||[]).filter((p:any)=>String(p.date||'').slice(0,7)===ym).reduce((t:number,p:any)=>t+(p.dcIds||[]).reduce((a:number,id:any)=>{const d:any=dcMap.get(String(id));return a+(d&&eligible(d.lrId)?Number(d.approval?.payable||0):0)},0),0);
  const grnMap=new Map((db.grns||[]).map((g:any)=>[String(g.id),g]));
  const hamali=(db.hamaliPayments||[]).filter((p:any)=>String(p.date||'').slice(0,7)===ym).reduce((t:number,p:any)=>t+(p.refIds||[]).reduce((a:number,id:any)=>{const g:any=grnMap.get(String(id));return a+(g&&eligible(g.lrId)?Number(g.labourCharge||0):0)},0),0);
  const trips=(db.trips||[]);
  const tripById=new Map(trips.map((t:any)=>[String(t.id),t]));
  const expenseTypes=new Map((db.expenseTypes||[]).map((e:any)=>[String(e.id),String(e.name||'')]));
  const exp=(db.tripExpenses||[]).filter((e:any)=>String(e.date||'').slice(0,7)===ym&&(!railOnly||eligible((tripById.get(String(e.tripId)) as any)?.lrId)));
  const total=(re:RegExp)=>exp.filter((e:any)=>re.test(String(expenseTypes.get(String(e.typeId))||''))).reduce((t:number,e:any)=>t+Number(e.amount||0),0);
  const diesel=railOnly?0:total(/diesel|fuel/i),tolls=railOnly?0:total(/toll/i);
  const admin=railOnly?0:exp.reduce((t:number,e:any)=>t+Number(e.amount||0),0)-diesel-tolls+(db.monthlyExpenses||[]).filter((e:any)=>String(e.date||'').slice(0,7)===ym).reduce((t:number,e:any)=>t+Number(e.amount||0),0);
  return {key:ym,revenue:revenue/lakh,diesel:diesel/lakh,transport:(railway+tp+delivery)/lakh,payroll:0,tolls:tolls/lakh,maintenance:hamali/lakh,admin:admin/lakh,depreciation:0,interest:0,amortization:0,tax:0};
};
const expenses = (m: Month) => m.diesel + m.transport + m.payroll + m.tolls + m.maintenance + m.admin;
const ebita = (m: Month) => m.revenue - expenses(m) - m.depreciation;
const categories: { key: keyof Month; label: string }[] = [
  { key: 'diesel', label: 'Diesel & fuel' }, { key: 'transport', label: 'Transporter / freight costs' },
  { key: 'payroll', label: 'Driver & staff salaries' }, { key: 'tolls', label: 'Tolls & trip charges' },
  { key: 'maintenance', label: 'Fleet maintenance' }, { key: 'admin', label: 'Office & administration' },
  { key: 'depreciation', label: 'Depreciation (included in EBITA)' },
];
const money = (n: number) => inr(n * lakh);
function exportCsv(rows: Month[]) {
  const header = ['Month','Revenue from ERP','Identified costs only','Depreciation NOT available','Provisional surplus NOT EBITA','Provisional margin %','WARNING: incomplete expenses'];
  const values = rows.map(m => [m.key,m.revenue,expenses(m),'NOT RECORDED',ebita(m),m.revenue?(100 * ebita(m) / m.revenue).toFixed(2):'N/A','Not a verified financial statement']);
  const csv = [header,...values].map(row => row.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'sk-translines-provisional-pnl.csv'; a.click();
  URL.revokeObjectURL(url);
}

function printStatement(rows: Month[]) {
  // Render an independent HTML statement instead of printing the app shell.
  // This also works in mobile Safari, where app layouts can print blank.
  const popup = window.open('', '_blank');
  if (!popup) { window.alert('Please allow pop-ups to open the printable EBITA report.'); return; }
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] || char));
  const fields = [
    ['Operating revenue', (m: Month) => m.revenue],
    ...categories.map(category => [category.label, (m: Month) => Number(m[category.key])] as [string, (m: Month) => number]),
    ['Identified costs (incomplete)', (m: Month) => expenses(m) + m.depreciation],
    ['Provisional operating surplus (NOT EBITA)', (m: Month) => ebita(m)],
  ] as [string, (m: Month) => number][];
  const table = fields.map(([label, value]) => '<tr><th>' + escapeHtml(label) + '</th>' + rows.map(m => '<td>' + escapeHtml(money(value(m))) + '</td>').join('') + '</tr>').join('');
  const margin = '<tr><th>Provisional margin (NOT EBITA)</th>' + rows.map(m => '<td>' + (100 * ebita(m) / m.revenue).toFixed(1) + '%</td>').join('') + '</tr>';
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SK Translines - Monthly EBITA</title><style>
    body{font-family:Arial,sans-serif;color:#172033;background:white;margin:0;padding:24px}
    h1{font-size:23px;margin:0 0 6px}.sub{color:#64748b;margin:0 0 16px}
    .note{padding:12px;background:#fff4d6;border:1px solid #efcd72;border-radius:6px;margin:16px 0;font-size:13px}
    table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:10px 8px;border-bottom:1px solid #dbe1e8}
    th{text-align:left}thead th,td{text-align:right}thead th:first-child{text-align:left}
    tbody tr:last-child{font-weight:bold;background:#eef4fa}
    .actions{margin:0 0 20px;display:flex;gap:10px}button{padding:10px 16px;background:#233e85;color:white;border:0;border-radius:6px;font-size:15px}
    .foot{margin-top:24px;font-size:11px;color:#64748b}
    @page{size:A4 landscape;margin:12mm}
    @media print{.actions{display:none!important}body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{font-size:10px}tr{break-inside:avoid}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>SK Translines — Provisional Railway Profit &amp; Loss Statement</h1><p class="sub">${escapeHtml(rows.map(m=>m.key).join(' • '))} | All amounts in INR</p>
  <div class="note"><strong>ERP SOURCE RECORDS — INCOMPLETE ACCOUNTING.</strong> Revenue and identifiable costs come from the current ERP dataset; missing salary, rent, fixed costs, depreciation and other overheads mean EBITA cannot yet be verified.</div>
  <table><thead><tr><th>Particulars</th>${rows.map(m=>'<th>'+escapeHtml(m.key)+'</th>').join('')}</tr></thead><tbody>${table}${margin}</tbody></table>
  <div class="foot">PROVISIONAL P&L, NOT VERIFIED EBITA. Complete and reconcile all operating expense ledgers and depreciation before publishing an EBITA statement.</div>
  </body></html>`);
  popup.document.close();
}

export function MonthlyEBITA() {
  const db = useDB();
  const source = useStore(s=>s.source);
  const months = useMemo(()=>sourceMonths(db),[db]);
  const [selected, setSelected] = useState('');
  const [railOnly,setRailOnly]=useState(true);
  const DATA = useMemo(()=>months.map(m=>sourceMonth(db,m,railOnly)),[db,months,railOnly]);
  const [view, setView] = useState<'monthly' | 'all'>('monthly');
  const current = DATA.find(m => m.key === selected) || DATA[0] || sourceMonth(db,'',railOnly);
  const rows = view === 'all' ? DATA : [current];
  const e = ebita(current);
  const chart = useMemo(() => DATA.map(m => ({ month: m.key, Revenue: m.revenue, 'Mapped costs': expenses(m) + m.depreciation, 'Provisional surplus': ebita(m) })), [DATA]);
  return <div className="grid gap-5 min-w-0">
    <PageHeader eyebrow="Finance / Management reporting" title="Monthly EBITA" subtitle="Earnings before interest, taxes and amortization • Monthly management statement"
      actions={<div className="flex flex-wrap gap-2">
        <select aria-label="Reporting month" className="input h-9" value={selected} onChange={e => setSelected(e.target.value)}>{DATA.map(m => <option key={m.key}>{m.key}</option>)}</select>
        <select className="input h-9" aria-label="Business segment" value={railOnly?'rail':'all'} onChange={e=>setRailOnly(e.target.value==='rail')}><option value="rail">Railway / Rake</option><option value="all">All Operations</option></select>
        <button className="btn-ghost h-9" onClick={() => setView(view === 'all' ? 'monthly' : 'all')}>{view === 'all' ? 'Selected month' : 'All months'}</button>
        <button className="btn-primary h-9" onClick={() => exportCsv(rows)}><Download size={15}/> Export CSV</button>
        <button className="btn-ghost h-9" onClick={() => printStatement(rows)}><FileText size={15}/> Print / PDF</button>
      </div>} />
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm"><b>{source==='legacy'&&isServerBacked()?'Server ERP records':'Browser sample ERP records'} — INCOMPLETE PROFIT &amp; LOSS.</b> Revenue and mapped railway / transporter / trip costs are derived from current ERP transactions. Payroll, fixed overheads, depreciation and other unclassified expenses are missing. The displayed operating surplus is NOT verified EBITA.</div>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI label="Revenue" value={compactINR(current.revenue * lakh)} icon={Wallet}/>
      <KPI label="Operating costs + depreciation" value={compactINR((expenses(current) + current.depreciation) * lakh)} icon={BarChart3}/>
      <KPI label="Provisional surplus" value={compactINR(e * lakh)} icon={TrendingUp} tone={e >= 0 ? 'ok' : 'bad'}/>
      <KPI label="Provisional margin" value={(100 * e / current.revenue).toFixed(1) + '%'} icon={TrendingUp} tone={e >= 0 ? 'ok' : 'bad'}/>
    </section>
    <Card title="ERP revenue and mapped costs trend (incomplete)" subtitle="₹ lakh • Unrecorded costs and depreciation excluded; not a verified EBITA trend">
      <div style={{ height: 300 }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:8,right:8,bottom:0,left:0}}><CartesianGrid stroke="var(--grid)" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v) => '₹' + v + ' lakh'}/><Legend/><Bar dataKey="Revenue" fill="#7c6de6" radius={[4,4,0,0]}/><Bar dataKey="Mapped costs" fill="#e5a14b" radius={[4,4,0,0]}/><Bar dataKey="Provisional surplus" fill="#20a783" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
    </Card>
    <Card title="Monthly Profit & Loss (ERP source data)" subtitle="In-source income and costs only • Missing overheads and depreciation prevent verified EBITA">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line text-left"><th className="py-3 pr-4">Particulars</th>{rows.map(m => <th key={m.key} className="py-3 px-3 text-right whitespace-nowrap">{m.key}</th>)}</tr></thead><tbody>
        <tr className="border-b border-line font-semibold"><td className="py-3 pr-4">Operating revenue</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(m.revenue)}</td>)}</tr>
        {categories.map(c => <tr key={c.key} className="border-b border-line"><td className="py-2 pr-4">{c.label}</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(Number(m[c.key]))}</td>)}</tr>)}
        <tr className="border-b border-line font-semibold"><td className="py-3 pr-4">Total costs incl. depreciation</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(expenses(m) + m.depreciation)}</td>)}</tr>
        <tr className="border-b border-line font-bold"><td className="py-3 pr-4">Provisional surplus — NOT EBITA</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(ebita(m))}</td>)}</tr>
        <tr className="border-b border-line"><td className="py-3 pr-4">Provisional margin</td>{rows.map(m => <td key={m.key} className="text-right px-3">{(100 * ebita(m) / m.revenue).toFixed(1)}%</td>)}</tr>
      </tbody></table></div>
    </Card>
    <p className="text-xs text-muted">Accounting note: This is a partial calculation only. Missing salary, rent, statutory contributions, depreciation and other operating expenses cannot be assumed zero. A verified EBITA figure is withheld until these categories are reconciled. CSV values are in ₹ lakh.</p>
  </div>;
}
