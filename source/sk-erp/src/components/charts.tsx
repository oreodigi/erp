import React from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card } from './ui';
import { compactINR } from '../lib/util';

export const C = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
const axis = { fontSize: 11, fill: 'rgb(var(--muted))' };
// short tick labels: 1,600 → 1.6k so they never get clipped
const short = (v: number) => (Math.abs(v) >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);

export function ChartTip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card shadow-pop px-3 py-2 text-[12px] min-w-[140px]">
      {label !== undefined && <div className="font-semibold mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />{p.name}</span>
          <span className="font-semibold tnum text-ink">{money ? compactINR(p.value) : Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, actions, children, height = 220, className = '', legend }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactElement; height?: number; className?: string; legend?: { label: string; color: string }[] }) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions} className={className}>
      {legend && <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11.5px] text-muted">{legend.map((l) => <span key={l.label} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}</span>)}</div>}
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AreaTrend({ data, keys, x = 'x', money, stacked, ...rest }: { data: any[]; keys: { key: string; label: string; color?: string }[]; x?: string; money?: boolean; stacked?: boolean; [k: string]: any }) {
  return (
    <AreaChart {...rest} data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
      <defs>{keys.map((k, i) => <linearGradient key={k.key} id={`g-${k.key}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={k.color || C[i]} stopOpacity={0.28} /><stop offset="1" stopColor={k.color || C[i]} stopOpacity={0} /></linearGradient>)}</defs>
      <CartesianGrid stroke="var(--grid)" vertical={false} />
      <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
      <YAxis tick={axis} tickLine={false} axisLine={false} width={money ? 58 : 36} tickFormatter={(v) => (money ? compactINR(v) : short(v))} />
      <Tooltip content={<ChartTip money={money} />} cursor={{ stroke: 'rgb(var(--faint))', strokeDasharray: '3 3' }} />
      {keys.map((k, i) => <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color || C[i]} strokeWidth={2} fill={`url(#g-${k.key})`} stackId={stacked ? 'a' : undefined} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} />)}
    </AreaChart>
  );
}

export function Bars({ data, keys, x = 'x', money, horizontal, stacked, ...rest }: { data: any[]; keys: { key: string; label: string; color?: string }[]; x?: string; money?: boolean; horizontal?: boolean; stacked?: boolean; [k: string]: any }) {
  return (
    <BarChart {...rest} data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 10, left: horizontal ? 8 : -8, bottom: 0 }} barGap={2} barCategoryGap="28%">
      <CartesianGrid stroke="var(--grid)" vertical={!!horizontal} horizontal={!horizontal} />
      {horizontal ? <>
        <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (money ? compactINR(v) : short(v))} />
        <YAxis type="category" dataKey={x} tick={axis} tickLine={false} axisLine={false} width={110} />
      </> : <>
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval={data.length > 8 ? 'preserveStartEnd' : 0} minTickGap={10} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={money ? 58 : 36} tickFormatter={(v) => (money ? compactINR(v) : short(v))} />
      </>}
      <Tooltip content={<ChartTip money={money} />} cursor={{ fill: 'rgb(var(--violet) / .06)' }} />
      {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color || C[i]} radius={stacked && i < keys.length - 1 ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={stacked ? 'a' : undefined} maxBarSize={28} stroke="rgb(var(--surface))" strokeWidth={stacked ? 1 : 0} />)}
    </BarChart>
  );
}

export function Lines({ data, keys, x = 'x', money, domain, ...rest }: { data: any[]; keys: { key: string; label: string; color?: string }[]; x?: string; money?: boolean; domain?: [number, number]; [k: string]: any }) {
  return (
    <LineChart {...rest} data={data} margin={{ top: 6, right: 10, left: -8, bottom: 0 }}>
      <CartesianGrid stroke="var(--grid)" vertical={false} />
      <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
      <YAxis tick={axis} tickLine={false} axisLine={false} width={money ? 58 : 36} domain={domain} tickFormatter={(v) => (money ? compactINR(v) : short(v))} />
      <Tooltip content={<ChartTip money={money} />} cursor={{ stroke: 'rgb(var(--faint))', strokeDasharray: '3 3' }} />
      {keys.map((k, i) => <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color || C[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} />)}
    </LineChart>
  );
}

export function Donut({ data, money, center, ...rest }: { data: { name: string; value: number; color?: string }[]; money?: boolean; center?: { label: string; value: string }; [k: string]: any }) {
  return (
    <PieChart {...rest}>
      <Tooltip content={<ChartTip money={money} />} />
      <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={1.5} stroke="rgb(var(--surface))" strokeWidth={2}>
        {data.map((d, i) => <Cell key={d.name} fill={d.color || C[i % C.length]} />)}
      </Pie>
      {center && <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"><tspan x="50%" dy="-0.4em" style={{ fontSize: 11, fill: 'rgb(var(--muted))' }}>{center.label}</tspan><tspan x="50%" dy="1.4em" style={{ fontSize: 16, fontWeight: 700, fill: 'rgb(var(--ink))' }}>{center.value}</tspan></text>}
    </PieChart>
  );
}

export function LegendList({ data, money }: { data: { name: string; value: number; color?: string }[]; money?: boolean }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ul className="grid grid-cols-1 gap-1.5 text-[12px] min-w-0">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color || C[i % C.length] }} />
          <span className="truncate flex-1 text-muted">{d.name}</span>
          <span className="tnum font-semibold">{money ? compactINR(d.value) : d.value.toLocaleString('en-IN')}</span>
          <span className="tnum text-faint w-9 text-right">{Math.round((d.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}
export { Legend };
