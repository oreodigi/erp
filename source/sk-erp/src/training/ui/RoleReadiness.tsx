// Role readiness: the five kinds of evidence behind the readiness %, and what is left before "Ready".
import React from 'react';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { useTraining } from '../store';
import type { Progress } from '../progress';
import { setTab } from './common';
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

export function RoleReadiness({ progress }: { progress: Progress }) {
  const t = useT();
  const settings = useTraining((s) => s.settings);
  const w = settings.weights;
  const rows: { key: string; label: string; part: Progress['lessons']; weight: number; tab: string }[] = [
    { key: 'lessons', label: t('Required lessons'), part: progress.lessons, weight: w.lessons, tab: 'start' },
    { key: 'tours', label: t('Screen tours'), part: progress.tours, weight: w.tours, tab: 'daily' },
    { key: 'practice', label: t('Practice exercises'), part: progress.practice, weight: w.practice, tab: 'practice' },
    { key: 'quiz', label: t('Quizzes and final assessment'), part: progress.quizzes, weight: w.quiz, tab: 'assess' },
    { key: 'workflow', label: t('Workflows'), part: progress.workflows, weight: w.workflow, tab: 'workflows' },
  ];
  const ready = progress.status === 'Ready';
  return (
    <section className="card">
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[14px]">{ready ? t('You are Ready') : t('What’s left before you’re Ready')}</h3>
        <span className="text-[12px] text-muted tnum">{t('Readiness {n}%', { n: Math.round(progress.readinessPct) })}</span>
      </header>
      <div className="p-4 grid gap-4">
        {ready ? (
          <p className="flex items-center gap-2 text-[13.5px] text-ok font-semibold"><CheckCircle2 size={18} />{t('All readiness checks are met. Keep your skills fresh with practice.')}</p>
        ) : progress.blockers.length > 0 && (
          <ul className="grid gap-2">
            {progress.blockers.map((b, i) => <li key={i} className="flex gap-2 text-[13.5px] leading-snug"><AlertCircle size={16} className="text-warn shrink-0 mt-0.5" />{t(b)}</li>)}
          </ul>
        )}
        <ul className="grid gap-2.5">
          {rows.filter((r) => r.part.total > 0).map((r) => {
            const full = r.part.done >= r.part.total;
            return (
              <li key={r.key}>
                <button className="w-full text-left group" onClick={() => setTab(r.tab)}>
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-semibold group-hover:text-violet flex items-center gap-1.5">{full ? <CheckCircle2 size={14} className="text-ok" /> : null}{r.label}</span>
                    <span className="text-muted tnum text-[12px] shrink-0">{r.part.done}/{r.part.total} · {t('weight {w}%', { w: r.weight })}<ChevronRight size={13} className="inline -mt-px" /></span>
                  </div>
                  <div className="h-2 rounded-full bg-line overflow-hidden mt-1"><div className={cls('h-full rounded-full transition-all', full ? 'bg-ok' : 'bg-violet')} style={{ width: `${r.part.pct}%` }} /></div>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-[11.5px] text-muted">{t('Ready needs {r}% readiness, at least {p}% of practice passed and the final assessment passed.', { r: settings.thresholds.ready, p: settings.minPracticePct })}</p>
      </div>
    </section>
  );
}
