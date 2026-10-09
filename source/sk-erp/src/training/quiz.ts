// Quiz engine: draws questions for an attempt, scores answers (all question types) and summarises attempts.
import type { Question, Quiz, QuizSummary } from './types';
import { QUESTION_BY_ID } from './registry';
import { QUIZ_DRAW } from './config';

export type Answers = Record<string, string | string[]>;
export type QuestionResult = { id: string; correct: boolean; given: string | string[] | undefined; expected: string | string[] };
export type QuizResult = { score: number; correct: number; total: number; passed: boolean; wrong: string[]; results: QuestionResult[] };

/** Small seeded PRNG so a given attempt is reproducible (tests) but attempts differ (seed = time). */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1_000_000) / 1_000_000; }; }
export function shuffle<T>(a: T[], rand: () => number): T[] { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

/** Questions for one attempt. Wrong answers from the last attempt are always included again (spaced repetition). */
export function drawQuestions(quiz: Quiz, seed = Date.now(), previousWrong: string[] = []): Question[] {
  const pool = quiz.questions.map((id) => QUESTION_BY_ID.get(id)).filter(Boolean) as Question[];
  const n = Math.min(pool.length, QUIZ_DRAW[quiz.kind]);
  const rand = rng(seed);
  const must = pool.filter((q) => previousWrong.includes(q.id)).slice(0, n);
  const rest = shuffle(pool.filter((q) => !must.includes(q)), rand).slice(0, n - must.length);
  return shuffle([...must, ...rest], rand);
}

const norm = (v: string | string[] | undefined) => (Array.isArray(v) ? v.map(String) : v === undefined ? undefined : String(v));
export function isCorrect(q: Question, given: string | string[] | undefined): boolean {
  const g = norm(given);
  if (g === undefined) return false;
  if (q.type === 'order') { const exp = Array.isArray(q.answer) ? q.answer : [q.answer]; return Array.isArray(g) && g.length === exp.length && g.every((x, i) => x === exp[i]); }
  const exp = Array.isArray(q.answer) ? q.answer : [q.answer];
  if (Array.isArray(g)) return g.length === exp.length && [...g].sort().join('|') === [...exp].sort().join('|');
  return exp.length === 1 && g === exp[0];
}

export function scoreQuiz(questions: Question[], answers: Answers, passPct: number): QuizResult {
  const results = questions.map((q) => ({ id: q.id, correct: isCorrect(q, answers[q.id]), given: answers[q.id], expected: q.answer }));
  const correct = results.filter((r) => r.correct).length;
  const total = questions.length;
  const score = total ? Math.round((correct / total) * 1000) / 10 : 0;
  return { score, correct, total, passed: total > 0 && score >= passPct, wrong: results.filter((r) => !r.correct).map((r) => r.id), results };
}

/** Merge a new attempt into a summary exactly as the API does (best, last, passed-ever, latest wrong list). */
export function mergeAttempt(prev: QuizSummary | undefined, quiz_id: string, r: { score: number; passed: boolean; wrong: string[] }, at = new Date().toISOString()): QuizSummary {
  return { quiz_id, attempts: (prev?.attempts || 0) + 1, best: Math.max(prev?.best ?? 0, r.score), last: r.score, passed: !!prev?.passed || r.passed, last_at: at, wrong: r.wrong };
}

/** Initial order for an 'order' question (shuffled, never already correct when avoidable). */
export function startingOrder(q: Question, seed = 7): string[] {
  const ids = (q.items || []).map((i) => i.id);
  const exp = Array.isArray(q.answer) ? q.answer : [q.answer];
  let x = shuffle(ids, rng(seed));
  if (x.join() === exp.join() && x.length > 1) x = [...x.slice(1), x[0]];
  return x;
}
