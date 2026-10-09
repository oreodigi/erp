// Quiz player: intro → one question per screen → results with an incorrect-answer review and retake.
// Answers are never shown before the attempt is submitted.
import React, { useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/useT';
import { useUI } from '../../store/store';
import { cls } from '../../lib/util';
import { useTraining } from '../store';
import { drawQuestions, scoreQuiz, startingOrder, type Answers, type QuizResult } from '../quiz';
import { drawSize, type Curriculum } from '../curriculum';
import { LESSON_BY_ID, screenLessonId } from '../registry';
import { moduleTitle } from '../modules';
import type { Question, QuizSummary } from '../types';
import { Sheet, closeItem, openItem, quizFor, radioKeys, Ring } from './common';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CheckCircle2, XCircle, RotateCcw, BookOpen, Trophy, ListChecks, Clock, Target } from 'lucide-react';

type Phase = 'intro' | 'run' | 'result';

export function QuizPlayer({ id, curriculum }: { id: string; curriculum: Curriculum }) {
  const t = useT();
  const quiz = quizFor(curriculum, id);
  const passPct = useTraining((s) => s.settings.passPct);
  const summary = useTraining((s) => s.quizzes[id]) as QuizSummary | undefined;
  const submitQuiz = useTraining((s) => s.submitQuiz);
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [i, setI] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<QuizSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(0);

  if (!quiz) return <Sheet title={t('Quiz not found')} onClose={closeItem}><p className="p-5 text-muted">{t('This quiz is not available for your role.')}</p></Sheet>;
  const size = drawSize(quiz);
  const required = curriculum.required.quizzes.includes(id) || curriculum.required.final === id;

  const begin = (previousWrong: string[]) => {
    const seed = Date.now();
    const qs = drawQuestions(quiz, seed, previousWrong);
    const init: Answers = {};
    qs.forEach((q, k) => { if (q.type === 'order') init[q.id] = startingOrder(q, seed + k); });
    setQuestions(qs); setAnswers(init); setI(0); setResult(null); setSaved(null); setPhase('run'); started.current = Date.now();
  };
  const submit = async () => {
    setBusy(true);
    const r = scoreQuiz(questions, answers, passPct);
    setResult(r); setPhase('result');
    try {
      const s = await submitQuiz({ quiz_id: id, score: r.score, correct: r.correct, total: r.total, passed: r.passed, wrong: r.wrong, duration_seconds: Math.round((Date.now() - started.current) / 1000) });
      setSaved(s);
    } finally { setBusy(false); }
  };

  const q = questions[i];
  const answered = (x: Question) => { const a = answers[x.id]; return x.type === 'order' ? Array.isArray(a) : typeof a === 'string' && a !== ''; };
  const last = i === questions.length - 1;
  const eyebrow = <><ListChecks size={13} className="text-violet" />{quiz.kind === 'final' ? t('Final assessment') : quiz.kind === 'workflow' ? t('Workflow check') : t('Module quiz')}{quiz.module && quiz.kind !== 'final' && <><span aria-hidden>·</span>{moduleTitle(quiz.module)}</>}</>;

  const leave = () => {
    if (phase === 'run') useUI.getState().ask({ title: 'Leave the quiz?', body: 'Your answers will not be saved.', confirmLabel: 'Leave', tone: 'bad', onConfirm: closeItem });
    else closeItem();
  };

  return (
    <Sheet onClose={leave} eyebrow={eyebrow} title={quiz.title} width="sm:max-w-2xl"
      footer={phase === 'run' && q ? (
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-11 px-3" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={17} /><span className="hidden sm:inline">{t('Back')}</span></button>
          <span className="flex-1 text-center text-[12.5px] text-muted tnum">{t('{a} of {n} answered', { a: questions.filter(answered).length, n: questions.length })}</span>
          {last
            ? <button className="btn-primary h-11 px-5" disabled={!questions.every(answered) || busy} onClick={submit}>{t('Submit')}</button>
            : <button className="btn-primary h-11 px-4" disabled={!answered(q)} onClick={() => setI(i + 1)}>{t('Next')}<ChevronRight size={17} /></button>}
        </div>
      ) : undefined}>
      <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
        {phase === 'intro' && (
          <div className="grid gap-5">
            <div className="grid grid-cols-3 gap-2">
              <Fact icon={Target} label={t('Questions')} value={size} />
              <Fact icon={CheckCircle2} label={t('Pass mark')} value={`${passPct}%`} />
              <Fact icon={Clock} label={t('About')} value={t('{n} min', { n: quiz.minutes })} />
            </div>
            <div className="card p-4 grid gap-2 text-[13.5px]">
              <div className="flex items-center justify-between gap-2"><span className="text-muted">{t('Attempts')}</span><span className="font-semibold tnum">{summary?.attempts || 0}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted">{t('Best score')}</span><span className="font-semibold tnum">{summary ? `${Math.round(summary.best)}%` : '–'}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted">{t('Last score')}</span><span className="font-semibold tnum">{summary ? `${Math.round(summary.last)}%` : '–'}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted">{t('Status')}</span>{summary?.passed ? <span className="chip bg-ok/10 text-ok">{t('Passed')}</span> : summary ? <span className="chip bg-warn/[.12] text-warn">{t('Not passed yet')}</span> : <span className="chip bg-surface2 text-muted border border-line">{t('Not taken')}</span>}</div>
            </div>
            <ul className="text-[13.5px] text-muted grid gap-1.5">
              <li>• {t('One question at a time. You can go back before you submit.')}</li>
              <li>• {t('Answers are shown after you submit.')}</li>
              {summary?.wrong?.length ? <li>• {t('Questions you got wrong last time will come again.')}</li> : null}
              {!required && <li>• {t('This quiz is extra – it is not needed for readiness.')}</li>}
            </ul>
            <button className="btn-primary h-12 text-[15px]" onClick={() => begin(summary?.wrong || [])} disabled={!size}>{summary ? t('Start again') : t('Start quiz')}<ChevronRight size={17} /></button>
          </div>
        )}

        {phase === 'run' && q && (
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-muted mb-1.5"><span className="font-semibold">{t('Question {i} of {n}', { i: i + 1, n: questions.length })}</span><span>{typeLabel(q, t)}</span></div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden mb-5" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i + 1}><div className="h-full bg-violet transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} /></div>
            <QuestionView key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
          </div>
        )}

        {phase === 'result' && result && (
          <Results result={result} questions={questions} answers={answers} passPct={passPct} summary={saved || summary} busy={busy}
            onRetake={() => begin(result.wrong)} onClose={closeItem} />
        )}
      </div>
    </Sheet>
  );
}

const typeLabel = (q: Question, t: (s: string) => string) => ({ mcq: t('Choose one'), scenario: t('Situation'), next: t('What comes next?'), spot: t('Find the mistake'), tf: t('True or false'), order: t('Put in order') } as Record<string, string>)[q.type] || '';

function Fact({ icon: I, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return <div className="card p-3 text-center"><I size={16} className="text-violet mx-auto" /><div className="font-display font-semibold text-[19px] tnum mt-1">{value}</div><div className="text-[11.5px] text-muted">{label}</div></div>;
}

function QuestionView({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const t = useT();
  const headingId = 'qp-' + q.id.replace(/\W/g, '-');
  return (
    <div>
      {q.scenario && <div className="rounded-xl bg-info/[.07] border border-info/25 p-3.5 mb-3 text-[14px] leading-relaxed"><span className="block text-[11.5px] font-semibold text-info mb-1">{t('Situation')}</span>{q.scenario}</div>}
      <h3 id={headingId} className="font-display font-semibold text-[17.5px] leading-snug mb-4">{q.prompt}</h3>
      {q.type === 'order' ? <OrderList q={q} value={(value as string[]) || startingOrder(q)} onChange={onChange} labelledBy={headingId} /> : (
        <div role="radiogroup" aria-labelledby={headingId} className="grid gap-2" onKeyDown={radioKeys}>
          {(q.options || []).map((o, k) => {
            const on = value === o.id;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={on} tabIndex={on || (!value && k === 0) ? 0 : -1} onClick={() => onChange(o.id)}
                className={cls('w-full text-left rounded-xl border-2 px-4 py-3 min-h-[52px] flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50', on ? 'border-violet bg-violet/[.07]' : 'border-line bg-surface hover:border-violet/40')}>
                <span className={cls('w-5 h-5 rounded-full border-2 grid place-items-center shrink-0', on ? 'border-violet' : 'border-faint')}>{on && <span className="w-2.5 h-2.5 rounded-full bg-violet" />}</span>
                <span className="text-[14.5px] leading-snug">{o.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderList({ q, value, onChange, labelledBy }: { q: Question; value: string[]; onChange: (v: string[]) => void; labelledBy: string }) {
  const t = useT();
  const text = (id: string) => q.items?.find((x) => x.id === id)?.text || id;
  const move = (k: number, d: number) => { const n = [...value]; const j = k + d; if (j < 0 || j >= n.length) return; [n[k], n[j]] = [n[j], n[k]]; onChange(n); };
  return (
    <div>
      <p className="text-[12.5px] text-muted mb-2">{t('Use the arrows to move each step up or down. First step at the top.')}</p>
      <ol className="grid gap-2" aria-labelledby={labelledBy}>
        {value.map((id, k) => (
          <li key={id} className="flex items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-1.5 py-1.5 min-h-[52px]">
            <span className="w-7 h-7 rounded-full bg-violet/10 text-violet text-[12.5px] font-bold grid place-items-center shrink-0 tnum">{k + 1}</span>
            <span className="flex-1 min-w-0 text-[14.5px] leading-snug">{text(id)}</span>
            <button type="button" className="btn-ghost h-10 w-10 !px-0 shrink-0" disabled={k === 0} onClick={() => move(k, -1)} aria-label={t('Move up') + ': ' + text(id)}><ArrowUp size={16} /></button>
            <button type="button" className="btn-ghost h-10 w-10 !px-0 shrink-0" disabled={k === value.length - 1} onClick={() => move(k, 1)} aria-label={t('Move down') + ': ' + text(id)}><ArrowDown size={16} /></button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function answerText(q: Question, v: string | string[] | undefined): string {
  if (v === undefined) return '–';
  if (q.type === 'order') { const list = Array.isArray(v) ? v : [v]; return list.map((id, k) => `${k + 1}. ${q.items?.find((x) => x.id === id)?.text || id}`).join('\n'); }
  const ids = Array.isArray(v) ? v : [v];
  return ids.map((id) => q.options?.find((o) => o.id === id)?.text || id).join(', ');
}

function Results({ result, questions, answers, passPct, summary, busy, onRetake, onClose }: { result: QuizResult; questions: Question[]; answers: Answers; passPct: number; summary?: QuizSummary | null; busy: boolean; onRetake: () => void; onClose: () => void }) {
  const t = useT();
  const wrong = questions.filter((q) => result.wrong.includes(q.id));
  return (
    <div className="grid gap-5">
      <div className={cls('rounded-2xl p-5 flex items-center gap-4 border', result.passed ? 'bg-ok/[.07] border-ok/30' : 'bg-warn/[.07] border-warn/30')}>
        <Ring value={result.score} tone={result.passed ? 'ok' : 'warn'} label={t('Score')} />
        <div className="min-w-0">
          <div className={cls('font-display text-[20px] font-semibold flex items-center gap-2', result.passed ? 'text-ok' : 'text-warn')}>{result.passed ? <Trophy size={20} /> : <RotateCcw size={19} />}{result.passed ? t('Passed!') : t('Not passed yet')}</div>
          <div className="text-[13.5px] mt-0.5">{t('{c} of {n} correct · pass mark {p}%', { c: result.correct, n: result.total, p: passPct })}</div>
          <div className="text-[12.5px] text-muted mt-1">{busy ? t('Saving…') : summary ? t('Best {b}% · Attempts {a}', { b: Math.round(summary.best), a: summary.attempts }) : ''}</div>
        </div>
      </div>
      {wrong.length > 0 ? (
        <section>
          <h3 className="font-display font-semibold text-[16.5px] mb-2">{t('Check your mistakes')} <span className="text-muted text-[13px] font-sans">({wrong.length})</span></h3>
          <ol className="grid gap-3">
            {wrong.map((q) => {
              const lesson = q.screens?.[0] ? screenLessonId(q.screens[0]) : '';
              return (
                <li key={q.id} className="card p-4 min-w-0">
                  {q.scenario && <p className="text-[12.5px] text-muted mb-1">{q.scenario}</p>}
                  <p className="font-semibold text-[14.5px] leading-snug">{q.prompt}</p>
                  <div className="grid sm:grid-cols-2 gap-2 mt-3 text-[13.5px]">
                    <div className="rounded-lg bg-bad/[.07] border border-bad/20 p-2.5"><div className="text-[11.5px] font-semibold text-bad flex items-center gap-1 mb-0.5"><XCircle size={13} />{t('Your answer')}</div><div className="whitespace-pre-line">{answerText(q, answers[q.id])}</div></div>
                    <div className="rounded-lg bg-ok/[.07] border border-ok/20 p-2.5"><div className="text-[11.5px] font-semibold text-ok flex items-center gap-1 mb-0.5"><CheckCircle2 size={13} />{t('Correct answer')}</div><div className="whitespace-pre-line">{answerText(q, q.answer)}</div></div>
                  </div>
                  <p className="text-[13.5px] mt-3 leading-relaxed"><span className="font-semibold">{t('Why')}: </span>{q.explanation}</p>
                  {lesson && LESSON_BY_ID.has(lesson) && <button className="link text-[13px] mt-2 inline-flex items-center gap-1" onClick={() => openItem('lesson', lesson)}><BookOpen size={14} />{t('Learn this: {title}', { title: LESSON_BY_ID.get(lesson)!.title })}</button>}
                </li>
              );
            })}
          </ol>
        </section>
      ) : <p className="text-[14px] text-ok font-semibold flex items-center gap-2"><CheckCircle2 size={18} />{t('All answers correct. Great work!')}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary h-11 flex-1 min-w-[10rem]" onClick={onRetake}><RotateCcw size={16} />{t('Retake quiz')}</button>
        <button className="btn-ghost h-11 flex-1 min-w-[10rem]" onClick={onClose}>{t('Back to Academy')}</button>
      </div>
    </div>
  );
}
