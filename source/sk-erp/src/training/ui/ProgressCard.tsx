// Academy header: who the learner is, readiness status, completion and readiness rings, key counts,
// and the "Recommended next" card.
import React from 'react';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls, ago } from '../../lib/util';
import { StatusBadge, Avatar } from '../../components/ui';
import { STATUS_TONE, type Progress } from '../progress';
import { ROLE_LABEL } from '../modules';
import { useTraining } from '../store';
import type { Curriculum } from '../curriculum';
import { Ring, openItem } from './common';
import { Flame, BookOpen, FlaskConical, ListChecks, Award, Footprints, Route, ArrowRight, PartyPopper, CloudOff, MonitorPlay } from 'lucide-react';

/** Open whatever progress.next points to. */
export function openNext(next: NonNullable<Progress['next']>) {
  const ui = useUI.getState();
  if (next.kind === 'lesson') openItem('lesson', next.id);
  else if (next.kind === 'exercise') openItem('exercise', next.id);
  else if (next.kind === 'workflow') openItem('workflow', next.id);
  else if (next.kind === 'quiz' || next.kind === 'final') openItem('quiz', next.id);
  else if (next.kind === 'tour') { ui.nav(next.id); ui.set({ help: true }); ui.toast('Screen tour', 'info', 'Open the help panel on this screen and start its tour.'); }
}

const toneRing: Record<string, string> = { muted: 'muted', info: 'info', violet: 'violet', warn: 'warn', ok: 'ok' };

export function ProgressCard({ progress, curriculum, user, role }: { progress: Progress; curriculum: Curriculum; user: any; role: any }) {
  const t = useT();
  const mode = useTraining((s) => s.mode);
  const error = useTraining((s) => s.error);
  const quizzes = useTraining((s) => s.quizzes);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || t('there');
  const roleName = ROLE_LABEL[role?.code] || role?.name || '';
  const tone = STATUS_TONE[progress.status];
  const finalQ = curriculum.required.final ? quizzes[curriculum.required.final] : undefined;
  const p = progress;
  const stats: { icon: any; label: string; value: string; sub?: string }[] = [
    { icon: BookOpen, label: t('Lessons'), value: `${p.lessons.done}/${p.lessons.total}`, sub: p.lessons.total - p.lessons.done > 0 ? t('{n} left', { n: p.lessons.total - p.lessons.done }) : t('All done') },
    { icon: Footprints, label: t('Screen tours'), value: `${p.tours.done}/${p.tours.total}` },
    { icon: FlaskConical, label: t('Practice passed'), value: `${p.practice.done}/${p.practice.total}` },
    { icon: Route, label: t('Workflows'), value: `${p.workflows.done}/${p.workflows.total}` },
    { icon: ListChecks, label: t('Quizzes passed'), value: `${p.quizzes.done}/${p.quizzes.total}` },
    { icon: Award, label: t('Final assessment'), value: finalQ ? `${Math.round(finalQ.best)}%` : '–', sub: finalQ ? (finalQ.passed ? t('Passed') : t('Not passed yet')) : curriculum.required.final ? t('Not taken') : t('Not needed') },
  ];
  return (
    <section className="card overflow-hidden" aria-label={t('Your training progress')}>
      {mode === 'local' && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-warn/[.08] border-b border-warn/25 text-[12.5px]"><CloudOff size={15} className="text-warn shrink-0 mt-px" /><span>{t('Progress is saved on this device until the server is available.')}{error ? <span className="text-muted"> {t(error)}</span> : null}</span></div>
      )}
      <div className="p-4 sm:p-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-start gap-3 min-w-0">
          <span className="hidden sm:block"><Avatar name={name} size={48} /></span>
          <div className="min-w-0">
            <div className="eyebrow">{t('Training Academy')}</div>
            <h1 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight leading-tight">{t('Welcome, {name}', { name: user?.firstName || name })}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {roleName && <span className="chip bg-surface2 border border-line text-ink">{t(roleName)}</span>}
              <StatusBadge s={t(p.status)} tone={tone} />
              {p.streak > 0 && <span className="chip bg-warn/[.12] text-warn"><Flame size={12} />{t('{n}-day streak', { n: p.streak })}</span>}
              {p.lastActivity && <span className="text-[12px] text-muted">{t('Last active {when}', { when: ago(p.lastActivity) })}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 justify-around sm:justify-start">
          <div className="flex items-center gap-3"><Ring value={p.readinessPct} tone={toneRing[tone] || 'violet'} label={t('Readiness')} /><div><div className="font-semibold text-[13.5px]">{t('Readiness')}</div><div className="text-[12px] text-muted max-w-[9rem]">{p.status === 'Ready' ? t('You are ready for work') : t('Ready at {n}%', { n: useTraining.getState().settings.thresholds.ready })}</div></div></div>
          <div className="flex items-center gap-3"><Ring value={p.completionPct} tone="info" label={t('Completed')} size={72} stroke={7} /><div><div className="font-semibold text-[13.5px]">{t('Completed')}</div><div className="text-[12px] text-muted">{t('of required items')}</div></div></div>
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px bg-line border-t border-line">
        {stats.map((s, i) => { const I = s.icon; return (
          <div key={i} className="bg-surface px-4 py-3 min-w-0">
            <dt className="text-[11.5px] font-semibold text-muted flex items-center gap-1.5"><I size={13} className="text-violet shrink-0" /><span className="truncate">{s.label}</span></dt>
            <dd className="font-display text-[19px] font-semibold tnum leading-tight mt-0.5">{s.value}</dd>
            {s.sub && <dd className="text-[11.5px] text-muted">{s.sub}</dd>}
          </div>); })}
      </dl>
    </section>
  );
}

const NEXT_ICON: Record<string, any> = { lesson: BookOpen, tour: MonitorPlay, exercise: FlaskConical, workflow: Route, quiz: ListChecks, final: Award };
const NEXT_LABEL: Record<string, string> = { lesson: 'Read the next lesson', tour: 'Take the screen tour', exercise: 'Do the practice exercise', workflow: 'Learn the workflow', quiz: 'Take the module quiz', final: 'Take the final assessment' };

export function NextCard({ next }: { next: Progress['next'] }) {
  const t = useT();
  if (!next) {
    return (
      <section className="card p-4 sm:p-5 flex items-center gap-4 border-ok/40 bg-ok/[.05]">
        <span className="w-12 h-12 rounded-2xl bg-ok/15 text-ok grid place-items-center shrink-0"><PartyPopper size={22} /></span>
        <div className="min-w-0"><div className="font-semibold text-[15px]">{t('You have finished all required training')}</div><div className="text-[13px] text-muted">{t('Keep practising and use the glossary when you need it.')}</div></div>
      </section>
    );
  }
  const I = NEXT_ICON[next.kind] || BookOpen;
  return (
    <section className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-violet/40 bg-gradient-to-r from-violet/[.07] to-transparent" aria-label={t('Recommended next')}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-12 h-12 rounded-2xl bg-violet text-white grid place-items-center shrink-0"><I size={22} /></span>
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold text-violet uppercase tracking-[.06em]">{t('Recommended next')} · {t(NEXT_LABEL[next.kind])}</div>
          <div className="font-semibold text-[16px] leading-snug">{next.title}</div>
        </div>
      </div>
      <button className="btn-primary h-11 px-5 text-[14px] w-full sm:w-auto" onClick={() => openNext(next)}>{t('Start')}<ArrowRight size={16} /></button>
    </section>
  );
}
