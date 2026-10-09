import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, CircleAlert, Headphones, Lightbulb, MonitorPlay, PlayCircle, X } from 'lucide-react';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { ListenButton } from '../../components/VoicePlayer';
import { SCREEN_BY_ID, screenLessonId } from '../registry';
import { useTraining } from '../store';
import { Sheet, openItem } from './common';

/** Contextual help for every training-covered ERP route. Hint dismissal and tour completion are server-backed records. */
export function ScreenHint({ routeKey }: { routeKey: string }) {
  const t = useT();
  const guide = useUI((s) => s.guide);
  const set = useUI((s) => s.set);
  const sc = SCREEN_BY_ID.get(routeKey);
  const rec = useTraining((s) => s.records['hint:' + routeKey]);
  if (!guide || !sc || rec?.status === 'dismissed' || rec?.status === 'understood') return null;
  return <div className="mb-4 rounded-xl border border-warn/35 bg-warn/[.07] px-4 py-3 flex gap-3" role="note">
    <Lightbulb size={19} className="text-warn shrink-0 mt-0.5" />
    <div className="min-w-0 flex-1">
      <div className="font-semibold text-[14px]">{t(sc.purpose)}</div>
      <div className="text-[12.5px] text-muted mt-1">{t(sc.when)}</div>
      <button className="link text-[12.5px] mt-2" onClick={() => set({ help: true })}>{t('Open full screen help')} <ChevronRight size={13} className="inline" /></button>
    </div>
    <button className="btn-icon shrink-0 -mr-1 -mt-1" aria-label={t('Dismiss hint')} onClick={() => void useTraining.getState().record('hint', routeKey, 'dismissed')}><X size={16}/></button>
  </div>;
}

export function ScreenHelpHost() {
  const t = useT();
  const open = useUI((s) => s.help);
  const route = useUI((s) => s.route);
  const set = useUI((s) => s.set);
  const [walk, setWalk] = useState(0);
  const sc = SCREEN_BY_ID.get(route);
  useEffect(() => { setWalk(0); }, [route, open]);
  if (!open) return null;
  if (!sc) return <Sheet title={t('Screen help')} onClose={() => set({ help: false })}><div className="p-5 text-[13.5px] text-muted">{t('No contextual training is required for this technical screen.')}</div></Sheet>;
  const clip = sc.audio?.length ? { id: 'screen-help:' + sc.id, title: sc.title, lines: sc.audio } : null;
  const step = sc.walkthrough?.[walk];
  const go = (r: string) => { set({ help: false }); useUI.getState().nav(r); };
  const finishTour = async () => { await useTraining.getState().record('tour', sc.id, 'completed'); setWalk(0); };
  return <Sheet title={t(sc.title)} eyebrow={<><BookOpen size={13}/>{t('Screen help & training')}</>} onClose={() => set({ help: false })} width="sm:max-w-3xl"
    footer={<div className="flex flex-wrap gap-2">
      <button className="btn-primary h-10" onClick={() => openItem('lesson', screenLessonId(sc.id))}><BookOpen size={15}/>{t('Full lesson')}</button>
      {sc.practice && <button className="btn-ghost h-10" onClick={() => openItem('exercise', sc.practice!)}><PlayCircle size={15}/>{t('Practice this')}</button>}
      <button className="btn-ghost h-10 ml-auto" onClick={() => void useTraining.getState().record('hint', sc.id, 'understood').then(() => set({ help: false }))}>{t('I understand')}</button>
    </div>}>
    <div className="p-4 sm:p-5 grid gap-4">
      <section className="card p-4"><h3 className="font-semibold">{t('What is this screen?')}</h3><p className="text-[13.5px] text-muted mt-1">{t(sc.purpose)}</p><p className="text-[13px] mt-3"><b>{t('Why:')}</b> {t(sc.why)}</p><p className="text-[13px] mt-1"><b>{t('When:')}</b> {t(sc.when)}</p>{clip && <ListenButton clip={clip} size="sm" label={t('Listen in Hinglish')} className="mt-3"/>}</section>
      <section className="grid sm:grid-cols-2 gap-3">
        <div className="card p-4"><div className="eyebrow">{t('Before')}</div><p className="text-[13px] mt-1">{t(sc.before)}</p></div>
        <div className="card p-4"><div className="eyebrow">{t('After')}</div><p className="text-[13px] mt-1">{t(sc.after)}</p></div>
      </section>
      {!!sc.walkthrough?.length && <section className="card p-4">
        <div className="flex items-center gap-2"><MonitorPlay size={17} className="text-violet"/><h3 className="font-semibold">{t('Guided walkthrough')}</h3><span className="chip ml-auto">{walk+1}/{sc.walkthrough.length}</span></div>
        {step && <div className="mt-3 rounded-lg bg-surface2 p-3"><div className="font-semibold text-[13.5px]">{t(step.title)}</div><p className="text-[13px] text-muted mt-1">{t(step.body)}</p></div>}
        <div className="flex gap-2 mt-3"><button className="btn-ghost h-9" disabled={walk===0} onClick={() => setWalk(Math.max(0,walk-1))}>{t('Previous')}</button>{walk<sc.walkthrough.length-1?<button className="btn-primary h-9" onClick={() => setWalk(walk+1)}>{t('Next')}</button>:<button className="btn-primary h-9" onClick={() => void finishTour()}>{t('Finish tour')}</button>}</div>
      </section>}
      {!!sc.fields?.length && <section><h3 className="font-semibold mb-2">{t('Fields')}</h3><div className="grid sm:grid-cols-2 gap-2">{sc.fields.map(f=><div key={f.name} className="rounded-lg border border-line p-3"><b className="text-[13px]">{t(f.name)}</b><p className="text-[12.5px] text-muted mt-1">{t(f.help)}</p></div>)}</div></section>}
      {!!sc.statuses?.length && <section><h3 className="font-semibold mb-2">{t('Statuses')}</h3><div className="grid gap-2">{sc.statuses.map(s=><div key={s.status} className="flex gap-3 rounded-lg bg-surface2 p-3"><span className="chip shrink-0">{t(s.status)}</span><span className="text-[12.5px] text-muted">{t(s.meaning)}</span></div>)}</div></section>}
      {!!sc.mistakes?.length && <section className="rounded-xl border border-warn/30 bg-warn/[.05] p-4"><div className="flex gap-2 font-semibold"><CircleAlert size={17} className="text-warn"/>{t('Common mistakes')}</div><ul className="mt-2 grid gap-1 text-[13px] text-muted">{sc.mistakes.map(x=><li key={x}>• {t(x)}</li>)}</ul></section>}
      {!!sc.related?.length && <section><h3 className="font-semibold mb-2">{t('Related screens')}</h3><div className="flex flex-wrap gap-2">{sc.related.filter(r=>SCREEN_BY_ID.has(r)).map(r=><button key={r} className="btn-ghost h-9" onClick={()=>go(r)}>{t(SCREEN_BY_ID.get(r)!.title)}</button>)}</div></section>}
    </div>
  </Sheet>;
}
