// Per-user menu overrides on top of the role's default menus.
// Each screen is in one of three states: role default (follows the role), granted (extra), removed (denied).
import React, { useMemo, useState } from 'react';
import { NAV } from '../../nav';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { Search, X, RotateCcw, ChevronDown } from 'lucide-react';
import { roleDefaultMenus } from './shared';

type State = 'default' | 'extra' | 'denied';

/** Drops overrides that no longer change anything for this role (e.g. after a role change). Unknown keys are kept. */
export function normaliseOverrides(role: string, extra: string[], denied: string[]) {
  const def = roleDefaultMenus(role);
  return {
    extra: [...new Set(extra)].filter((k) => !def.has(k)).sort(),
    denied: [...new Set(denied)].filter((k) => def.has(k) || !NAV.some((g) => g.items.some((i) => i.key === k))).sort(),
  };
}

export function PermissionEditor({ role, extra, denied, onChange, disabled }: { role: string; extra: string[]; denied: string[]; onChange: (v: { extra: string[]; denied: string[] }) => void; disabled?: boolean }) {
  const t = useT();
  const def = useMemo(() => roleDefaultMenus(role), [role]);
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'access' | 'changed'>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const ex = new Set(extra), dn = new Set(denied);
  const stateOf = (k: string): State => (def.has(k) ? (dn.has(k) ? 'denied' : 'default') : ex.has(k) ? 'extra' : 'default');
  const has = (k: string) => (def.has(k) ? !dn.has(k) : ex.has(k));
  const set = (k: string, on: boolean) => {
    const e = new Set(ex), d = new Set(dn);
    if (def.has(k)) { on ? d.delete(k) : d.add(k); e.delete(k); } else { on ? e.add(k) : e.delete(k); d.delete(k); }
    onChange({ extra: [...e].sort(), denied: [...d].sort() });
  };
  const s = q.trim().toLowerCase();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => (!s || `${g.label} ${i.label} ${i.key}`.toLowerCase().includes(s)) && (only === 'all' || (only === 'access' ? has(i.key) : stateOf(i.key) !== 'default'))) })).filter((g) => g.items.length);
  const changed = extra.length + denied.length;
  const total = NAV.reduce((a, g) => a + g.items.filter((i) => has(i.key)).length, 0);

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="chip bg-surface2 text-muted border border-line">{t('{n} screens in menu', { n: total })}</span>
        <span className="chip bg-surface2 text-muted border border-line">{t('{n} from role', { n: def.size })}</span>
        {extra.length > 0 && <span className="chip bg-ok/10 text-ok">+{extra.length} {t('granted')}</span>}
        {denied.length > 0 && <span className="chip bg-bad/10 text-bad">−{denied.length} {t('removed')}</span>}
        {changed > 0 && !disabled && <button type="button" className="btn-subtle btn-sm ml-auto" onClick={() => onChange({ extra: [], denied: [] })}><RotateCcw size={12} /> {t('Reset to role default')}</button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-8 h-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search screens…')} aria-label={t('Search screens')} />
          {q && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-faint" onClick={() => setQ('')} aria-label={t('Clear search')}><X size={13} /></button>}
        </div>
        <select className="input h-9 w-auto" value={only} onChange={(e) => setOnly(e.target.value as any)} aria-label={t('Show')}>
          <option value="all">{t('All screens')}</option>
          <option value="access">{t('In menu')}</option>
          <option value="changed">{t('Changed from role')}</option>
        </select>
      </div>
      <div className="rounded-lg border border-line divide-y divide-line max-h-[46vh] overflow-y-auto scrollbar-thin">
        {groups.length === 0 && <div className="p-4 text-center text-[12.5px] text-muted">{t('No screens match.')}</div>}
        {groups.map((g) => {
          const isOpen = !!s || only !== 'all' || open.has(g.key);
          const on = g.items.filter((i) => has(i.key)).length;
          const diff = g.items.filter((i) => stateOf(i.key) !== 'default').length;
          return (
            <div key={g.key}>
              <button type="button" className="w-full flex items-center gap-2 px-3 py-2 bg-surface2/60 text-left" aria-expanded={isOpen} onClick={() => { const n = new Set(open); n.has(g.key) ? n.delete(g.key) : n.add(g.key); setOpen(n); }}>
                <ChevronDown size={14} className={cls('text-muted transition shrink-0', !isOpen && '-rotate-90')} />
                <span className="font-semibold text-[12.5px] flex-1 min-w-0 truncate">{t(g.label)}</span>
                {diff > 0 && <span className="chip bg-violet/10 text-violet">{diff} {t('changed')}</span>}
                <span className="text-[11.5px] text-muted tnum shrink-0">{on}/{g.items.length}</span>
              </button>
              {isOpen && (
                <ul>
                  {g.items.map((i) => {
                    const st = stateOf(i.key);
                    return (
                      <li key={i.key} className="flex items-center gap-2.5 px-3 py-1.5 min-h-[40px]">
                        <input id={`perm-${i.key}`} type="checkbox" className="w-4 h-4 accent-[rgb(var(--violet))] shrink-0" checked={has(i.key)} disabled={disabled} onChange={(e) => set(i.key, e.target.checked)} />
                        <label htmlFor={`perm-${i.key}`} className="flex-1 min-w-0 text-[12.75px] cursor-pointer">
                          <span className="block truncate">{t(i.label)}</span>
                          <span className="block text-[10.5px] text-faint font-mono truncate">{i.key}</span>
                        </label>
                        <span className={cls('chip shrink-0', st === 'extra' ? 'bg-ok/10 text-ok' : st === 'denied' ? 'bg-bad/10 text-bad' : 'bg-surface2 text-muted border border-line')}>
                          {st === 'extra' ? t('Granted') : st === 'denied' ? t('Removed') : def.has(i.key) ? t('Role') : t('Off')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11.5px] text-muted">{t('“Role” follows the role’s default menu. “Granted” adds a screen for this person only; “Removed” hides a role screen from them.')}</p>
    </div>
  );
}
