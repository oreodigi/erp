// Practice exercise detail: what to do, what the ERP should show, and the result of each step.
// Practice always runs on sample data kept on this device; company records are never touched.
import React from 'react';
import { useUI, useStore } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { useTraining } from '../store';
import { usePractice, type StepState } from '../practice';
import { EXERCISE_BY_ID } from '../registry';
import { exercisePassed, recKey } from '../progress';
import { moduleTitle } from '../modules';
import type { Curriculum } from '../curriculum';
import { Sheet, closeItem, openScreen, ModuleIcon, ReqBadge } from './common';
import { ShieldCheck, Play, ClipboardCheck, Flag, RotateCcw, Database, ExternalLink, CheckCircle2, AlertCircle, Clock, Square } from 'lucide-react';

/** Task → Expected → Your action → Pass / Needs correction, as stacked cards (no wide tables). */
export function StepResults({ steps, current, compact }: { steps: (StepState | { id: string; task: string; expected: string; screen: string; result: { ok: boolean; found: string } | null })[]; current?: number; compact?: boolean }) {
  const t = useT();
  return (
    <ol className="grid gap-2">
      {steps.map((s, k) => {
        const r = s.result;
        return (
          <li key={s.id} className={cls('rounded-xl border p-3 min-w-0', r?.ok ? 'border-ok/30 bg-ok/[.04]' : r ? 'border-bad/30 bg-bad/[.04]' : k === current ? 'border-violet/40 bg-violet/[.04]' : 'border-line bg-surface')}>
            <div className="flex items-start gap-2.5">
              <span className={cls('w-6 h-6 rounded-full grid place-items-center text-[11.5px] font-bold shrink-0 mt-px', r?.ok ? 'bg-ok text-white' : r ? 'bg-bad text-white' : 'bg-surface2 text-muted border border-line')}>{r?.ok ? '✓' : k + 1}</span>
              <div className="min-w-0 flex-1">
                <div className={cls('font-semibold leading-snug', compact ? 'text-[13px]' : 'text-[14px]')}>{s.task}</div>
                {!compact && <div className="text-[12.5px] mt-1"><span className="text-muted">{t('Expected')}: </span>{s.expected}</div>}
                {r && (
                  <div className="text-[12.5px] mt-1"><span className="text-muted">{t('Your action')}: </span>{r.found || '–'}</div>
                )}
              </div>
              {r && <span className={cls('chip shrink-0', r.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad')}>{r.ok ? t('Pass') : t('Needs correction')}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PracticeExercise({ id, curriculum }: { id: string; curriculum: Curriculum }) {
  const t = useT();
  const ex = EXERCISE_BY_ID.get(id);
  const session = usePractice((s) => s.session);
  const source = useStore((s) => s.source);
  const rec = useTraining((s) => s.records[recKey('exercise', id)]);
  const records = useTraining((s) => s.records);
  if (!ex) return <Sheet title={t('Exercise not found')} onClose={closeItem}><p className="p-5 text-muted">{t('This exercise is not available.')}</p></Sheet>;
  const active = session?.exerciseId === id;
  const practising = source !== 'legacy';
  const passed = exercisePassed(records, id);
  const required = curriculum.required.exercises.includes(id);
  const lastSteps = (rec?.detail?.steps || []) as { id: string; ok: boolean; found: string }[];
  const steps = active ? session!.steps : ex.steps.map((s) => { const l = lastSteps.find((x) => x.id === s.id); return { id: s.id, task: s.task, expected: s.expected, screen: s.screen, result: l && rec?.status !== 'started' ? { ok: l.ok, found: l.found } : null }; });
  const cur = active ? Math.max(0, session!.steps.findIndex((s) => !s.result?.ok)) : -1;
  const blocked = ex.steps.some((s) => !curriculum.allowed.has(s.screen));
  const ask = useUI.getState().ask;
  const toast = useUI.getState().toast;

  const start = () => usePractice.getState().start(id);
  const check = () => { const r = usePractice.getState().check(); toast(r.passed ? 'All steps look right' : 'Some steps need correction', r.passed ? 'ok' : 'warn'); };
  const finish = async () => { const ok = await usePractice.getState().finish(); toast(ok ? 'Exercise passed!' : 'Not passed yet', ok ? 'ok' : 'warn', ok ? undefined : 'Fix the steps marked "Needs correction" and finish again.'); };
  const reset = () => ask({ title: 'Reset practice data?', body: 'All practice records go back to the original sample data. Company data is not affected.', confirmLabel: 'Reset', tone: 'bad', onConfirm: () => void usePractice.getState().resetData().then(() => toast('Practice data reset', 'ok')) });
  const backToCompany = () => ask({ title: 'Back to company data?', body: active ? 'This stops the exercise. Your practice records stay on this device.' : 'You will leave practice data and see real company records again.', confirmLabel: 'Back to company data', onConfirm: () => void usePractice.getState().exit().then(() => toast('Back on company data', 'ok')) });

  return (
    <Sheet onClose={closeItem} width="sm:max-w-3xl"
      eyebrow={<><ModuleIcon module={ex.module} size={13} className="text-violet" />{moduleTitle(ex.module)}<span aria-hidden>·</span><Clock size={12} />{t('{n} min', { n: ex.minutes })}<span aria-hidden>·</span>{t('{n} steps', { n: ex.steps.length })}</>}
      title={<span className="flex items-center gap-2 flex-wrap">{ex.title}{passed && <span className="chip bg-ok/10 text-ok"><CheckCircle2 size={12} />{t('Passed')}</span>}{!passed && rec?.status === 'failed' && <span className="chip bg-warn/[.12] text-warn">{t('Not passed yet')}</span>}</span>}
      footer={
        <div className="flex flex-wrap gap-2">
          {!active && <button className="btn-primary h-11 flex-1 min-w-[9rem]" disabled={blocked} onClick={start}><Play size={16} />{passed ? t('Practise again') : rec ? t('Start again') : t('Start')}</button>}
          {active && <>
            <button className="btn-ghost h-11 flex-1 min-w-[8rem]" onClick={() => openScreen(session!.steps[cur]?.screen || ex.steps[0].screen)}><ExternalLink size={15} />{t('Open screen')}</button>
            <button className="btn-ghost h-11 flex-1 min-w-[8rem]" onClick={check}><ClipboardCheck size={16} />{t('Check my work')}</button>
            <button className="btn-primary h-11 flex-1 min-w-[8rem]" onClick={finish}><Flag size={16} />{t('Finish')}</button>
          </>}
        </div>
      }>
      <div className="px-4 sm:px-6 py-5 grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap items-center gap-2"><ReqBadge required={required} />{rec?.score != null && <span className="text-[12.5px] text-muted">{t('Last score {s}%', { s: Math.round(Number(rec.score)) })}</span>}</div>
        <p className="text-[14.5px] leading-relaxed">{ex.summary}</p>
        <div className="rounded-xl border border-ok/30 bg-ok/[.06] p-3.5 flex gap-3">
          <ShieldCheck size={20} className="text-ok shrink-0 mt-0.5" />
          <div className="text-[13.5px]"><div className="font-semibold">{t('Safe practice')}</div><p className="text-muted mt-0.5">{t('Practice uses sample data kept on this device. It never changes company records.')}</p></div>
        </div>
        {blocked && <div className="rounded-xl border border-warn/40 bg-warn/[.08] p-3 text-[13px] flex gap-2"><AlertCircle size={17} className="text-warn shrink-0" />{t('Your role cannot open every screen in this exercise.')}</div>}
        {active && <div className="rounded-xl border border-violet/30 bg-violet/[.05] p-3 text-[13px] flex gap-2"><Play size={16} className="text-violet shrink-0 mt-0.5" />{t('This exercise is running. Do the steps on the ERP screens, then press Check my work.')}</div>}
        <section>
          <h3 className="font-semibold text-[14.5px] mb-2">{t('Steps')}</h3>
          <StepResults steps={steps} current={cur} />
        </section>
        <div className="flex flex-wrap gap-2 pt-1">
          {active && <button className="btn-subtle h-10" onClick={() => { usePractice.getState().abandon(); toast('Exercise stopped', 'info'); }}><Square size={14} />{t('Stop exercise')}</button>}
          {practising && <button className="btn-subtle h-10" onClick={reset}><RotateCcw size={15} />{t('Reset practice data')}</button>}
          {practising && <button className="btn-subtle h-10" onClick={backToCompany}><Database size={15} />{t('Back to company data')}</button>}
        </div>
      </div>
    </Sheet>
  );
}
