// Course building blocks: lesson rows/lists, module course cards and the module detail view.
import React from 'react';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { useTraining } from '../store';
import { lessonDone, prerequisitesMet, recKey, quizPassed } from '../progress';
import { MODULE_BY_ID } from '../modules';
import { QUIZ_BY_ID } from '../registry';
import type { ModuleCourse } from '../curriculum';
import type { Lesson } from '../types';
import { openItem, setTab, ModuleIcon, DoneMark, ReqBadge } from './common';
import { ChevronRight, ChevronLeft, Lock, Headphones, ListChecks, CheckCircle2 } from 'lucide-react';

export function LessonRow({ lesson, required, n }: { lesson: Lesson; required: boolean; n?: number }) {
  const t = useT();
  const records = useTraining((s) => s.records);
  const done = lessonDone(records, lesson.id);
  const started = records[recKey('lesson', lesson.id)]?.status === 'started';
  const locked = !done && !prerequisitesMet(lesson, records);
  return (
    <li>
      <button className="w-full flex items-center gap-3 px-3.5 sm:px-4 py-3 text-left hover:bg-surface2 focus-visible:bg-surface2 transition min-h-[60px]" onClick={() => openItem('lesson', lesson.id)}>
        <DoneMark done={done} started={started} size={22} />
        <span className="min-w-0 flex-1">
          <span className={cls('block font-semibold text-[14px] leading-snug', done && 'text-muted')}>{n !== undefined && <span className="text-faint tnum mr-1.5">{n}.</span>}{lesson.title}</span>
          <span className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[12px] text-muted mt-0.5">
            <span>{t('{n} min', { n: lesson.minutes })}</span>
            {lesson.audio.length > 0 && <span className="inline-flex items-center gap-1"><Headphones size={12} />{t('Audio')}</span>}
            {started && !done && <span className="text-info font-semibold">{t('In progress')}</span>}
            {locked && <span className="inline-flex items-center gap-1 text-warn"><Lock size={12} />{t('Read the earlier lesson first')}</span>}
          </span>
        </span>
        <span className="hidden sm:inline-flex"><ReqBadge required={required} /></span>
        {!required && <span className="sm:hidden chip bg-surface2 text-muted border border-line">{t('Extra')}</span>}
        <ChevronRight size={17} className="text-faint shrink-0" />
      </button>
    </li>
  );
}

export function LessonList({ lessons, required, numbered }: { lessons: Lesson[]; required: Set<string>; numbered?: boolean }) {
  return <ul className="card divide-y divide-line overflow-hidden">{lessons.map((l, i) => <LessonRow key={l.id} lesson={l} required={required.has(l.id)} n={numbered ? i + 1 : undefined} />)}</ul>;
}

export function CourseCard({ course }: { course: ModuleCourse }) {
  const t = useT();
  const records = useTraining((s) => s.records);
  const m = MODULE_BY_ID.get(course.module);
  const done = course.lessons.filter((l) => lessonDone(records, l.id)).length;
  const reqDone = course.required.filter((id) => lessonDone(records, id)).length;
  const isReq = course.required.length > 0;
  const pctDone = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
  const complete = isReq ? reqDone === course.required.length : done === course.lessons.length;
  return (
    <button className="card p-4 text-left flex flex-col gap-3 min-w-0 hover:border-violet/40 hover:-translate-y-px transition" onClick={() => setTab('modules', { module: course.module })}>
      <div className="flex items-start gap-3">
        <span className={cls('w-11 h-11 rounded-xl grid place-items-center shrink-0', complete ? 'bg-ok/10 text-ok' : 'bg-violet/10 text-violet')}><ModuleIcon module={course.module} size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[14.5px] leading-snug">{m?.title || course.module}</div>
          <div className="text-[12.5px] text-muted mt-0.5 line-clamp-2">{m?.summary}</div>
        </div>
        {complete && <CheckCircle2 size={20} className="text-ok shrink-0" aria-label={t('Done')} />}
      </div>
      <div className="mt-auto">
        <div className="flex items-center justify-between text-[12px] mb-1.5 gap-2">
          <span className="text-muted tnum">{t('{d} of {n} lessons', { d: done, n: course.lessons.length })}</span>
          {isReq ? <span className="chip bg-brand/10 text-brand">{t('Required {d}/{n}', { d: reqDone, n: course.required.length })}</span> : <span className="chip bg-surface2 text-muted border border-line">{t('Extra')}</span>}
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden"><div className={cls('h-full rounded-full transition-all', complete ? 'bg-ok' : 'bg-violet')} style={{ width: `${pctDone}%` }} /></div>
      </div>
    </button>
  );
}

export function ModuleDetail({ course, required }: { course: ModuleCourse; required: Set<string> }) {
  const t = useT();
  const quizzes = useTraining((s) => s.quizzes);
  const m = MODULE_BY_ID.get(course.module);
  const quiz = QUIZ_BY_ID.get(`quiz.${course.module}`);
  const concept = course.lessons.filter((l) => !l.id.startsWith('screen:'));
  const screens = course.lessons.filter((l) => l.id.startsWith('screen:'));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <button className="link text-[13px] inline-flex items-center gap-1 w-fit" onClick={() => setTab('modules')}><ChevronLeft size={15} />{t('All modules')}</button>
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 rounded-xl bg-violet/10 text-violet grid place-items-center shrink-0"><ModuleIcon module={course.module} size={22} /></span>
        <div className="min-w-0"><h2 className="font-display text-[20px] font-semibold leading-tight">{m?.title}</h2><p className="text-[13.5px] text-muted mt-0.5">{m?.summary}</p></div>
      </div>
      {concept.length > 0 && <section><h3 className="eyebrow mb-2">{t('Key ideas')}</h3><LessonList lessons={concept} required={required} /></section>}
      {screens.length > 0 && <section><h3 className="eyebrow mb-2">{t('Screens you use')} · {screens.length}</h3><LessonList lessons={screens} required={required} /></section>}
      {quiz && (
        <button className="card p-4 text-left flex items-center gap-3 hover:border-violet/40 transition" onClick={() => openItem('quiz', quiz.id)}>
          <span className="w-10 h-10 rounded-xl bg-violet/10 text-violet grid place-items-center shrink-0"><ListChecks size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-[14px]">{quiz.title}</span><span className="block text-[12.5px] text-muted">{quizPassed(quizzes, quiz.id) ? t('Passed') + ' ✓' : quizzes[quiz.id] ? t('Best {b}% · not passed yet', { b: Math.round(quizzes[quiz.id].best) }) : t('Test what you learned')}</span></span>
          <ChevronRight size={17} className="text-faint" />
        </button>
      )}
    </div>
  );
}
