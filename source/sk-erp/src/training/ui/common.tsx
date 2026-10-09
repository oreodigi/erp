// Shared bits for the Training Academy UI: deep-link helpers, the learner sheet (full screen on phones,
// wide dialog on desktop), progress ring, module icons and small status marks.
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import {
  X, CheckCircle2, Circle, CircleDot, Home, ClipboardList, Boxes, TrainFront, Warehouse, Truck, IndianRupee, Wrench, Users,
  Megaphone, IdCard, Wallet, MessageSquare, BarChart3, Database, Shield, Settings, BookOpen,
} from 'lucide-react';
import { MODULE_BY_ID } from '../modules';
import type { Curriculum } from '../curriculum';
import type { Quiz } from '../types';
import { QUIZ_BY_ID } from '../registry';

// ---------- deep links ----------
export type OverlayKind = 'lesson' | 'quiz' | 'exercise' | 'workflow';
const OVERLAYS: OverlayKind[] = ['lesson', 'quiz', 'exercise', 'workflow'];
const strip = (p: Record<string, any>) => Object.fromEntries(Object.entries(p || {}).filter(([k]) => !OVERLAYS.includes(k as OverlayKind)));

/** Open a lesson / quiz / exercise / workflow in the Academy (from anywhere in the ERP). */
export function openItem(kind: OverlayKind, id: string, extra: Record<string, any> = {}) {
  const ui = useUI.getState();
  if (ui.route !== 'help') ui.nav('help', { ...extra, [kind]: id });
  else ui.set({ params: { ...strip(ui.params), ...extra, [kind]: id } });
}
export function closeItem() { const ui = useUI.getState(); ui.set({ params: strip(ui.params) }); }
/** Switch Academy section (and optionally a module) without touching browser history. */
export function setTab(tab: string, extra: Record<string, any> = {}) {
  const ui = useUI.getState();
  if (ui.route !== 'help') ui.nav('help', { tab, ...extra });
  else ui.set({ params: { tab, ...extra } });
  try { document.getElementById('academy-sections')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch { /* */ }
}
/** Leave the Academy for an ERP screen. */
export function openScreen(route: string) { useUI.getState().nav(route); }

/** Quiz lookup that also knows the learner's final assessment (built per role, not in the registry). */
export const quizFor = (c: Curriculum, id: string): Quiz | undefined => (id === c.final.id ? c.final : QUIZ_BY_ID.get(id));

// ---------- icons ----------
const ICONS: Record<string, any> = { Home, ClipboardList, Boxes, TrainFront, Warehouse, Truck, IndianRupee, Wrench, Users, Megaphone, IdCard, Wallet, MessageSquare, BarChart3, Database, Shield, Settings };
export function ModuleIcon({ module, size = 18, className = '' }: { module: string; size?: number; className?: string }) {
  const I = ICONS[MODULE_BY_ID.get(module as any)?.icon || ''] || BookOpen;
  return <I size={size} className={className} aria-hidden />;
}

// ---------- marks ----------
export function DoneMark({ done, started, size = 20 }: { done: boolean; started?: boolean; size?: number }) {
  const t = useT();
  if (done) return <CheckCircle2 size={size} className="text-ok shrink-0" aria-label={t('Done')} />;
  if (started) return <CircleDot size={size} className="text-info shrink-0" aria-label={t('Started')} />;
  return <Circle size={size} className="text-faint shrink-0" aria-label={t('Not done')} />;
}
export function ReqBadge({ required }: { required: boolean }) {
  const t = useT();
  return required ? <span className="chip bg-brand/10 text-brand">{t('Required')}</span> : <span className="chip bg-surface2 text-muted border border-line">{t('Extra')}</span>;
}

const TONE_STROKE: Record<string, string> = { violet: 'text-violet', ok: 'text-ok', warn: 'text-warn', info: 'text-info', bad: 'text-bad', muted: 'text-faint', brand: 'text-brand' };
export function Ring({ value, size = 84, stroke = 8, tone = 'violet', children, label }: { value: number; size?: number; stroke?: number; tone?: string; children?: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" stroke="currentColor" style={{ color: 'rgb(var(--line))' }} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke="currentColor" className={cls('transition-all duration-500', TONE_STROKE[tone] || 'text-violet')} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">{children ?? <span className="font-display font-semibold tnum text-[18px]">{Math.round(v)}%</span>}</div>
    </div>
  );
}

// ---------- sheet ----------
/** Learner sheet: full screen on phones, a wide dialog on tablets/desktop. */
export function Sheet({ title, eyebrow, onClose, children, footer, headerExtra, z = 'z-[55]', width = 'sm:max-w-4xl', label }: { title: React.ReactNode; eyebrow?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; headerExtra?: React.ReactNode; z?: string; width?: string; label?: string }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !useUI.getState().confirm) closeRef.current(); };
    window.addEventListener('keydown', k);
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => { window.removeEventListener('keydown', k); try { prev?.focus?.(); } catch { /* */ } };
  }, []);
  return createPortal(
    <div className={cls('fixed inset-0 flex items-stretch sm:items-center justify-center sm:p-4', z)} role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : undefined)}>
      <div className="absolute inset-0 bg-[rgb(var(--side)/.5)] backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div ref={box} tabIndex={-1} className={cls('relative w-full h-full sm:h-auto sm:max-h-[92vh] bg-bg sm:rounded-xl shadow-pop flex flex-col outline-none animate-up sm:animate-in overflow-hidden', width)}>
        <header className="bg-surface border-b border-line px-4 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:pt-3.5 pb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="text-[11.5px] font-semibold text-muted mb-0.5 flex items-center gap-1.5 flex-wrap">{eyebrow}</div>}
            <h2 className="font-display text-[18px] sm:text-[20px] font-semibold leading-tight">{title}</h2>
          </div>
          {headerExtra}
          <button onClick={onClose} className="btn-icon !h-10 !w-10 -mr-1" aria-label={t('Close')}><X size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">{children}</div>
        {footer && <footer className="bg-surface border-t border-line px-3 sm:px-5 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] sm:pb-2.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Arrow-key movement inside a radiogroup of buttons. */
export function radioKeys(e: React.KeyboardEvent<HTMLElement>) {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const n = items[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
  n.focus(); n.click();
}

export const pct = (n: number) => `${Math.round(n || 0)}%`;
