// Floating practice-exercise runner, shown on every screen while an exercise is running.
// Desktop: a panel bottom-right. Phone: a bottom sheet above the tab bar. Minimised: a small pill.
import React, { useState } from 'react';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { usePractice } from '../practice';
import { EXERCISE_BY_ID, SCREEN_BY_ID } from '../registry';
import { StepResults } from './PracticeExercise';
import { FlaskConical, ChevronDown, ChevronUp, ExternalLink, ClipboardCheck, Flag, X, GraduationCap, Minimize2 } from 'lucide-react';

export function PracticeHost() {
  const t = useT();
  const session = usePractice((s) => s.session);
  const route = useUI((s) => s.route);
  // an Academy sheet (lesson, quiz, exercise, workflow) covers the screen – keep out of its way
  const sheetOpen = useUI((s) => s.route === 'help' && ['lesson', 'quiz', 'exercise', 'workflow'].some((k) => !!s.params?.[k]));
  const [all, setAll] = useState(false);
  const [passedId, setPassedId] = useState<string | null>(null);
  const exPassed = passedId ? EXERCISE_BY_ID.get(passedId) : undefined;

  // after a pass the session is cleared – keep a small success card with "Back to Academy"
  if (!session && exPassed) {
    return (
      <div className="fixed z-[58] left-2 right-2 bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] lg:left-auto lg:right-5 lg:bottom-5 lg:w-[380px] card shadow-pop p-4 animate-up" role="status">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-ok/15 text-ok grid place-items-center shrink-0"><GraduationCap size={19} /></span>
          <div className="min-w-0 flex-1"><div className="font-semibold text-[14.5px]">{t('Exercise passed!')}</div><div className="text-[12.5px] text-muted truncate">{exPassed.title}</div></div>
          <button className="btn-icon" aria-label={t('Close')} onClick={() => setPassedId(null)}><X size={16} /></button>
        </div>
        <button className="btn-primary h-10 w-full mt-3" onClick={() => { setPassedId(null); useUI.getState().nav('help', { tab: 'practice' }); }}>{t('Back to Academy')}</button>
      </div>
    );
  }
  if (!session || sheetOpen) return null;
  const ex = EXERCISE_BY_ID.get(session.exerciseId);
  if (!ex) return null;
  const steps = session.steps;
  const okCount = steps.filter((s) => s.result?.ok).length;
  const cur = Math.max(0, steps.findIndex((s) => !s.result?.ok));
  const step = steps[cur];
  const toast = useUI.getState().toast;
  const setMin = usePractice.getState().setMin;
  const onScreen = route === step?.screen || route.startsWith(step?.screen + '/');

  if (session.minimized) {
    return (
      <button onClick={() => setMin(false)} aria-label={t('Open practice panel')}
        className="fixed z-[58] right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] lg:right-5 lg:bottom-5 h-11 pl-3 pr-4 rounded-full bg-ok text-white shadow-pop inline-flex items-center gap-2 text-[13px] font-semibold animate-in">
        <FlaskConical size={16} />{t('Practice')} · <span className="tnum">{session.checkedAt ? `${okCount}/${steps.length}` : t('Step {i}/{n}', { i: cur + 1, n: steps.length })}</span><ChevronUp size={15} />
      </button>
    );
  }

  const check = () => { const r = usePractice.getState().check(); setAll(true); toast(r.passed ? 'All steps look right – press Finish' : 'Some steps need correction', r.passed ? 'ok' : 'warn'); };
  const finish = async () => {
    const id = session.exerciseId;
    const ok = await usePractice.getState().finish();
    if (ok) setPassedId(id);
    else { setAll(true); toast('Not passed yet', 'warn', 'Fix the steps marked "Needs correction" and finish again.'); }
  };
  const stopEx = () => useUI.getState().ask({ title: 'Stop this exercise?', body: 'Your progress in this exercise is not saved. Practice data stays as it is.', confirmLabel: 'Stop', tone: 'bad', onConfirm: () => usePractice.getState().abandon() });

  return (
    <section className="fixed z-[58] left-2 right-2 bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] lg:left-auto lg:right-5 lg:bottom-5 lg:w-[400px] card shadow-pop flex flex-col max-h-[48vh] lg:max-h-[min(78vh,640px)] animate-up border-ok/40" aria-label={t('Practice exercise')}>
      <header className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 border-b border-line">
        <span className="w-8 h-8 rounded-lg bg-ok/15 text-ok grid place-items-center shrink-0"><FlaskConical size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-ok">{t('Practice exercise')} · {session.checkedAt ? t('{d} of {n} passed', { d: okCount, n: steps.length }) : t('Step {i} of {n}', { i: cur + 1, n: steps.length })}</div>
          <div className="font-semibold text-[13.5px] truncate">{ex.title}</div>
        </div>
        <button className="btn-icon !h-9 !w-9" aria-label={t('Minimise')} onClick={() => setMin(true)}><Minimize2 size={16} /></button>
        <button className="btn-icon !h-9 !w-9" aria-label={t('Stop exercise')} onClick={stopEx}><X size={17} /></button>
      </header>
      <div className="overflow-y-auto scrollbar-thin px-3.5 py-3 min-h-0">
        {step && (
          <div className="rounded-xl bg-violet/[.06] border border-violet/25 p-3">
            <div className="text-[11.5px] font-semibold text-violet">{t('Now do this')}</div>
            <div className="font-semibold text-[14px] leading-snug mt-0.5">{step.task}</div>
            <div className="text-[12.5px] text-muted mt-1">{t('Expected')}: {step.expected}</div>
            {step.result && !step.result.ok && <div className="text-[12.5px] text-bad mt-1">{t('Your action')}: {step.result.found}</div>}
            {!onScreen && <button className="btn-ghost h-9 mt-2" onClick={() => useUI.getState().nav(step.screen)}><ExternalLink size={14} />{t('Open {screen}', { screen: SCREEN_BY_ID.get(step.screen)?.title || step.screen })}</button>}
          </div>
        )}
        <button className="mt-2.5 text-[12.5px] link inline-flex items-center gap-1" aria-expanded={all} onClick={() => setAll(!all)}>{all ? t('Hide all steps') : t('Show all steps')}{all ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        {all && <div className="mt-2"><StepResults steps={steps} current={cur} compact /></div>}
      </div>
      <footer className="flex gap-2 px-3.5 py-2.5 border-t border-line">
        <button className="btn-ghost h-10 flex-1" onClick={check}><ClipboardCheck size={15} />{t('Check my work')}</button>
        <button className="btn-primary h-10 flex-1" onClick={finish}><Flag size={15} />{t('Finish exercise')}</button>
      </footer>
    </section>
  );
}
