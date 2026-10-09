// End-to-end workflow trainer: where I am → what I completed → what happens next, step by step.
import React from 'react';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { useTraining } from '../store';
import { WORKFLOW_BY_ID, QUIZ_BY_ID, EXERCISE_BY_ID, LESSON_BY_ID, SCREEN_BY_ID, screenLessonId } from '../registry';
import { lessonDone, isDone, exercisePassed, quizPassed, type RecordMap } from '../progress';
import { moduleTitle } from '../modules';
import type { Curriculum } from '../curriculum';
import type { Workflow, WorkflowStep } from '../types';
import { Sheet, closeItem, openItem, openScreen, ModuleIcon, ReqBadge } from './common';
import { Check, BookOpen, ExternalLink, FlaskConical, ListChecks, CheckCircle2, Info, MapPin } from 'lucide-react';

export const stepDone = (records: RecordMap, s: WorkflowStep) => lessonDone(records, screenLessonId(s.screen)) || (!!s.lesson && lessonDone(records, s.lesson));
export const workflowDone = (records: RecordMap, w: Workflow) => isDone(records, 'workflow', w.id) || (!!w.exercise && exercisePassed(records, w.exercise));

export function WorkflowTrainer({ id, curriculum }: { id: string; curriculum: Curriculum }) {
  const t = useT();
  const w = WORKFLOW_BY_ID.get(id);
  const records = useTraining((s) => s.records);
  const quizzes = useTraining((s) => s.quizzes);
  const record = useTraining((s) => s.record);
  if (!w) return <Sheet title={t('Workflow not found')} onClose={closeItem}><p className="p-5 text-muted">{t('This workflow is not available.')}</p></Sheet>;
  const done = w.steps.map((s) => stepDone(records, s));
  const doneCount = done.filter(Boolean).length;
  const cur = done.findIndex((d) => !d);
  const allDone = cur === -1;
  const complete = workflowDone(records, w);
  const quiz = QUIZ_BY_ID.get('quiz.' + w.id);
  const ex = w.exercise ? EXERCISE_BY_ID.get(w.exercise) : undefined;
  const required = curriculum.required.workflows.includes(w.id);
  const lessonFor = (s: WorkflowStep) => (s.lesson && LESSON_BY_ID.has(s.lesson) ? s.lesson : LESSON_BY_ID.has(screenLessonId(s.screen)) ? screenLessonId(s.screen) : '');

  return (
    <Sheet onClose={closeItem} width="sm:max-w-5xl"
      eyebrow={<><ModuleIcon module={w.module} size={13} className="text-violet" />{moduleTitle(w.module)}<span aria-hidden>·</span>{t('{n} steps', { n: w.steps.length })}</>}
      title={<span className="flex items-center gap-2 flex-wrap">{w.title}{complete && <span className="chip bg-ok/10 text-ok"><CheckCircle2 size={12} />{t('Completed')}</span>}</span>}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted flex-1 min-w-[10rem]">{allDone ? t('All steps learned. Mark the workflow complete.') : t('Learn every step to finish this workflow.')}</span>
          {complete
            ? <span className="inline-flex items-center gap-1.5 text-ok font-semibold text-[14px] h-11"><CheckCircle2 size={18} />{t('Workflow completed')}</span>
            : <button className="btn-primary h-11 px-5" disabled={!allDone} onClick={() => void record('workflow', w.id, 'completed')}><CheckCircle2 size={17} />{t('Mark workflow complete')}</button>}
        </div>
      }>
      <div className="px-4 sm:px-6 py-5 grid grid-cols-[minmax(0,1fr)] gap-5">
        <div className="flex flex-wrap items-center gap-2"><ReqBadge required={required} /><span className="text-[14.5px] leading-relaxed flex-1 min-w-[14rem]">{w.summary}</span></div>

        {/* where am I */}
        <div className="grid sm:grid-cols-3 gap-2">
          <Where label={t('Completed')} value={t('{d} of {n} steps', { d: doneCount, n: w.steps.length })} tone="ok" />
          <Where label={t('You are here')} value={allDone ? t('All done') : w.steps[cur].title} tone="violet" />
          <Where label={t('What happens next')} value={allDone ? (complete ? t('Nothing – finished') : t('Mark complete')) : cur + 1 < w.steps.length ? w.steps[cur + 1].title : t('Finish the workflow')} tone="muted" />
        </div>

        {/* horizontal track on wide screens */}
        <ol className="hidden md:flex items-start overflow-x-auto scrollbar-thin pb-2" aria-label={t('Workflow steps')}>
          {w.steps.map((s, k) => (
            <li key={k} className="flex-1 min-w-[96px] flex flex-col items-center text-center relative">
              {k > 0 && <span className={cls('absolute top-4 right-1/2 w-full h-0.5 -z-0', done[k - 1] ? 'bg-ok' : 'bg-line')} aria-hidden />}
              <a href={`#wf-step-${k}`} onClick={(e) => { e.preventDefault(); document.getElementById(`wf-step-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                className={cls('relative z-[1] w-8 h-8 rounded-full grid place-items-center text-[12.5px] font-bold border-2', done[k] ? 'bg-ok border-ok text-white' : k === cur ? 'bg-violet border-violet text-white ring-4 ring-violet/20' : 'bg-surface border-line text-muted')} aria-label={`${k + 1}. ${s.title}`}>
                {done[k] ? <Check size={15} /> : k + 1}
              </a>
              <span className={cls('mt-1.5 text-[11.5px] leading-tight px-1 line-clamp-2', k === cur ? 'font-semibold text-ink' : 'text-muted')}>{s.title}</span>
            </li>
          ))}
        </ol>

        {/* detailed vertical stepper */}
        <ol className="grid gap-0">
          {w.steps.map((s, k) => {
            const lesson = lessonFor(s);
            const can = curriculum.allowed.has(s.screen);
            const state = done[k] ? 'done' : k === cur ? 'current' : 'todo';
            return (
              <li key={k} id={`wf-step-${k}`} className="flex gap-3 scroll-mt-4">
                <div className="flex flex-col items-center shrink-0">
                  <span className={cls('w-8 h-8 rounded-full grid place-items-center text-[12.5px] font-bold border-2', state === 'done' ? 'bg-ok border-ok text-white' : state === 'current' ? 'bg-violet border-violet text-white' : 'bg-surface border-line text-muted')}>{state === 'done' ? <Check size={15} /> : k + 1}</span>
                  {k < w.steps.length - 1 && <span className={cls('w-0.5 flex-1 min-h-[16px]', state === 'done' ? 'bg-ok' : 'bg-line')} aria-hidden />}
                </div>
                <div className={cls('flex-1 min-w-0 rounded-xl border p-3.5 mb-3', state === 'current' ? 'border-violet/50 bg-violet/[.04]' : 'border-line bg-surface')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[14.5px]">{s.title}</span>
                    {state === 'current' && <span className="chip bg-violet/10 text-violet"><MapPin size={11} />{t('You are here')}</span>}
                    {state === 'done' && <span className="chip bg-ok/10 text-ok">{t('Learned')}</span>}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5">{t('Screen')}: {SCREEN_BY_ID.get(s.screen)?.title || s.screen}</div>
                  <p className="text-[13.5px] mt-1.5 leading-relaxed">{s.does}</p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {lesson && <button className={cls(state === 'current' ? 'btn-primary' : 'btn-ghost', 'h-9')} onClick={() => openItem('lesson', lesson)}><BookOpen size={15} />{t('Learn')}</button>}
                    {can ? <button className="btn-ghost h-9" onClick={() => openScreen(s.screen)}><ExternalLink size={14} />{t('Open screen')}</button> : <span className="chip bg-surface2 text-muted border border-line self-center">{t('No access')}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {w.notes?.length ? (
          <section className="rounded-xl bg-info/[.06] border border-info/20 p-4">
            <h3 className="font-semibold text-[14px] flex items-center gap-1.5 mb-1.5"><Info size={15} className="text-info" />{t('Good to know')}</h3>
            <ul className="grid gap-1.5">{w.notes.map((n, k) => <li key={k} className="flex gap-2 text-[13.5px] leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-info mt-2 shrink-0" />{n}</li>)}</ul>
          </section>
        ) : null}

        {(ex || quiz) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {ex && (
              <button className="card p-4 text-left hover:border-violet/40 transition flex gap-3" onClick={() => openItem('exercise', ex.id)}>
                <span className="w-10 h-10 rounded-xl bg-ok/10 text-ok grid place-items-center shrink-0"><FlaskConical size={18} /></span>
                <span className="min-w-0"><span className="block text-[11.5px] font-semibold text-muted">{t('Practise this workflow')}</span><span className="block font-semibold text-[14px]">{ex.title}</span><span className="block text-[12px] text-muted">{exercisePassed(records, ex.id) ? t('Passed') + ' ✓' : t('{n} min · safe practice data', { n: ex.minutes })}</span></span>
              </button>
            )}
            {quiz && (
              <button className="card p-4 text-left hover:border-violet/40 transition flex gap-3" onClick={() => openItem('quiz', quiz.id)}>
                <span className="w-10 h-10 rounded-xl bg-violet/10 text-violet grid place-items-center shrink-0"><ListChecks size={18} /></span>
                <span className="min-w-0"><span className="block text-[11.5px] font-semibold text-muted">{t('Workflow check')}</span><span className="block font-semibold text-[14px]">{quiz.title}</span><span className="block text-[12px] text-muted">{quizPassed(quizzes, quiz.id) ? t('Passed') + ' ✓' : t('Optional')}</span></span>
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Where({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'violet' | 'muted' }) {
  return (
    <div className={cls('rounded-xl border p-3 min-w-0', tone === 'ok' ? 'border-ok/25 bg-ok/[.05]' : tone === 'violet' ? 'border-violet/30 bg-violet/[.05]' : 'border-line bg-surface')}>
      <div className={cls('text-[11.5px] font-semibold', tone === 'ok' ? 'text-ok' : tone === 'violet' ? 'text-violet' : 'text-muted')}>{label}</div>
      <div className="font-semibold text-[14px] mt-0.5 leading-snug">{value}</div>
    </div>
  );
}
