import { SearchSelect } from './SearchSelect';
import React, { useId, useState } from 'react';
import { cls } from '../lib/util';
import { useT } from '../lib/useT';
import { ChevronDown, Inbox, Check as CheckMark } from 'lucide-react';

// ---------- Status chips ----------
const TONES: Record<string, string> = {
  ok: 'bg-ok/10 text-ok', bad: 'bg-bad/10 text-bad', warn: 'bg-warn/[.12] text-warn', info: 'bg-info/10 text-info', violet: 'bg-violet/10 text-violet', muted: 'bg-surface2 text-muted border border-line', brand: 'bg-brand/10 text-brand',
};
const STATUS_TONE: Record<string, string> = {
  Draft: 'muted', Pending: 'warn', 'Pending Approval': 'warn', Confirmed: 'info', Rejected: 'bad', 'In Process': 'violet', Completed: 'ok', Preclosed: 'muted',
  Finalised: 'info', 'In Transit': 'violet', 'At Rail Head': 'info', Loaded: 'info', 'Rake In Transit': 'violet', 'At Branch': 'info', 'Out for Delivery': 'violet', Delivered: 'ok', 'POD Received': 'ok', Billed: 'brand', Paid: 'ok',
  Planned: 'muted', Loading: 'warn', Arrived: 'info', Unloading: 'warn', Open: 'warn', Approved: 'ok', 'Payslip Generated': 'info', Available: 'ok', 'On Trip': 'violet', Workshop: 'warn',
  Overdue: 'bad', Due: 'warn', 'Not Due': 'muted', Resolved: 'ok', 'In Progress': 'violet', High: 'bad', Medium: 'warn', Low: 'muted', Urgent: 'bad', Normal: 'muted',
  Inwarded: 'ok', Sent: 'warn', Received: 'ok', Active: 'ok', Inactive: 'muted', Own: 'violet', Market: 'info', Union: 'info', Expired: 'bad', Expiring: 'warn', Valid: 'ok', Blacklisted: 'bad', Closed: 'muted', 'Not Received': 'warn', Partial: 'warn', Settled: 'ok', Synced: 'ok', 'Not Synced': 'warn',
};
export function StatusBadge({ s, tone, dot = true, className = '' }: { s: string; tone?: string; dot?: boolean; className?: string }) {
  const tr = useT();
  const t = tone || STATUS_TONE[s] || 'muted';
  return (
    <span className={cls('chip', TONES[t], className)}>
      {dot && <span className={cls('w-1.5 h-1.5 rounded-full', t === 'muted' ? 'bg-faint' : 'bg-current', ['In Transit', 'Rake In Transit', 'Out for Delivery', 'On Trip', 'Loading'].includes(s) && 'live-dot')} />}
      {typeof s === 'string' && STATUS_TONE[s] ? tr(s) : s}
    </span>
  );
}

// ---------- Layout bits ----------
export function PageHeader({ title, subtitle, eyebrow, actions, children }: { title: string; subtitle?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h1 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-muted text-[13px] mt-1 max-w-[70ch]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '', pad = true, icon }: { title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string; pad?: boolean; icon?: any }) {
  const Icon = icon;
  return (
    <section className={cls('card min-w-0', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5 border-b border-line/70">
          <div className="min-w-0 flex items-center gap-2">
            {Icon && <Icon size={15} className="text-violet shrink-0" />}
            <div className="min-w-0">
              <h3 className="font-semibold text-[13.5px] truncate">{title}</h3>
              {subtitle && <div className="text-[11.5px] text-muted truncate">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function KPI({ label, value, sub, trend, icon, tone = 'violet', spark, onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; trend?: number; icon?: any; tone?: string; spark?: number[]; onClick?: () => void }) {
  const Icon = icon;
  return (
    <button type="button" onClick={onClick} className={cls('card text-left p-3.5 flex flex-col gap-2 min-w-0 transition', onClick && 'hover:border-violet/40 hover:-translate-y-px cursor-pointer', !onClick && 'cursor-default')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-muted truncate">{label}</span>
        {Icon && <span className={cls('w-7 h-7 rounded-lg grid place-items-center shrink-0', TONES[tone])}><Icon size={14} /></span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-[19px] sm:text-[22px] font-semibold leading-none tnum truncate">{value}</div>
          {(sub || trend !== undefined) && (
            <div className="mt-1.5 text-[11.5px] text-muted flex items-center gap-1.5 flex-wrap">
              {trend !== undefined && <span className={cls('font-semibold', trend >= 0 ? 'text-ok' : 'text-bad')}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}%</span>}
              {sub}
            </div>
          )}
        </div>
        {spark && <Sparkline data={spark} className="hidden sm:block w-16 h-8 shrink-0" />}
      </div>
    </button>
  );
}

export function Sparkline({ data, className = '', color = 'rgb(var(--violet))' }: { data: number[]; className?: string; color?: string }) {
  const id = useId().replace(/:/g, '');
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * 100, 28 - ((v - min) / Math.max(1, max - min)) * 24 - 2]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L100,30 L0,30 Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

export function Progress({ value, tone = 'violet', className = '' }: { value: number; tone?: string; className?: string }) {
  const bg = { violet: 'bg-violet', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', brand: 'bg-brand', info: 'bg-info' }[tone];
  return <div className={cls('h-1.5 rounded-full bg-line overflow-hidden', className)}><div className={cls('h-full rounded-full transition-all', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Tabs({ tabs, value, onChange, className = '' }: { tabs: { key: string; label: React.ReactNode; count?: number }[]; value: string; onChange: (k: string) => void; className?: string }) {
  return (
    <div className={cls('flex gap-1 border-b border-line overflow-x-auto no-scrollbar -mx-1 px-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)} className={cls('tab flex items-center gap-1.5', value === t.key && 'tab-active')}>
          {t.label}
          {t.count !== undefined && <span className={cls('text-[10.5px] px-1.5 rounded-full tnum', value === t.key ? 'bg-brand/10 text-brand' : 'bg-surface2 text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, size = 'md' }: { options: (string | { key: string; label: string })[]; value: string; onChange: (v: string) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-surface2 border border-line max-w-full overflow-x-auto no-scrollbar">
      {options.map((o) => {
        const k = typeof o === 'string' ? o : o.key, l = typeof o === 'string' ? o : o.label;
        return <button key={k} type="button" onClick={() => onChange(k)} className={cls('rounded-md font-semibold transition whitespace-nowrap', size === 'sm' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-3 text-[12.5px]', value === k ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink')}>{l}</button>;
      })}
    </div>
  );
}

export function EmptyState({ title, body, action, icon: Icon = Inbox }: { title: string; body?: string; action?: React.ReactNode; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-2xl bg-violet/10 text-violet grid place-items-center mb-3"><Icon size={22} /></div>
      <div className="font-semibold">{title}</div>
      {body && <p className="text-muted text-[13px] mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KV({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: number }) {
  return (
    <dl className={cls('grid gap-x-6 gap-y-3', cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold text-muted uppercase tracking-[.05em]">{k}</dt>
          <dd className="text-[13px] mt-0.5 break-words">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- Form controls ----------
export function Field({ label, children, hint, required, className = '', error }: { label: string; children: React.ReactNode; hint?: string; required?: boolean; className?: string; error?: string }) {
  return (
    <label className={cls('block min-w-0', className)}>
      <span className="label">{label}{required && <span className="text-brand"> *</span>}</span>
      {children}
      {error ? <span className="block text-[11px] text-bad mt-1">{error}</span> : hint ? <span className="block text-[11px] text-faint mt-1">{hint}</span> : null}
    </label>
  );
}
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...p }, ref) {
  return <input ref={ref} {...p} className={cls('input', p.type === 'number' && 'tnum', className)} onWheel={(e) => (e.target as HTMLInputElement).blur()} />;
});
export function Select({ options, placeholder, className = '', native, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string; sub?: string })[]; placeholder?: string; native?: boolean }) {
  const t = useT();
  // Long lists become a type-to-search picker; short ones stay a native dropdown.
  if (!native && options.length > 8) {
    const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    return <SearchSelect value={String(p.value ?? '')} disabled={p.disabled} placeholder={placeholder ?? 'Select'} ariaLabel={(p as any)['aria-label']} className={className}
      options={opts} onChange={(v) => p.onChange?.({ target: { value: v }, currentTarget: { value: v } } as any)} />;
  }
  return (
    <div className="relative">
      <select {...p} className={cls('input appearance-none pr-8 cursor-pointer', className)}>
        {placeholder !== undefined && <option value="">{t(placeholder)}</option>}
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cls('input', p.className)} />; }
export function Check({ label, checked, onChange, className = '' }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cls('inline-flex items-center gap-2 cursor-pointer select-none text-[13px]', className)}>
      <span className={cls('w-4 h-4 rounded border grid place-items-center transition shrink-0', checked ? 'bg-violet border-violet text-white' : 'bg-surface border-line')}>{checked && <CheckMark size={11} strokeWidth={3} />}</span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function CheckIcon(p: any) { return <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill="none" stroke="currentColor" strokeWidth={p.strokeWidth}><path d="M5 12l5 5L20 7" /></svg>; }
export { CheckIcon };
export function Radio({ options, value, onChange, name }: { options: string[]; value: string; onChange: (v: string) => void; name?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button type="button" key={o} role="radio" aria-label={o} aria-checked={value === o} onClick={() => onChange(o)} className={cls('h-8 px-3 rounded-lg border text-[12.5px] font-semibold transition', value === o ? 'border-violet bg-violet/10 text-violet' : 'border-line bg-surface text-muted hover:text-ink')}>{o}</button>
      ))}
    </div>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-[13px]">
      <span className={cls('w-8 h-[18px] rounded-full relative transition', checked ? 'bg-violet' : 'bg-line')}><span className={cls('absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all', checked ? 'left-[16px]' : 'left-[2px]')} /></span>
      {label}
    </button>
  );
}

export function FormSection({ title, children, cols = 3, desc }: { title: string; children: React.ReactNode; cols?: number; desc?: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="eyebrow mb-2.5 flex items-center gap-2 w-full">{title}<span className="flex-1 h-px bg-line" /></legend>
      {desc && <p className="text-[12px] text-muted -mt-1 mb-2.5">{desc}</p>}
      <div className={cls('grid gap-3', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : cols === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>{children}</div>
    </fieldset>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const ini = (name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className="rounded-full grid place-items-center font-semibold text-white shrink-0" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 45% 45%)` }}>{ini}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={cls('skeleton', className)} />; }

export function useForm<T extends Record<string, any>>(init: T) {
  const [f, setF] = useState<T>(init);
  const set = (k: keyof T | Partial<T>, v?: any) => setF((p) => (typeof k === 'object' ? { ...p, ...k } : { ...p, [k]: v }));
  const bind = (k: keyof T, num = false) => ({ value: f[k] ?? '', onChange: (e: any) => set(k, num ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value) });
  return { f, set, setF, bind };
}

export function Money({ v, className = '' }: { v: number; className?: string }) { return <span className={cls('tnum', className)}>₹{Number(v || 0).toLocaleString('en-IN')}</span>; }
export function DocNo({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return onClick ? <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="docno text-violet hover:underline text-left">{children}</button> : <span className="docno">{children}</span>;
}
export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="min-w-0"><div className="text-[11px] text-muted font-semibold">{label}</div><div className={cls('font-display text-[17px] font-semibold tnum mt-0.5', tone && `text-${tone}`)}>{value}</div></div>;
}
