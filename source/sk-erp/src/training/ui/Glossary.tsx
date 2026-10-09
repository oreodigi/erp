// ERP glossary: searchable list of transport and ERP words with the screens where they appear.
import React, { useMemo, useState } from 'react';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { GLOSSARY, SCREEN_BY_ID } from '../registry';
import { MODULES, moduleTitle } from '../modules';
import { openScreen, ModuleIcon } from './common';
import { Search, X, ExternalLink, BookA } from 'lucide-react';

export function Glossary({ allowed }: { allowed: Set<string> }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('');
  const mods = useMemo(() => MODULES.filter((m) => GLOSSARY.some((g) => g.module === m.id)), []);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return GLOSSARY.filter((g) => (!mod || g.module === mod) && (!s || g.term.toLowerCase().includes(s) || g.meaning.toLowerCase().includes(s)))
      .sort((a, b) => (s ? Number(!a.term.toLowerCase().includes(s)) - Number(!b.term.toLowerCase().includes(s)) : 0) || a.term.localeCompare(b.term));
  }, [q, mod]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input type="search" className="input !h-11 !pl-10 !pr-10 w-full text-[14.5px]" placeholder={t('Search a word, e.g. POD, LR, rake')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search the glossary')} />
        {q && <button className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2" aria-label={t('Clear search')} onClick={() => setQ('')}><X size={15} /></button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="group" aria-label={t('Filter by module')}>
        <button className={cls('chip !h-8 !px-3 shrink-0 border', !mod ? 'bg-violet text-white border-violet' : 'bg-surface border-line text-muted')} aria-pressed={!mod} onClick={() => setMod('')}>{t('All')} · {GLOSSARY.length}</button>
        {mods.map((m) => <button key={m.id} className={cls('chip !h-8 !px-3 shrink-0 border', mod === m.id ? 'bg-violet text-white border-violet' : 'bg-surface border-line text-muted')} aria-pressed={mod === m.id} onClick={() => setMod(mod === m.id ? '' : m.id)}>{m.title}</button>)}
      </div>
      <div className="text-[12.5px] text-muted" aria-live="polite">{t('{n} words', { n: list.length })}</div>
      {list.length === 0 ? (
        <div className="card p-8 text-center"><BookA size={22} className="text-violet mx-auto mb-2" /><div className="font-semibold">{t('No word found')}</div><div className="text-[13px] text-muted">{t('Try a shorter word.')}</div></div>
      ) : (
        <dl className="grid md:grid-cols-2 gap-2.5">
          {list.map((g) => (
            <div key={g.term} className="card p-3.5 min-w-0">
              <dt className="font-semibold text-[14.5px] flex items-start gap-2"><span className="flex-1">{g.term}</span><span className="chip bg-surface2 text-muted border border-line shrink-0 max-w-[45%] truncate"><ModuleIcon module={g.module} size={11} />{moduleTitle(g.module)}</span></dt>
              <dd className="text-[13.5px] text-muted mt-1 leading-relaxed">{g.meaning}</dd>
              {g.screens?.some((s) => allowed.has(s)) && (
                <dd className="flex flex-wrap gap-1.5 mt-2">
                  {g.screens.filter((s) => allowed.has(s)).slice(0, 4).map((s) => <button key={s} className="chip !h-7 bg-violet/10 text-violet hover:bg-violet/15" onClick={() => openScreen(s)}><ExternalLink size={11} />{SCREEN_BY_ID.get(s)?.title || s}</button>)}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
