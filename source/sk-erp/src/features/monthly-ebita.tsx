import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileText, TrendingUp, Wallet } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PageHeader, KPI, Card } from '../components/ui';
import { compactINR, inr } from '../lib/util';

type Month = { key: string; revenue: number; diesel: number; transport: number; payroll: number; tolls: number; maintenance: number; admin: number; depreciation: number; interest: number; amortization: number; tax: number };
const lakh = 100000;
const DATA: Month[] = [
  { key: 'Apr 2026', revenue: 184, diesel: 49, transport: 65, payroll: 19, tolls: 7, maintenance: 9, admin: 11, depreciation: 4, interest: 3, amortization: 1, tax: 3 },
  { key: 'May 2026', revenue: 192, diesel: 52, transport: 67, payroll: 19, tolls: 8, maintenance: 8, admin: 12, depreciation: 4, interest: 3, amortization: 1, tax: 4 },
  { key: 'Jun 2026', revenue: 178, diesel: 48, transport: 63, payroll: 19, tolls: 7, maintenance: 10, admin: 12, depreciation: 4, interest: 3, amortization: 1, tax: 2 },
  { key: 'Jul 2026', revenue: 201, diesel: 54, transport: 70, payroll: 20, tolls: 8, maintenance: 9, admin: 12, depreciation: 4, interest: 3, amortization: 1, tax: 4 },
  { key: 'Aug 2026', revenue: 213, diesel: 56, transport: 73, payroll: 20, tolls: 9, maintenance: 10, admin: 12, depreciation: 4, interest: 3, amortization: 1, tax: 5 },
  { key: 'Sep 2026', revenue: 225, diesel: 58, transport: 78, payroll: 21, tolls: 9, maintenance: 11, admin: 13, depreciation: 4, interest: 3, amortization: 1, tax: 5 },
];
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
  const header = ['Month','Revenue','Operating expenses','Depreciation','EBITA','EBITA margin %','Interest excluded','Amortization excluded','Income tax excluded'];
  const values = rows.map(m => [m.key,m.revenue,expenses(m),m.depreciation,ebita(m),(100 * ebita(m) / m.revenue).toFixed(2),m.interest,m.amortization,m.tax]);
  const csv = [header,...values].map(row => row.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'sk-translines-monthly-ebita-demo.csv'; a.click();
  URL.revokeObjectURL(url);
}
export function MonthlyEBITA() {
  const [selected, setSelected] = useState(DATA[DATA.length - 1].key);
  const [view, setView] = useState<'monthly' | 'all'>('monthly');
  const current = DATA.find(m => m.key === selected) || DATA[DATA.length - 1];
  const rows = view === 'all' ? DATA : [current];
  const e = ebita(current);
  const chart = useMemo(() => DATA.map(m => ({ month: m.key.slice(0,3), Revenue: m.revenue, Expenses: expenses(m) + m.depreciation, EBITA: ebita(m) })), []);
  return <div className="grid gap-5 min-w-0">
    <PageHeader eyebrow="Finance / Management reporting" title="Monthly EBITA" subtitle="Earnings before interest, taxes and amortization • Monthly management statement"
      actions={<div className="flex flex-wrap gap-2">
        <select aria-label="Reporting month" className="input h-9" value={selected} onChange={e => setSelected(e.target.value)}>{DATA.map(m => <option key={m.key}>{m.key}</option>)}</select>
        <button className="btn-ghost h-9" onClick={() => setView(view === 'all' ? 'monthly' : 'all')}>{view === 'all' ? 'Selected month' : 'All months'}</button>
        <button className="btn-primary h-9" onClick={() => exportCsv(rows)}><Download size={15}/> Export CSV</button>
        <button className="btn-ghost h-9" onClick={() => window.print()}><FileText size={15}/> Print / PDF</button>
      </div>} />
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm"><b>Demonstration figures.</b> This report uses illustrative monthly financial data, not reconciled ERP accounts. All amounts below are in Indian rupees unless marked ₹ lakh.</div>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI label="Revenue" value={compactINR(current.revenue * lakh)} icon={Wallet}/>
      <KPI label="Operating costs + depreciation" value={compactINR((expenses(current) + current.depreciation) * lakh)} icon={BarChart3}/>
      <KPI label="EBITA" value={compactINR(e * lakh)} icon={TrendingUp} tone={e >= 0 ? 'ok' : 'bad'}/>
      <KPI label="EBITA margin" value={(100 * e / current.revenue).toFixed(1) + '%'} icon={TrendingUp} tone={e >= 0 ? 'ok' : 'bad'}/>
    </section>
    <Card title="Monthly profitability trend" subtitle="₹ lakh • Revenue, costs including depreciation, and EBITA across reporting months">
      <div style={{ height: 300 }} className="w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:8,right:8,bottom:0,left:0}}><CartesianGrid stroke="var(--grid)" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v) => '₹' + v + ' lakh'}/><Legend/><Bar dataKey="Revenue" fill="#7c6de6" radius={[4,4,0,0]}/><Bar dataKey="Expenses" fill="#e5a14b" radius={[4,4,0,0]}/><Bar dataKey="EBITA" fill="#20a783" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
    </Card>
    <Card title="Monthly EBITA statement" subtitle="EBITA = revenue − operating costs − depreciation. Interest, income tax and amortization are excluded.">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line text-left"><th className="py-3 pr-4">Particulars</th>{rows.map(m => <th key={m.key} className="py-3 px-3 text-right whitespace-nowrap">{m.key}</th>)}</tr></thead><tbody>
        <tr className="border-b border-line font-semibold"><td className="py-3 pr-4">Operating revenue</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(m.revenue)}</td>)}</tr>
        {categories.map(c => <tr key={c.key} className="border-b border-line"><td className="py-2 pr-4">{c.label}</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(Number(m[c.key]))}</td>)}</tr>)}
        <tr className="border-b border-line font-semibold"><td className="py-3 pr-4">Total costs incl. depreciation</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(expenses(m) + m.depreciation)}</td>)}</tr>
        <tr className="border-b border-line font-bold"><td className="py-3 pr-4">EBITA</td>{rows.map(m => <td key={m.key} className="text-right px-3 whitespace-nowrap">{money(ebita(m))}</td>)}</tr>
        <tr className="border-b border-line"><td className="py-3 pr-4">EBITA margin</td>{rows.map(m => <td key={m.key} className="text-right px-3">{(100 * ebita(m) / m.revenue).toFixed(1)}%</td>)}</tr>
      </tbody></table></div>
    </Card>
    <p className="text-xs text-muted">Accounting note: EBITA includes depreciation but excludes interest, income taxes and amortization. Sample interest, tax and amortization amounts are not deducted in this report. Exported CSV values are expressed in ₹ lakh.</p>
  </div>;
}
