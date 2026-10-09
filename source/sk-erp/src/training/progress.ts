// Progress and readiness – pure functions over a curriculum, the learner's training records and quiz summaries.
// Used by the Academy (own progress) and the admin Training dashboard (any employee), so both always agree.
import type { Curriculum } from './curriculum';
import type { QuizSummary, TrainingRecord, Lesson } from './types';
import { DEFAULT_READINESS, type ReadinessSettings } from './config';
import { LESSON_BY_ID, QUESTION_BY_ID, SCREEN_BY_ID, screenLessonId } from './registry';

export type ReadinessStatus = 'Not Started' | 'Learning' | 'Practising' | 'Assessment Pending' | 'Ready';
export const READINESS_ORDER: ReadinessStatus[] = ['Not Started', 'Learning', 'Practising', 'Assessment Pending', 'Ready'];

export type RecordMap = Record<string, TrainingRecord>;
export const recKey = (kind: string, id: string) => `${kind}:${id}`;
export const toRecordMap = (list: TrainingRecord[] | undefined): RecordMap => Object.fromEntries((list || []).map((r) => [recKey(r.kind, r.item_id), r]));
export const toQuizMap = (list: QuizSummary[] | undefined): Record<string, QuizSummary> => Object.fromEntries((list || []).map((q) => [q.quiz_id, q]));

const DONE = new Set(['completed', 'passed', 'understood', 'heard']);
export const isDone = (m: RecordMap, kind: string, id: string) => DONE.has(String(m[recKey(kind, id)]?.status));
export const lessonDone = (m: RecordMap, id: string) => isDone(m, 'lesson', id);
export const exercisePassed = (m: RecordMap, id: string) => m[recKey('exercise', id)]?.status === 'passed';
export const quizPassed = (q: Record<string, QuizSummary>, id: string) => !!q[id]?.passed;

export type Part = { done: number; total: number; pct: number };
const part = (done: number, total: number): Part => ({ done, total, pct: total ? Math.round((done / total) * 1000) / 10 : 100 });

export type Progress = {
  lessons: Part; tours: Part; practice: Part; quizzes: Part; workflows: Part;
  finalPassed: boolean; finalBest: number | null;
  /** share of all required items finished */
  completionPct: number;
  /** weighted evidence score */
  readinessPct: number;
  status: ReadinessStatus;
  /** why the learner is not Ready yet (empty when Ready) */
  blockers: string[];
  next: { kind: 'lesson' | 'tour' | 'exercise' | 'quiz' | 'workflow' | 'final'; id: string; title: string } | null;
  weak: { screen: string; title: string; misses: number; lesson: string }[];
  recent: TrainingRecord[];
  streak: number;
  started: boolean;
  lastActivity: string | null;
};

/** Prerequisites are met when every prerequisite lesson is done. */
export const prerequisitesMet = (l: Lesson, m: RecordMap) => (l.prerequisites || []).every((p) => lessonDone(m, p));

export function computeProgress(c: Curriculum, records: RecordMap, quizzes: Record<string, QuizSummary>, settings: ReadinessSettings = DEFAULT_READINESS, today = new Date()): Progress {
  const r = c.required;
  const lessons = part(r.lessons.filter((id) => lessonDone(records, id)).length, r.lessons.length);
  const tours = part(r.tours.filter((id) => isDone(records, 'tour', id)).length, r.tours.length);
  const practice = part(r.exercises.filter((id) => exercisePassed(records, id)).length, r.exercises.length);
  const quiz = part(r.quizzes.filter((id) => quizPassed(quizzes, id)).length, r.quizzes.length);
  // A workflow counts once its walkthrough is completed, or when its practice exercise has been passed.
  const wfDone = (id: string) => isDone(records, 'workflow', id) || c.sections.workflows.some((w) => w.id === id && !!w.exercise && exercisePassed(records, w.exercise));
  const workflows = part(r.workflows.filter(wfDone).length, r.workflows.length);
  const finalQ = r.final ? quizzes[r.final] : undefined;
  const finalPassed = !r.final || !!finalQ?.passed;

  const w = settings.weights;
  const wsum = w.lessons + w.tours + w.practice + w.quiz + w.workflow || 100;
  // The final assessment counts as one more quiz in the quiz evidence.
  const quizPart = r.final ? part(quiz.done + (finalPassed ? 1 : 0), quiz.total + 1) : quiz;
  const readinessPct = Math.round(((lessons.pct * w.lessons + tours.pct * w.tours + practice.pct * w.practice + quizPart.pct * w.quiz + workflows.pct * w.workflow) / wsum) * 10) / 10;

  const totalItems = lessons.total + tours.total + practice.total + quizPart.total + workflows.total;
  const doneItems = lessons.done + tours.done + practice.done + quizPart.done + workflows.done;
  const completionPct = totalItems ? Math.round((doneItems / totalItems) * 1000) / 10 : 0;

  const all = Object.values(records);
  const started = all.some((x) => x.kind !== 'hint') || Object.keys(quizzes).length > 0;
  const t = settings.thresholds;
  const blockers: string[] = [];
  if (practice.pct < settings.minPracticePct) blockers.push(`Pass at least ${settings.minPracticePct}% of your practice exercises (now ${Math.round(practice.pct)}%).`);
  if (!finalPassed) blockers.push('Pass the final role assessment.');
  if (readinessPct < t.ready) blockers.push(`Reach ${t.ready}% readiness (now ${Math.round(readinessPct)}%).`);
  // Quiz results alone never make someone Ready: practice and the final assessment are hard gates.
  let status: ReadinessStatus = 'Not Started';
  if (started || readinessPct >= t.learning) status = 'Learning';
  if (readinessPct >= t.practising) status = 'Practising';
  if (readinessPct >= t.assessment) status = 'Assessment Pending';
  if (readinessPct >= t.ready && finalPassed && practice.pct >= settings.minPracticePct) status = 'Ready';
  if (!started && readinessPct < t.learning) status = 'Not Started';

  return {
    lessons, tours, practice, quizzes: quizPart, workflows, finalPassed: !!r.final && finalPassed, finalBest: finalQ ? finalQ.best : null,
    completionPct, readinessPct, status, blockers: status === 'Ready' ? [] : blockers,
    next: nextStep(c, records, quizzes, settings), weak: weakTopics(quizzes), recent: recentActivity(all), streak: streak(all, today), started,
    lastActivity: all.reduce<string | null>((a, x) => (x.updated_at && (!a || x.updated_at > a) ? x.updated_at : a), null),
  };
}

/** Recommended next step: lessons in order (respecting prerequisites), then tours, practice, quizzes, final. */
export function nextStep(c: Curriculum, records: RecordMap, quizzes: Record<string, QuizSummary>, settings: ReadinessSettings = DEFAULT_READINESS): Progress['next'] {
  const req = new Set(c.required.lessons);
  for (const l of c.lessons) if (req.has(l.id) && !lessonDone(records, l.id) && prerequisitesMet(l, records)) return { kind: 'lesson', id: l.id, title: l.title };
  for (const id of c.required.tours) if (!isDone(records, 'tour', id)) return { kind: 'tour', id, title: SCREEN_BY_ID.get(id)?.title || id };
  for (const e of c.sections.practice) if (!exercisePassed(records, e.id)) return { kind: 'exercise', id: e.id, title: e.title };
  for (const w of c.sections.workflows) if (c.required.workflows.includes(w.id) && !isDone(records, 'workflow', w.id)) return { kind: 'workflow', id: w.id, title: w.title };
  for (const q of c.sections.assess) if (c.required.quizzes.includes(q.id) && !quizPassed(quizzes, q.id)) return { kind: 'quiz', id: q.id, title: q.title };
  if (c.required.final && !quizPassed(quizzes, c.required.final)) return { kind: 'final', id: c.required.final, title: c.final.title };
  return null;
}

/** Topics to revisit: screens behind the questions answered wrongly in the latest attempt of each quiz. */
export function weakTopics(quizzes: Record<string, QuizSummary>): Progress['weak'] {
  const count = new Map<string, number>();
  for (const q of Object.values(quizzes)) for (const id of q.wrong || []) for (const s of QUESTION_BY_ID.get(id)?.screens || []) count.set(s, (count.get(s) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([screen, misses]) => ({ screen, misses, title: SCREEN_BY_ID.get(screen)?.title || screen, lesson: screenLessonId(screen) })).filter((x) => LESSON_BY_ID.has(x.lesson));
}

export const recentActivity = (all: TrainingRecord[]) => [...all].filter((r) => r.updated_at && r.kind !== 'hint').sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 8);

/** Consecutive days (ending today or yesterday) with any training activity. */
export function streak(all: TrainingRecord[], today = new Date()): number {
  const days = new Set(all.map((r) => String(r.updated_at || '').slice(0, 10)).filter(Boolean));
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const key = () => d.toISOString().slice(0, 10);
  if (!days.has(key())) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (days.has(key())) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export const STATUS_TONE: Record<ReadinessStatus, string> = { 'Not Started': 'muted', Learning: 'info', Practising: 'violet', 'Assessment Pending': 'warn', Ready: 'ok' };
