// Lesson reader: sections, the screens it explains, Hinglish audio with captions, practice and quiz links,
// prerequisites, previous/next lesson and "Mark as complete".
import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls } from '../../lib/util';
import { useVoice, play, stop, pause, resume, jump, setRate } from '../../lib/voice';
import { LESSON_BY_ID, SCREEN_BY_ID, QUIZ_BY_ID } from '../registry';
import { lessonDone, isDone, prerequisitesMet, recKey } from '../progress';
import { moduleTitle } from '../modules';
import { useTraining } from '../store';
import type { Curriculum } from '../curriculum';
import type { Exercise } from '../types';
import { Sheet, closeItem, openItem, openScreen, ModuleIcon, ReqBadge } from './common';
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Volume2, Pause, Play, SkipBack, SkipForward, Square, ExternalLink, FlaskConical, ListChecks, Clock, Headphones, ChevronDown } from 'lucide-react';

export function LessonViewer({ id, curriculum }: { id: string; curriculum: Curriculum }) {
  const t = useT();
  const lesson = LESSON_BY_ID.get(id);
  const records = useTraining((s) => s.records);
  const record = useTraining((s) => s.record);
  const required = useMemo(() => new Set(curriculum.required.lessons), [curriculum]);
  const order = curriculum.lessons;
  const idx = order.findIndex((l) => l.id === id);
  const done = lessonDone(records, id);
  const [justDone, setJustDone] = useState(false);

  // opening a lesson marks it started (never downgrades a finished one)
  useEffect(() => { setJustDone(false); if (lesson && !records[recKey('lesson', id)]) void record('lesson', id, 'started'); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // stop this lesson's narration when the viewer closes
  useEffect(() => () => { const c = useVoice.getState().clip; if (c?.id === 'lesson:' + id) stop(); }, [id]);
  useEffect(() => { try { document.getElementById('lesson-body')?.scrollTo({ top: 0 }); } catch { /* */ } }, [id]);

  const practice = useMemo<Exercise | undefined>(() => {
    if (!lesson) return undefined;
    const screens = new Set(lesson.screens);
    const list = [...curriculum.sections.practice, ...curriculum.sections.extraPractice];
    const direct = lesson.screens.map((s) => SCREEN_BY_ID.get(s)?.practice).find((x) => x && list.some((e) => e.id === x));
    return list.find((e) => e.id === direct) || list.find((e) => e.steps.some((s) => screens.has(s.screen)));
  }, [lesson, curriculum]);

  if (!lesson) {
    return <Sheet title={t('Lesson not found')} onClose={closeItem}><p className="p-5 text-muted text-[14px]">{t('This lesson is no longer available.')}</p></Sheet>;
  }
  const quiz = QUIZ_BY_ID.get(`quiz.${lesson.module}`);
  const prereqOk = prerequisitesMet(lesson, records);
  const missing = (lesson.prerequisites || []).filter((p) => !lessonDone(records, p)).map((p) => LESSON_BY_ID.get(p)).filter(Boolean);
  const prev = idx > 0 ? order[idx - 1] : undefined;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : undefined;
  const complete = () => { void record('lesson', id, 'completed'); setJustDone(true); };

  return (
    <Sheet z="z-[88]" width="sm:max-w-3xl" onClose={closeItem} label={lesson.title}
      eyebrow={<><ModuleIcon module={lesson.module} size={13} className="text-violet" />{moduleTitle(lesson.module)}<span aria-hidden>·</span><Clock size={12} />{t('{n} min', { n: lesson.minutes })}{idx >= 0 && <><span aria-hidden>·</span>{t('Lesson {i} of {n}', { i: idx + 1, n: order.length })}</>}</>}
      title={<span className="flex items-center gap-2 flex-wrap">{lesson.title}{done && <span className="chip bg-ok/10 text-ok"><CheckCircle2 size={12} />{t('Completed')}</span>}</span>}
      footer={
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-11 px-3" disabled={!prev} onClick={() => prev && openItem('lesson', prev.id)} aria-label={t('Previous lesson')}><ChevronLeft size={17} /><span className="hidden sm:inline">{t('Previous')}</span></button>
          <div className="flex-1 flex justify-center">
            {done
              ? <span className="inline-flex items-center gap-1.5 text-ok font-semibold text-[14px]"><CheckCircle2 size={18} />{t('Completed')}</span>
              : <button className="btn-primary h-11 px-5" onClick={complete}><CheckCircle2 size={17} />{t('Mark as complete')}</button>}
          </div>
          <button className={cls(done || justDone ? 'btn-primary' : 'btn-ghost', 'h-11 px-3')} disabled={!next} onClick={() => next && openItem('lesson', next.id)} aria-label={t('Next lesson')}><span className="hidden sm:inline">{t('Next')}</span><ChevronRight size={17} /></button>
        </div>
      }>
      <div id="lesson-body" className="px-4 sm:px-6 py-5 grid grid-cols-[minmax(0,1fr)] gap-5 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center gap-1.5"><ReqBadge required={required.has(id)} />{!required.has(id) && <span className="text-[12px] text-muted">{t('Optional – read it when you need it.')}</span>}</div>

        {!prereqOk && (
          <div className="rounded-xl border border-warn/40 bg-warn/[.08] p-3.5 flex gap-3">
            <Lock size={18} className="text-warn shrink-0 mt-0.5" />
            <div className="min-w-0 text-[13.5px]">
              <div className="font-semibold">{t('Read this first')}</div>
              <p className="text-muted mt-0.5">{t('This lesson is easier after:')}</p>
              <ul className="mt-1.5 grid gap-1">{missing.map((p) => <li key={p!.id}><button className="link text-left" onClick={() => openItem('lesson', p!.id)}>{p!.title}</button></li>)}</ul>
              <p className="text-muted mt-1.5 text-[12.5px]">{t('You can still read it now.')}</p>
            </div>
          </div>
        )}

        <p className="text-[15.5px] leading-relaxed">{lesson.summary}</p>

        {lesson.audio.length > 0 && <LessonAudio id={id} title={lesson.title} lines={lesson.audio} heard={isDone(records, 'audio', id)} />}

        {lesson.sections.map((s, i) => (
          <section key={i} className="min-w-0">
            <h3 className="font-display font-semibold text-[16.5px] mb-1.5">{s.heading}</h3>
            {s.body && <p className="text-[14.5px] leading-relaxed text-ink/90 whitespace-pre-line">{s.body}</p>}
            {s.bullets?.length ? <ul className="mt-2 grid gap-1.5">{s.bullets.map((b, k) => <li key={k} className="flex gap-2.5 text-[14.5px] leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-violet mt-[9px] shrink-0" />{b}</li>)}</ul> : null}
          </section>
        ))}

        {lesson.screens.length > 0 && (
          <section className="card p-4">
            <h3 className="font-semibold text-[14px] mb-2.5">{t('Screens in this lesson')}</h3>
            <ul className="grid gap-2">
              {lesson.screens.map((s) => {
                const sc = SCREEN_BY_ID.get(s); const can = curriculum.allowed.has(s);
                return (
                  <li key={s} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <div className="min-w-0 flex-1"><div className="font-semibold text-[13.5px] truncate">{sc?.title || s}</div>{sc?.purpose && <div className="text-[12px] text-muted line-clamp-1">{sc.purpose}</div>}</div>
                    {can ? <button className="btn-ghost h-9 shrink-0" onClick={() => openScreen(s)}><ExternalLink size={14} />{t('Open')}</button> : <span className="chip bg-surface2 text-muted border border-line">{t('No access')}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(practice || quiz) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {practice && (
              <button className="card p-4 text-left hover:border-violet/40 transition flex gap-3" onClick={() => openItem('exercise', practice.id)}>
                <span className="w-10 h-10 rounded-xl bg-ok/10 text-ok grid place-items-center shrink-0"><FlaskConical size={18} /></span>
                <span className="min-w-0"><span className="block text-[11.5px] font-semibold text-muted">{t('Practice this')}</span><span className="block font-semibold text-[14px]">{practice.title}</span><span className="block text-[12px] text-muted">{t('Safe practice data · {n} min', { n: practice.minutes })}</span></span>
              </button>
            )}
            {quiz && (
              <button className="card p-4 text-left hover:border-violet/40 transition flex gap-3" onClick={() => openItem('quiz', quiz.id)}>
                <span className="w-10 h-10 rounded-xl bg-violet/10 text-violet grid place-items-center shrink-0"><ListChecks size={18} /></span>
                <span className="min-w-0"><span className="block text-[11.5px] font-semibold text-muted">{t('Test yourself')}</span><span className="block font-semibold text-[14px]">{quiz.title}</span></span>
              </button>
            )}
          </div>
        )}
        {justDone && next && (
          <div className="rounded-xl bg-ok/10 border border-ok/30 p-3.5 flex flex-wrap items-center gap-3">
            <CheckCircle2 size={20} className="text-ok shrink-0" />
            <span className="flex-1 min-w-[12rem] text-[14px] font-semibold">{t('Well done! Next: {title}', { title: next.title })}</span>
            <button className="btn-primary h-10" onClick={() => openItem('lesson', next.id)}>{t('Next lesson')}<ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Inline narration player (captions, line controls, speed) on top of the shared voice engine. */
function LessonAudio({ id, title, lines, heard }: { id: string; title: string; lines: string[]; heard: boolean }) {
  const t = useT();
  const clipId = 'lesson:' + id;
  const active = useVoice((s) => s.clip?.id === clipId && s.status !== 'idle');
  const status = useVoice((s) => (s.clip?.id === clipId ? s.status : 'idle'));
  const idx = useVoice((s) => (s.clip?.id === clipId ? s.idx : -1));
  const mode = useVoice((s) => s.mode);
  const rate = useUI((s) => s.voiceRate) || 0.95;
  const set = useUI((s) => s.set);
  const [words, setWords] = useState(false);
  const start = () => { setRate(rate); play({ id: clipId, title, lines }, { onEnd: () => void useTraining.getState().record('audio', id, 'heard') }); };
  return (
    <section className="rounded-xl border border-violet/25 bg-violet/[.05] p-3.5 sm:p-4" aria-label={t('Lesson audio')}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-violet/15 text-violet grid place-items-center shrink-0"><Headphones size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[14px]">{t('Listen in Hinglish')}</div>
          <div className="text-[12px] text-muted">{active ? t('Line {i} of {n}', { i: idx + 1, n: lines.length }) : heard ? t('Heard') + ' ✓' : t('{n} lines', { n: lines.length })}</div>
        </div>
        {!active && <button className="btn-violet h-10 px-4" onClick={start}><Volume2 size={16} />{heard ? t('Listen again') : t('Listen')}</button>}
      </div>
      {active && (
        <>
          <p className="mt-3 text-[16px] leading-relaxed min-h-[3em] bg-surface rounded-lg border border-line p-3" aria-live="polite" lang="hi">{lines[idx] || ''}</p>
          <div className="h-1 rounded-full bg-line mt-2 overflow-hidden"><div className="h-full bg-violet transition-all" style={{ width: `${((idx + 1) / lines.length) * 100}%` }} /></div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <button className="btn-ghost h-10 w-10 !px-0" aria-label={t('Previous line')} onClick={() => jump(-1)}><SkipBack size={16} /></button>
            {status === 'playing'
              ? <button className="btn-ghost h-10 w-10 !px-0" aria-label={t('Pause')} onClick={pause}><Pause size={17} /></button>
              : <button className="btn-ghost h-10 w-10 !px-0" aria-label={t('Play')} onClick={resume}><Play size={17} /></button>}
            <button className="btn-ghost h-10 w-10 !px-0" aria-label={t('Next line')} onClick={() => jump(1)}><SkipForward size={16} /></button>
            <button className="btn-ghost h-10 w-10 !px-0" aria-label={t('Stop')} onClick={stop}><Square size={15} /></button>
            <span className="flex-1" />
            <div className="inline-flex p-0.5 rounded-lg bg-surface2 border border-line" role="group" aria-label={t('Speed')}>
              {[0.8, 0.95, 1.1].map((r) => <button key={r} aria-pressed={Math.abs(rate - r) < 0.01} className={cls('h-8 px-2.5 rounded-md text-[12px] font-semibold', Math.abs(rate - r) < 0.01 ? 'bg-surface shadow-card' : 'text-muted')} onClick={() => { set({ voiceRate: r } as any); setRate(r); }}>{r === 0.8 ? t('Slow') : r === 0.95 ? t('Normal') : t('Fast')}</button>)}
            </div>
          </div>
          {mode === 'captions' && <p className="text-[11.5px] text-muted mt-2">{t('No Hindi voice on this device, so only the text is shown.')}</p>}
        </>
      )}
      <button className="mt-2.5 text-[12.5px] link inline-flex items-center gap-1" aria-expanded={words} onClick={() => setWords(!words)}>{words ? t('Hide the words') : t('Read the words')}<ChevronDown size={14} className={cls('transition', words && 'rotate-180')} /></button>
      {words && <ol className="mt-2 grid gap-1.5" lang="hi">{lines.map((l, i) => <li key={i} className={cls('text-[14px] leading-relaxed rounded-md px-2 py-1', i === idx ? 'bg-violet/10 text-ink font-semibold' : 'text-muted')}>{l}</li>)}</ol>}
    </section>
  );
}
