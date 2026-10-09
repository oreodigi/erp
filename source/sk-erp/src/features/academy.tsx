// Training Academy (route 'help'): the learner's role curriculum, progress and readiness, with lessons, workflows,
// practice exercises, quizzes, glossary and help settings. Items open as sheets via deep-link params
// (e.g. nav('help', { tab: 'modules' }), { lesson }, { quiz }, { exercise }, { workflow }).
import React, { useMemo } from 'react';
import { useUI, useStore } from '../store/store';
import { useT } from '../lib/useT';
import { cls, ago } from '../lib/util';
import { Toggle } from '../components/ui';
import { LangChooser } from '../components/LangSwitch';
import { ListenButton } from '../components/VoicePlayer';
import { stop, setRate, hindiVoice, useVoice } from '../lib/voice';
import { LESSONS as AUDIO_LESSONS } from '../lib/audio-scripts';
import { useLearner } from '../training/useLearner';
import { useTraining } from '../training/store';
import { usePractice } from '../training/practice';
import { SECTION_TITLES, drawSize, type Curriculum, type SectionKey } from '../training/curriculum';
import { isDone, lessonDone, exercisePassed, quizPassed, recKey, type Progress } from '../training/progress';
import { LESSON_BY_ID, EXERCISE_BY_ID, WORKFLOW_BY_ID, SCREEN_BY_ID } from '../training/registry';
import type { Exercise, Quiz, TrainingRecord, Workflow } from '../training/types';
import { ProgressCard, NextCard } from '../training/ui/ProgressCard';
import { RoleReadiness } from '../training/ui/RoleReadiness';
import { CourseCard, LessonList, ModuleDetail } from '../training/ui/CourseCard';
import { LessonViewer } from '../training/ui/LessonViewer';
import { WorkflowTrainer, stepDone, workflowDone } from '../training/ui/WorkflowTrainer';
import { QuizPlayer } from '../training/ui/QuizPlayer';
import { PracticeExercise } from '../training/ui/PracticeExercise';
import { Glossary } from '../training/ui/Glossary';
import { openItem, setTab, openScreen, DoneMark, ReqBadge, ModuleIcon } from '../training/ui/common';
import {
  LayoutDashboard, Rocket, UserRound, CalendarCheck, Library, Route, FlaskConical, ListChecks, BookA, Briefcase, Settings2,
  ChevronRight, CheckCircle2, Circle, PlayCircle, Database, RotateCcw, Headphones, Award, MonitorPlay, History, Target,
  PackagePlus, Inbox, Receipt, IndianRupee, AlertTriangle, TrainFront, Wrench, Search, Lightbulb, ShieldCheck, Lock,
} from 'lucide-react';

type Tab = 'overview' | SectionKey | 'help';
const TAB_ICON: Record<Tab, any> = { overview: LayoutDashboard, start: Rocket, role: UserRound, daily: CalendarCheck, modules: Library, workflows: Route, practice: FlaskConical, assess: ListChecks, glossary: BookA, manager: Briefcase, help: Settings2 };

export function Academy() {
  const t = useT();
  const { curriculum, progress, role, user } = useLearner();
  const params = useUI((s) => s.params) || {};
  const records = useTraining((s) => s.records);
  const quizzes = useTraining((s) => s.quizzes);
  const c = curriculum;
  const S = c.sections;
  const reqLessons = useMemo(() => new Set(c.required.lessons), [c]);

  // section list in curriculum order; empty sections are left out
  const tabs = useMemo(() => {
    const doneL = (ls: { id: string }[]) => ls.filter((l) => lessonDone(records, l.id)).length;
    const list: { key: Tab; label: string; done?: number; total?: number }[] = [{ key: 'overview', label: 'Overview' }];
    list.push({ key: 'start', label: SECTION_TITLES.start, done: doneL(S.start), total: S.start.length });
    if (S.role.length) list.push({ key: 'role', label: SECTION_TITLES.role, done: doneL(S.role), total: S.role.length });
    if (S.daily.length || c.required.tours.length) list.push({ key: 'daily', label: SECTION_TITLES.daily, done: doneL(S.daily) + c.required.tours.filter((x) => isDone(records, 'tour', x)).length, total: S.daily.length + c.required.tours.length });
    const allModLessons = S.modules.flatMap((m) => m.lessons);
    list.push({ key: 'modules', label: SECTION_TITLES.modules, done: doneL(allModLessons), total: allModLessons.length });
    if (S.workflows.length) list.push({ key: 'workflows', label: SECTION_TITLES.workflows, done: S.workflows.filter((w) => workflowDone(records, w)).length, total: S.workflows.length });
    list.push({ key: 'practice', label: SECTION_TITLES.practice, done: S.practice.filter((e) => exercisePassed(records, e.id)).length, total: S.practice.length });
    if (S.assess.length) list.push({ key: 'assess', label: SECTION_TITLES.assess, done: S.assess.filter((q) => quizPassed(quizzes, q.id)).length, total: S.assess.length });
    list.push({ key: 'glossary', label: SECTION_TITLES.glossary });
    if (S.manager.length) list.push({ key: 'manager', label: SECTION_TITLES.manager, done: doneL(S.manager), total: S.manager.length });
    list.push({ key: 'help', label: 'Help & settings' });
    return list;
  }, [c, records, quizzes]);

  const tab: Tab = tabs.some((x) => x.key === params.tab) ? params.tab : 'overview';
  const course = tab === 'modules' && params.module ? S.modules.find((m) => m.module === params.module) : undefined;
  const cur = tabs.find((x) => x.key === tab)!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ProgressCard progress={progress} curriculum={c} user={user} role={role} />
      <NextCard next={progress.next} />

      <div id="academy-sections" className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[232px_minmax(0,1fr)] gap-4 items-start scroll-mt-4">
        {/* section nav: horizontal pills on phones/tablets, sticky list on desktop */}
        <nav aria-label={t('Academy sections')} className="lg:sticky lg:top-4 min-w-0">
          <div className="flex lg:flex-col gap-1.5 lg:gap-0.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 lg:pb-0 lg:card lg:p-1.5" role="tablist">
            {tabs.map((x) => {
              const I = TAB_ICON[x.key]; const on = x.key === tab;
              const full = x.total !== undefined && x.total > 0 && x.done === x.total;
              return (
                <button key={x.key} role="tab" aria-selected={on} onClick={() => setTab(x.key)}
                  className={cls('shrink-0 inline-flex items-center gap-2 rounded-full lg:rounded-lg h-10 px-3.5 lg:px-2.5 text-[13px] font-semibold transition whitespace-nowrap border lg:border-0',
                    on ? 'bg-violet text-white border-violet lg:bg-violet/10 lg:text-violet' : 'bg-surface border-line text-muted hover:text-ink lg:bg-transparent lg:hover:bg-surface2')}>
                  <I size={16} className="shrink-0" />
                  <span className="lg:flex-1 lg:text-left lg:truncate">{t(x.label)}</span>
                  {x.total !== undefined && x.total > 0 && (full
                    ? <CheckCircle2 size={14} className={cls('shrink-0', on ? 'text-white lg:text-ok' : 'text-ok')} />
                    : <span className={cls('text-[11px] tnum shrink-0', on ? 'text-white/80 lg:text-violet' : 'text-faint')}>{x.done}/{x.total}</span>)}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0" role="tabpanel" aria-label={t(cur.label)}>
          {!course && tab !== 'overview' && <SectionHead tab={tab} title={t(cur.label)} c={c} />}
          {tab === 'overview' && <Overview progress={progress} curriculum={c} />}
          {tab === 'start' && <LessonList lessons={S.start} required={reqLessons} numbered />}
          {tab === 'role' && <LessonList lessons={S.role} required={reqLessons} />}
          {tab === 'daily' && <Daily c={c} required={reqLessons} />}
          {tab === 'modules' && (course ? <ModuleDetail course={course} required={reqLessons} /> : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...S.modules].sort((a, b) => Number(b.required.length > 0) - Number(a.required.length > 0)).map((m) => <CourseCard key={m.module} course={m} />)}
            </div>
          ))}
          {tab === 'workflows' && <Workflows c={c} />}
          {tab === 'practice' && <Practice c={c} />}
          {tab === 'assess' && <Assessments c={c} progress={progress} />}
          {tab === 'glossary' && <Glossary allowed={c.allowed} />}
          {tab === 'manager' && <LessonList lessons={S.manager} required={reqLessons} />}
          {tab === 'help' && <HelpSettings curriculum={c} />}
        </div>
      </div>

      {params.lesson && <LessonViewer key={'l' + params.lesson} id={params.lesson} curriculum={c} />}
      {params.workflow && <WorkflowTrainer key={'w' + params.workflow} id={params.workflow} curriculum={c} />}
      {params.quiz && <QuizPlayer key={'q' + params.quiz} id={params.quiz} curriculum={c} />}
      {params.exercise && <PracticeExercise key={'e' + params.exercise} id={params.exercise} curriculum={c} />}
    </div>
  );
}

const SECTION_HELP: Partial<Record<Tab, string>> = {
  start: 'Start here. Short lessons on signing in, the menu, Home and My Work.',
  role: 'What your job looks like in the ERP.',
  daily: 'The screens you use every day, and their screen tours.',
  modules: 'Every area of the ERP you can open. Required lessons are marked.',
  workflows: 'Follow one piece of work from start to finish across screens.',
  practice: 'Do real tasks on safe practice data. The ERP checks your work.',
  assess: 'Quizzes check what you learned. Pass the final assessment to be Ready.',
  glossary: 'Transport and ERP words in plain language.',
  manager: 'Oversight, approvals and settings for managers.',
  help: 'Language, audio, practice mode and onboarding.',
};

function SectionHead({ tab, title, c }: { tab: Tab; title: string; c: Curriculum }) {
  const t = useT();
  return (
    <div className="mb-3">
      <h2 className="font-display text-[19px] sm:text-[21px] font-semibold leading-tight">{title}</h2>
      {SECTION_HELP[tab] && <p className="text-[13px] text-muted mt-0.5">{t(SECTION_HELP[tab]!)}</p>}
    </div>
  );
}

// ---------------- Overview ----------------
function Overview({ progress, curriculum }: { progress: Progress; curriculum: Curriculum }) {
  const t = useT();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-2 gap-4 items-start">
      <RoleReadiness progress={progress} />
      <FirstWeek />
      <Onboarding />
      {progress.weak.length > 0 && (
        <section className="card">
          <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2"><Target size={15} className="text-warn" /><h3 className="font-semibold text-[14px]">{t('Topics to revisit')}</h3></header>
          <ul className="divide-y divide-line">
            {progress.weak.map((w) => (
              <li key={w.screen}><button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2" onClick={() => openItem('lesson', w.lesson)}>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-[13.5px] truncate">{w.title}</span><span className="block text-[12px] text-muted">{t('{n} wrong answers in quizzes', { n: w.misses })}</span></span>
                <span className="text-[12.5px] link shrink-0">{t('Revise')}</span>
              </button></li>
            ))}
          </ul>
        </section>
      )}
      <Recent recent={progress.recent} />
      <PracticeModeCard />
    </div>
  );
}

function titleOf(r: TrainingRecord): { title: string; open?: () => void } {
  const id = r.item_id;
  if (r.kind === 'lesson' || r.kind === 'audio') { const l = LESSON_BY_ID.get(id); if (l) return { title: l.title, open: () => openItem('lesson', id) }; }
  if (r.kind === 'exercise') { const e = EXERCISE_BY_ID.get(id); if (e) return { title: e.title, open: () => openItem('exercise', id) }; }
  if (r.kind === 'workflow') { const w = WORKFLOW_BY_ID.get(id); if (w) return { title: w.title, open: () => openItem('workflow', id) }; }
  if (r.kind === 'tour') return { title: id === 'app-tour' ? 'App tour' : SCREEN_BY_ID.get(id)?.title || id };
  if (r.kind === 'onboarding') return { title: 'Welcome' };
  if (id.startsWith('clip:')) return { title: AUDIO_LESSONS.find((x) => 'clip:' + x.id === id)?.title || id };
  return { title: id };
}
const KIND_LABEL: Record<string, string> = { lesson: 'Lesson', audio: 'Audio', exercise: 'Practice', workflow: 'Workflow', tour: 'Tour', onboarding: 'Onboarding', screen: 'Screen' };
const STATUS_LABEL: Record<string, string> = { started: 'Started', completed: 'Completed', passed: 'Passed', failed: 'Not passed', heard: 'Heard', skipped: 'Skipped', dismissed: 'Dismissed', understood: 'Understood' };

function Recent({ recent }: { recent: TrainingRecord[] }) {
  const t = useT();
  return (
    <section className="card">
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2"><History size={15} className="text-violet" /><h3 className="font-semibold text-[14px]">{t('Recently learned')}</h3></header>
      {recent.length === 0 ? <p className="p-4 text-[13px] text-muted">{t('Nothing yet. Start with the recommended lesson above.')}</p> : (
        <ul className="divide-y divide-line">
          {recent.map((r) => { const x = titleOf(r); const ok = ['completed', 'passed', 'heard', 'understood'].includes(r.status); return (
            <li key={recKey(r.kind, r.item_id)}>
              <button disabled={!x.open} onClick={x.open} className="w-full flex items-center gap-3 px-4 py-2.5 text-left enabled:hover:bg-surface2 disabled:cursor-default">
                {ok ? <CheckCircle2 size={17} className="text-ok shrink-0" /> : r.status === 'failed' ? <AlertTriangle size={17} className="text-warn shrink-0" /> : <Circle size={17} className="text-info shrink-0" />}
                <span className="flex-1 min-w-0"><span className="block font-semibold text-[13.5px] truncate">{x.title}</span><span className="block text-[12px] text-muted">{t(KIND_LABEL[r.kind] || r.kind)} · {t(STATUS_LABEL[r.status] || r.status)}{r.updated_at ? ' · ' + ago(r.updated_at) : ''}</span></span>
              </button>
            </li>); })}
        </ul>
      )}
    </section>
  );
}

function FirstWeek() {
  const t = useT();
  const records = useTraining((s) => s.records);
  const quizzes = useTraining((s) => s.quizzes);
  const all = Object.values(records);
  const items: [string, boolean, () => void][] = [
    ['Read the welcome', !!records[recKey('onboarding', 'welcome')], () => setTab('help')],
    ['Take the 1-minute app tour', isDone(records, 'tour', 'app-tour'), () => { useUI.getState().nav('dashboard'); useUI.getState().set({ tour: 'run' }); }],
    ['Finish your first lesson', all.some((r) => r.kind === 'lesson' && r.status === 'completed'), () => setTab('start')],
    ['Listen to a lesson', all.some((r) => r.kind === 'audio' && r.status === 'heard'), () => setTab('start')],
    ['Take a screen tour', all.some((r) => r.kind === 'tour' && r.item_id !== 'app-tour' && isDone(records, 'tour', r.item_id)), () => setTab('daily')],
    ['Pass a practice exercise', all.some((r) => r.kind === 'exercise' && r.status === 'passed'), () => setTab('practice')],
    ['Pass a quiz', Object.values(quizzes).some((q) => q.passed), () => setTab('assess')],
  ];
  const done = items.filter((x) => x[1]).length;
  return (
    <section className="card">
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center justify-between gap-2"><h3 className="font-semibold text-[14px]">{t('Your first week')}</h3><span className="text-[12px] text-muted tnum">{done}/{items.length}</span></header>
      <div className="h-1.5 bg-surface2"><div className="h-full bg-ok transition-all" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="divide-y divide-line">
        {items.map(([label, ok, go]) => (
          <li key={label}><button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2 min-h-[44px]" onClick={go}>
            {ok ? <CheckCircle2 size={19} className="text-ok shrink-0" /> : <Circle size={19} className="text-faint shrink-0" />}
            <span className={cls('flex-1 text-[13.5px]', ok && 'text-muted line-through')}>{t(label)}</span>
            {!ok && <ChevronRight size={15} className="text-faint" />}
          </button></li>
        ))}
      </ul>
    </section>
  );
}

function Onboarding() {
  const t = useT();
  const records = useTraining((s) => s.records);
  const resetKind = useTraining((s) => s.resetKind);
  const welcome = records[recKey('onboarding', 'welcome')];
  const appTour = isDone(records, 'tour', 'app-tour');
  const tips = Object.values(records).filter((r) => r.kind === 'hint').length;
  const ui = useUI.getState();
  const row = (label: string, value: React.ReactNode) => <div className="flex items-center justify-between gap-2 text-[13.5px] py-1.5"><span className="text-muted">{label}</span><span className="font-semibold text-right">{value}</span></div>;
  const ok = (s: string) => <span className="chip bg-ok/10 text-ok">{t(s)}</span>;
  const no = (s: string) => <span className="chip bg-surface2 text-muted border border-line">{t(s)}</span>;
  return (
    <section className="card">
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2"><Rocket size={15} className="text-violet" /><h3 className="font-semibold text-[14px]">{t('Onboarding')}</h3></header>
      <div className="px-4 py-2 divide-y divide-line">
        {row(t('Welcome'), welcome ? (welcome.status === 'skipped' ? no('Skipped') : ok('Completed')) : no('Not yet'))}
        {row(t('App tour'), appTour ? ok('Completed') : no('Not yet'))}
        {row(t('Page tips closed'), <span className="tnum">{tips}</span>)}
      </div>
      <div className="px-4 pb-4 pt-1 grid sm:grid-cols-2 gap-2">
        <button className="btn-primary h-10" onClick={() => { ui.nav('dashboard'); useUI.getState().set({ tour: 'run' }); }}><PlayCircle size={16} />{t('Replay the 1-minute tour')}</button>
        <button className="btn-ghost h-10" onClick={() => void resetKind('hint').then(() => { useUI.getState().set({ guide: true }); ui.toast('All page tips will show again', 'info'); })}><Lightbulb size={15} />{t('Show all page tips again')}</button>
        <button className="btn-ghost h-10 sm:col-span-2" onClick={() => ui.ask({ title: 'Restart onboarding?', body: 'The welcome screen will show again. Your lessons and quiz results stay.', confirmLabel: 'Restart', onConfirm: () => void resetKind('onboarding').then(() => useUI.getState().set({ tour: null })) })}><RotateCcw size={15} />{t('Restart onboarding')}</button>
      </div>
    </section>
  );
}

function PracticeModeCard() {
  const t = useT();
  const source = useStore((s) => s.source);
  const session = usePractice((s) => s.session);
  const practising = source !== 'legacy';
  const ui = useUI.getState();
  return (
    <section className={cls('card', practising && 'border-ok/40')}>
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2"><FlaskConical size={15} className="text-ok" /><h3 className="font-semibold text-[14px]">{t('Practice mode')}</h3>{practising && <span className="chip bg-ok/10 text-ok ml-auto">{t('On')}</span>}</header>
      <div className="p-4 grid gap-2.5">
        <p className="text-[13px] text-muted flex gap-2"><ShieldCheck size={16} className="text-ok shrink-0 mt-px" />{practising ? t('You are on practice data. Nothing you do here changes company records.') : t('Practice data is kept on this device. Try bookings, PODs and bills safely.')}</p>
        {session && <button className="btn-ghost h-10" onClick={() => openItem('exercise', session.exerciseId)}>{t('Running: {title}', { title: EXERCISE_BY_ID.get(session.exerciseId)?.title || '' })}<ChevronRight size={15} /></button>}
        {!practising
          ? <button className="btn-primary h-11" onClick={() => void usePractice.getState().enter().then(() => ui.toast('Practice data loaded', 'ok', 'Try anything – switch back when done'))}><FlaskConical size={16} />{t('Start practising')}</button>
          : <>
            <button className="btn-primary h-11" onClick={() => ui.ask({ title: 'Back to company data?', body: session ? 'This stops the running exercise.' : 'You will see real company records again.', confirmLabel: 'Back to company data', onConfirm: () => void usePractice.getState().exit().then(() => ui.toast('Back on company data', 'ok')) })}><Database size={16} />{t('Back to real company data')}</button>
            <button className="btn-ghost h-10" onClick={() => ui.ask({ title: 'Reset practice data?', body: 'All practice records go back to the original sample data. Company data is not affected.', confirmLabel: 'Reset', tone: 'bad', onConfirm: () => void usePractice.getState().resetData().then(() => ui.toast('Practice data reset', 'ok')) })}><RotateCcw size={15} />{t('Reset practice data')}</button>
          </>}
      </div>
    </section>
  );
}

// ---------------- Daily work ----------------
function Daily({ c, required }: { c: Curriculum; required: Set<string> }) {
  const t = useT();
  const records = useTraining((s) => s.records);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {c.sections.daily.length > 0 && <LessonList lessons={c.sections.daily} required={required} />}
      {c.required.tours.length > 0 && (
        <section>
          <h3 className="eyebrow mb-2">{t('Screen tours')} · {c.required.tours.filter((x) => isDone(records, 'tour', x)).length}/{c.required.tours.length}</h3>
          <ul className="card divide-y divide-line overflow-hidden">
            {c.required.tours.map((id) => {
              const sc = SCREEN_BY_ID.get(id); const done = isDone(records, 'tour', id);
              return (
                <li key={id} className="flex items-center gap-3 px-3.5 sm:px-4 py-3">
                  <DoneMark done={done} size={22} />
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-[14px]">{sc?.title || id}</span><span className="block text-[12px] text-muted">{t('{n} tour steps', { n: sc?.walkthrough?.length || 0 })}</span></span>
                  <button className="btn-ghost h-9 shrink-0" onClick={() => { useUI.getState().nav(id); useUI.getState().set({ help: true }); }}><MonitorPlay size={15} />{done ? t('Again') : t('Take tour')}</button>
                </li>
              );
            })}
          </ul>
          <p className="text-[12px] text-muted mt-2">{t('The tour opens on the screen itself and points to each part.')}</p>
        </section>
      )}
    </div>
  );
}

// ---------------- Workflows ----------------
function Workflows({ c }: { c: Curriculum }) {
  const t = useT();
  const records = useTraining((s) => s.records);
  const req = new Set(c.required.workflows);
  const list = [...c.sections.workflows].sort((a, b) => Number(req.has(b.id)) - Number(req.has(a.id)));
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {list.map((w: Workflow) => {
        const d = w.steps.filter((s) => stepDone(records, s)).length; const done = workflowDone(records, w);
        return (
          <button key={w.id} className="card p-4 text-left flex flex-col gap-2.5 min-w-0 hover:border-violet/40 transition" onClick={() => openItem('workflow', w.id)}>
            <div className="flex items-start gap-3">
              <span className={cls('w-10 h-10 rounded-xl grid place-items-center shrink-0', done ? 'bg-ok/10 text-ok' : 'bg-violet/10 text-violet')}>{done ? <CheckCircle2 size={19} /> : <Route size={19} />}</span>
              <div className="min-w-0 flex-1"><div className="font-semibold text-[14.5px] leading-snug">{w.title}</div><div className="text-[12.5px] text-muted mt-0.5 line-clamp-2">{w.summary}</div></div>
            </div>
            <div className="flex items-center gap-1" aria-hidden>{w.steps.map((s, k) => <span key={k} className={cls('h-1.5 flex-1 rounded-full', stepDone(records, s) ? 'bg-ok' : 'bg-line')} />)}</div>
            <div className="flex items-center justify-between gap-2 text-[12px]"><span className="text-muted tnum">{t('{d} of {n} steps learned', { d, n: w.steps.length })}</span><ReqBadge required={req.has(w.id)} /></div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Practice ----------------
function ExerciseCard({ e, required }: { e: Exercise; required: boolean }) {
  const t = useT();
  const rec = useTraining((s) => s.records[recKey('exercise', e.id)]);
  const running = usePractice((s) => s.session?.exerciseId === e.id);
  const passed = rec?.status === 'passed';
  return (
    <button className="card p-4 text-left flex flex-col gap-2 min-w-0 hover:border-violet/40 transition" onClick={() => openItem('exercise', e.id)}>
      <div className="flex items-start gap-3">
        <span className={cls('w-10 h-10 rounded-xl grid place-items-center shrink-0', passed ? 'bg-ok/10 text-ok' : 'bg-surface2 text-muted border border-line')}>{passed ? <CheckCircle2 size={19} /> : <ModuleIcon module={e.module} size={18} />}</span>
        <div className="min-w-0 flex-1"><div className="font-semibold text-[14.5px] leading-snug">{e.title}</div><div className="text-[12.5px] text-muted mt-0.5 line-clamp-2">{e.summary}</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] mt-auto">
        <span className="text-muted">{t('{n} min', { n: e.minutes })} · {t('{n} steps', { n: e.steps.length })}</span>
        <span className="flex-1" />
        {running ? <span className="chip bg-violet/10 text-violet">{t('Running')}</span> : passed ? <span className="chip bg-ok/10 text-ok">{t('Passed')}</span> : rec?.status === 'failed' ? <span className="chip bg-warn/[.12] text-warn">{t('Not passed yet')}</span> : rec ? <span className="chip bg-info/10 text-info">{t('Started')}</span> : null}
        <ReqBadge required={required} />
      </div>
    </button>
  );
}

function Practice({ c }: { c: Curriculum }) {
  const t = useT();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PracticeModeCard />
      {c.sections.practice.length > 0 && <section><h3 className="eyebrow mb-2">{t('Required practice')}</h3><div className="grid md:grid-cols-2 gap-3">{c.sections.practice.map((e) => <ExerciseCard key={e.id} e={e} required />)}</div></section>}
      {c.sections.extraPractice.length > 0 && <section><h3 className="eyebrow mb-2">{t('Extra practice')}</h3><div className="grid md:grid-cols-2 gap-3">{c.sections.extraPractice.map((e) => <ExerciseCard key={e.id} e={e} required={false} />)}</div></section>}
      {!c.sections.practice.length && !c.sections.extraPractice.length && <p className="text-[13px] text-muted">{t('No practice exercises for your role yet.')}</p>}
    </div>
  );
}

// ---------------- Assessments ----------------
function QuizCard({ q, required }: { q: Quiz; required: boolean }) {
  const t = useT();
  const s = useTraining((x) => x.quizzes[q.id]);
  return (
    <button className="card p-4 text-left flex items-center gap-3 min-w-0 hover:border-violet/40 transition" onClick={() => openItem('quiz', q.id)}>
      <span className={cls('w-10 h-10 rounded-xl grid place-items-center shrink-0', s?.passed ? 'bg-ok/10 text-ok' : 'bg-violet/10 text-violet')}>{s?.passed ? <CheckCircle2 size={19} /> : q.module ? <ModuleIcon module={q.module} size={18} /> : <ListChecks size={18} />}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[14px] leading-snug">{q.title}</span>
        <span className="block text-[12px] text-muted mt-0.5">{t('{n} questions', { n: drawSize(q) })}{s ? ' · ' + t('Best {b}% · Last {l}% · {a} attempts', { b: Math.round(s.best), l: Math.round(s.last), a: s.attempts }) : ' · ' + t('Not taken')}</span>
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">{s?.passed ? <span className="chip bg-ok/10 text-ok">{t('Passed')}</span> : s ? <span className="chip bg-warn/[.12] text-warn">{t('Retake')}</span> : null}<ReqBadge required={required} /></span>
    </button>
  );
}

function Assessments({ c, progress }: { c: Curriculum; progress: Progress }) {
  const t = useT();
  const quizzes = useTraining((s) => s.quizzes);
  const passPct = useTraining((s) => s.settings.passPct);
  const mod = c.sections.assess.filter((q) => q.kind === 'module');
  const wf = c.sections.assess.filter((q) => q.kind === 'workflow');
  const fin = c.sections.assess.find((q) => q.kind === 'final');
  const req = new Set(c.required.quizzes);
  const reqPassed = c.required.quizzes.filter((id) => quizPassed(quizzes, id)).length;
  const fs = fin ? quizzes[fin.id] : undefined;
  const early = reqPassed < c.required.quizzes.length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {fin && (
        <section className={cls('card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4', fs?.passed ? 'border-ok/40 bg-ok/[.04]' : 'border-brand/30')}>
          <span className={cls('w-14 h-14 rounded-2xl grid place-items-center shrink-0', fs?.passed ? 'bg-ok/15 text-ok' : 'bg-brand/10 text-brand')}><Award size={26} /></span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-[17px]">{t('Final role assessment')}</div>
            <div className="text-[13px] text-muted">{t('{n} questions from your role · pass mark {p}%', { n: drawSize(fin), p: passPct })}</div>
            <div className="text-[12.5px] mt-1">{fs ? t('Best {b}% · Last {l}% · {a} attempts', { b: Math.round(fs.best), l: Math.round(fs.last), a: fs.attempts }) : t('Not taken yet')}</div>
            {early && !fs?.passed && <div className="text-[12.5px] text-warn mt-1 flex items-center gap-1.5"><Lock size={13} />{t('Recommended: pass your module quizzes first ({d} of {n} passed).', { d: reqPassed, n: c.required.quizzes.length })}</div>}
          </div>
          <button className={cls(fs?.passed ? 'btn-ghost' : 'btn-primary', 'h-11 px-5 w-full sm:w-auto')} onClick={() => openItem('quiz', fin.id)}>{fs?.passed ? t('Passed – take again') : fs ? t('Retake') : t('Start assessment')}<ChevronRight size={16} /></button>
        </section>
      )}
      {mod.length > 0 && <section><h3 className="eyebrow mb-2">{t('Module quizzes')} · {t('{d} of {n} required passed', { d: reqPassed, n: c.required.quizzes.length })}</h3><div className="grid md:grid-cols-2 gap-3">{[...mod].sort((a, b) => Number(req.has(b.id)) - Number(req.has(a.id))).map((q) => <QuizCard key={q.id} q={q} required={req.has(q.id)} />)}</div></section>}
      {wf.length > 0 && <section><h3 className="eyebrow mb-2">{t('Workflow checks')} · {t('Optional')}</h3><div className="grid md:grid-cols-2 gap-3">{wf.map((q) => <QuizCard key={q.id} q={q} required={false} />)}</div></section>}
      {progress.finalPassed && <p className="text-[13px] text-ok font-semibold flex items-center gap-2"><CheckCircle2 size={17} />{t('Final assessment passed.')}</p>}
    </div>
  );
}

// ---------------- Help & settings ----------------
const HOWTO = [
  { icon: PackagePlus, title: 'Book a truck (make an LR)', steps: ['Press Create → New booking.', 'Type the customer name – the rest fills from their last booking.', 'Check goods, pieces and freight, then pick a truck.', 'Press “Book & send truck”. Print the LR.'], go: 'book' },
  { icon: Inbox, title: 'Record a POD', steps: ['Open My Work → Collect POD copies.', 'Press “POD received” on the LR (or tick many LRs).', 'Enter the date and any damaged pieces. Save.'], go: 'work' },
  { icon: Receipt, title: 'Make a bill', steps: ['Open My Work → Make bills (or Order Board → Ready to bill).', 'Tick the LRs of one customer.', 'Check GST and press Generate bill.'], go: 'work' },
  { icon: IndianRupee, title: 'Record a payment from a customer', steps: ['Open My Work → Follow up on overdue payments.', 'Press “Payment received” on the bill.', 'Enter amount and TDS. Save.'], go: 'work' },
  { icon: AlertTriangle, title: 'Find what is stuck', steps: ['Open the Order Board.', 'Press “Late only” or “Show only these” on the red banner.', 'Each red card says why it is stuck and who must act.'], go: 'board' },
  { icon: TrainFront, title: 'Send goods by rail', steps: ['In New booking choose Rail and the destination branch.', 'At Jalgaon rail head record goods in (GRN).', 'Load wagons on the rake, dispatch, then make delivery challans at the destination.'], go: 'rail/rakes' },
  { icon: Route, title: 'Close a truck trip', steps: ['Open My Work → Close finished trips.', 'Enter closing date and KM.', 'The log slip and diesel settlement follow.'], go: 'fleet/trip-completion' },
  { icon: Wrench, title: 'Repair a truck (job card)', steps: ['Create → Job card.', 'Add parts from stock and outside services.', 'After approval, finalise when the truck leaves.'], go: 'ws/jobcards' },
  { icon: Search, title: 'Find any LR, truck or customer', steps: ['Press the search box at the top (or Ctrl+K).', 'Type a few letters or digits.', 'Pick the result to open it.'], go: '' },
];

function HelpSettings({ curriculum }: { curriculum: Curriculum }) {
  const t = useT();
  const voice = useUI((s) => s.voice);
  const rate = useUI((s) => s.voiceRate) || 0.95;
  const set = useUI((s) => s.set);
  const records = useTraining((s) => s.records);
  const vName = useVoice((s) => s.voiceName) || hindiVoice()?.name || '';
  const [open, setOpen] = React.useState<number | null>(null);
  const howtos = HOWTO.filter((h) => !h.go || curriculum.allowed.has(h.go) || ['book', 'work', 'board'].includes(h.go));
  const heard = AUDIO_LESSONS.filter((l) => isDone(records, 'audio', 'clip:' + l.id)).length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-2 gap-4 items-start">
      <section className="card">
        <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70"><h3 className="font-semibold text-[14px]">{t('Language')}</h3><div className="text-[11.5px] text-muted">{t('Choose your screen language')}</div></header>
        <div className="p-4"><LangChooser /></div>
      </section>
      <section className="card">
        <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2"><Headphones size={15} className="text-violet" /><h3 className="font-semibold text-[14px]">{t('Audio guide')}</h3></header>
        <div className="p-4 grid gap-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5"><span className="text-[13.5px] font-semibold">{t('Speak tips automatically')}</span><Toggle checked={voice} onChange={(v) => { set({ voice: v } as any); if (!v) stop(); }} label={voice ? t('On') : t('Off')} /></div>
          <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="text-muted">{t('Speed')}</span>
            {[0.8, 0.95, 1.1].map((r) => <button key={r} aria-pressed={Math.abs(rate - r) < 0.01} className={cls('h-9 px-3 rounded-lg border text-[12.5px] font-semibold', Math.abs(rate - r) < 0.01 ? 'border-violet bg-violet/10 text-violet' : 'border-line')} onClick={() => { set({ voiceRate: r } as any); setRate(r); }}>{r === 0.8 ? t('Slow') : r === 0.95 ? t('Normal') : t('Fast')}</button>)}
          </div>
          <p className="text-[12px] text-muted">{vName ? t('Voice: {name}', { name: vName }) : t('No Hindi voice found on this device yet – the text will still show. On Android: Settings → Text-to-speech → Google → install Hindi.')}</p>
          <ListenButton clip={{ id: 'test', title: t('Test voice'), lines: ['नमस्ते! यह SK Translines ERP की आवाज़ है। क्या आपको साफ़ सुनाई दे रहा है?'] }} label={t('Test voice')} className="w-fit" />
        </div>
      </section>
      <Onboarding />
      <PracticeModeCard />
      <section className="card xl:col-span-2">
        <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70"><h3 className="font-semibold text-[14px]">{t('How do I…?')}</h3></header>
        <ul className="divide-y divide-line">
          {howtos.map((h, i) => { const I = h.icon; const o = open === i; return (
            <li key={h.title}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface2" aria-expanded={o} onClick={() => setOpen(o ? null : i)}>
                <span className="w-9 h-9 rounded-lg bg-violet/10 text-violet grid place-items-center shrink-0"><I size={17} /></span>
                <span className="flex-1 font-semibold text-[14px]">{t(h.title)}</span><ChevronRight size={16} className={cls('text-muted transition', o && 'rotate-90')} />
              </button>
              {o && <div className="px-4 pb-4 sm:pl-[64px]">
                <ol className="grid gap-1.5">{h.steps.map((s, k) => <li key={k} className="flex gap-2 text-[13.5px]"><span className="w-5 h-5 rounded-full bg-violet/10 text-violet text-[11px] font-bold grid place-items-center shrink-0">{k + 1}</span>{t(s)}</li>)}</ol>
                {h.go ? <button className="btn-primary h-9 mt-3" onClick={() => openScreen(h.go)}>{t('Do it now')}<ChevronRight size={15} /></button> : <button className="btn-primary h-9 mt-3" onClick={() => set({ palette: true })}>{t('Try search')}<ChevronRight size={15} /></button>}
              </div>}
            </li>); })}
        </ul>
      </section>
      <section className="card xl:col-span-2">
        <header className="px-4 pt-3.5 pb-2.5 border-b border-line/70 flex items-center gap-2">
          <Headphones size={15} className="text-violet" />
          <div className="min-w-0 flex-1"><h3 className="font-semibold text-[14px]">{t('Quick audio lessons')}</h3><div className="text-[11.5px] text-muted">{t('{n} short talks in Hinglish · {h} heard', { n: AUDIO_LESSONS.length, h: heard })}</div></div>
          <ListenButton clips={AUDIO_LESSONS} size="sm" label={t('Play all')} />
        </header>
        <ol className="divide-y divide-line">
          {AUDIO_LESSONS.map((l, i) => { const h = isDone(records, 'audio', 'clip:' + l.id); return (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cls('w-8 h-8 rounded-full grid place-items-center shrink-0 text-[12.5px] font-bold', h ? 'bg-ok/15 text-ok' : 'bg-surface2 text-muted')}>{h ? <CheckCircle2 size={16} /> : i + 1}</span>
              <div className="min-w-0 flex-1"><div className="font-semibold text-[14px] truncate" lang="hi">{l.title}</div><div className="text-[12px] text-muted">{t('{n} min', { n: l.minutes })}</div></div>
              {l.go && curriculum.allowed.has(l.go) && <button className="text-[12.5px] link shrink-0 hidden sm:inline" onClick={() => openScreen(l.go!)}>{t('Open screen')}</button>}
              <ListenButton clip={l} size="sm" label={t('Listen')} onEnd={() => void useTraining.getState().record('audio', 'clip:' + l.id, 'heard')} />
            </li>); })}
        </ol>
      </section>
    </div>
  );
}
