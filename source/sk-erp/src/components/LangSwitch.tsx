// Language picker: a compact header button and a large three-way chooser (sign-in, welcome, help).
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../store/store';
import { LANGS, Lang } from '../lib/i18n';
import { useT } from '../lib/useT';
import { Languages, Check } from 'lucide-react';
import { cls } from '../lib/util';

export function LangButton() {
  const lang = useUI((s) => s.lang);
  const set = useUI((s) => s.set);
  const t = useT();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    const close = (e: any) => { if (!(e.target as HTMLElement).closest?.('[data-lang-pop]') && e.target !== btn.current && !btn.current?.contains(e.target)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', close); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  const cur = LANGS.find((l) => l.key === lang) || LANGS[0];
  return (
    <>
      <button ref={btn} data-tour="lang" className="h-9 px-2.5 rounded-lg border border-line inline-flex items-center gap-1.5 text-[13px] font-semibold hover:bg-surface2" aria-haspopup="menu" aria-expanded={open} aria-label={t('Language') + ': ' + cur.english} title={t('Language')} onClick={() => setOpen(!open)}>
        <Languages size={16} className="text-violet" /><span>{cur.short}</span>
      </button>
      {open && createPortal(
        <div data-lang-pop role="menu" className="fixed z-[90] card shadow-pop p-1.5 w-48 animate-in" style={{ top: pos.top, right: pos.right }}>
          <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-muted">{t('Screen language')}</div>
          {LANGS.map((l) => (
            <button key={l.key} role="menuitemradio" aria-checked={lang === l.key} className={cls('w-full flex items-center gap-2 px-2.5 h-10 rounded-lg text-left text-[14px]', lang === l.key ? 'bg-violet/10 text-violet font-semibold' : 'hover:bg-surface2')} onClick={() => { set({ lang: l.key } as any); setOpen(false); }}>
              <span className="flex-1">{l.label}</span>{l.key !== 'en' && <span className="text-[11.5px] text-muted">{l.english}</span>}{lang === l.key && <Check size={15} />}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}

export function LangChooser({ className = '' }: { className?: string }) {
  const lang = useUI((s) => s.lang);
  const set = useUI((s) => s.set);
  return (
    <div className={cls('grid grid-cols-3 gap-2', className)} role="radiogroup" aria-label="Language / भाषा">
      {LANGS.map((l) => (
        <button key={l.key} type="button" role="radio" aria-checked={lang === l.key} onClick={() => set({ lang: l.key as Lang } as any)}
          className={cls('h-12 rounded-xl border text-[15px] font-semibold transition', lang === l.key ? 'border-violet bg-violet/10 text-violet' : 'border-line hover:bg-surface2')}>{l.label}</button>
      ))}
    </div>
  );
}
