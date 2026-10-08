import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cls } from '../lib/util';
import { useT } from '../lib/useT';

export type Opt = { value: string; label: string; sub?: string };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Type-to-search picker used for any list longer than a handful of options. */
export function SearchSelect({ value, onChange, options, placeholder = 'Select', disabled, className = '', ariaLabel, id }: {
  value: string; onChange: (v: string) => void; options: Opt[]; placeholder?: string; disabled?: boolean; className?: string; ariaLabel?: string; id?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean; maxH: number } | null>(null);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const selected = options.find((o) => o.value === value);

  const results = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    const list = placeholder !== undefined && !q ? [{ value: '', label: t(placeholder), sub: '' } as Opt, ...options] : options;
    if (!words.length) return list;
    const scored: [number, Opt][] = [];
    for (const o of options) {
      const l = norm(o.label + ' ' + (o.sub || ''));
      if (o.value && o.value.toLowerCase() === q.trim().toLowerCase()) scored.push([-1, o]);
      else if (words.every((w) => l.includes(w))) scored.push([l.startsWith(words[0]) ? 0 : l.includes(' ' + words[0]) ? 1 : 2, o]);
    }
    return scored.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  }, [q, options, placeholder, t]);
  const shown = results.slice(0, 120);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom, up = below < 300 && r.top > below;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 280) - 8)), top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 280), up, maxH: Math.min(360, (up ? r.top : below) - 16) });
  };
  useLayoutEffect(() => { if (open && !mobile) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 10);
    const onDoc = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const onScroll = (e: Event) => { if (pop.current?.contains(e.target as Node)) return; if (!mobile) place(); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); };
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { pop.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); setTimeout(() => btn.current?.focus(), 0); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  const panel = open && (
    <>
      {mobile && <div className="fixed inset-0 z-[89] bg-black/40" onClick={() => setOpen(false)} />}
      <div ref={pop} role="dialog" aria-label={ariaLabel || t(placeholder || 'Choose')} onKeyDown={onKey}
        className={cls('fixed z-[90] card shadow-pop flex flex-col overflow-hidden animate-in', mobile ? 'inset-x-0 bottom-0 rounded-b-none rounded-t-2xl max-h-[78vh] pb-[env(safe-area-inset-bottom,0px)]' : '')}
        style={mobile || !pos ? undefined : { left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }), maxHeight: Math.max(220, pos.maxH) }}>
        {mobile && <div className="flex items-center justify-between px-4 pt-3"><div className="font-semibold text-[15px]">{ariaLabel || t(placeholder || 'Choose')}</div><button className="btn-icon" onClick={() => setOpen(false)} aria-label={t('Close')}><X size={18} /></button></div>}
        <div className="p-2 border-b border-line">
          <div className="relative"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search {n} options…', { n: options.length.toLocaleString('en-IN') })} aria-label={t('Search options')} className="input pl-8 h-10 text-[14px]" /></div>
        </div>
        <ul role="listbox" className="overflow-y-auto overscroll-contain py-1 min-h-0 flex-1">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">{t('No match for “{q}”', { q })}</li>}
          {shown.map((o, i) => (
            <li key={o.value + i} data-i={i} data-value={o.value} role="option" aria-selected={o.value === value} onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)}
              className={cls('mx-1 px-2.5 py-2 rounded-md cursor-pointer flex items-center gap-2 text-[13.5px]', i === active && 'bg-violet/10', o.value === '' && 'text-muted')}>
              <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.sub && <span className="block truncate text-[11.5px] text-muted">{o.sub}</span>}</span>
              {o.value === value && o.value !== '' && <Check size={15} className="text-violet shrink-0" />}
            </li>
          ))}
          {results.length > shown.length && <li className="px-3 py-2 text-[11.5px] text-faint">{t('Showing {n} of {total} – keep typing to narrow', { n: shown.length, total: results.length.toLocaleString('en-IN') })}</li>}
        </ul>
      </div>
    </>
  );

  return (
    <>
      <button ref={btn} id={id} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} disabled={disabled}
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); } else if (!open && e.key.length === 1 && /\S/.test(e.key)) { setQ(e.key); setOpen(true); } }}
        className={cls('input text-left flex items-center gap-2 pr-2 cursor-pointer disabled:opacity-60', className)}>
        <span className={cls('flex-1 min-w-0 truncate', !selected?.value && 'text-faint')}>{selected?.value ? selected.label : t(placeholder)}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}
