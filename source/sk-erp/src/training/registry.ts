// Training registry: one index over every content file. Everything else (curriculum, Academy UI, coverage checks,
// admin dashboard) reads training data from here. Content files live in ./content and reference real route keys.
import type { ScreenTraining, Question, Exercise, Workflow, Lesson, Quiz, ModuleId, RoleCode } from './types';
import { QUIZ_DRAW } from './config';
import { MODULES } from './modules';
import * as ops from './content/ops';
import * as smartload from './content/smartload-wh';
import * as rail from './content/rail';
import * as fleet from './content/fleet';
import * as finance from './content/finance';
import * as workshop from './content/workshop';
import * as crm from './content/crm';
import * as hr from './content/hr';
import * as admin from './content/admin';
import { lessons as startLessons } from './content/getting-started';
import { glossary, type GlossaryTerm } from './content/glossary';

type Source = { screens?: ScreenTraining[]; questions?: Question[]; exercises?: Exercise[]; workflows?: Workflow[]; lessons?: Lesson[] };
export const SOURCES: Record<string, Source> = { ops, smartload, rail, fleet, finance, workshop, crm, hr, admin };

const flat = <T,>(k: keyof Source) => Object.values(SOURCES).flatMap((s) => ((s[k] as T[] | undefined) || []));
/** Later definitions with the same id are ignored; duplicates are reported by the integrity check. */
const unique = <T extends { id: string }>(list: T[]) => { const seen = new Set<string>(); return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))); };

export const SCREENS: ScreenTraining[] = unique(flat<ScreenTraining>('screens'));
export const QUESTIONS: Question[] = unique(flat<Question>('questions'));
export const EXERCISES: Exercise[] = unique(flat<Exercise>('exercises'));
export const WORKFLOWS: Workflow[] = unique(flat<Workflow>('workflows'));
export const CONCEPT_LESSONS: Lesson[] = unique(flat<Lesson>('lessons'));
export const START_LESSONS: Lesson[] = startLessons;
export const GLOSSARY: GlossaryTerm[] = glossary;

export const screenLessonId = (route: string) => `screen:${route}`;

/** Lesson generated from a screen's training metadata, so every screen has a readable lesson with audio. */
export function screenLesson(s: ScreenTraining): Lesson {
  const sections: Lesson['sections'] = [
    { heading: 'What is this screen?', body: s.purpose },
    { heading: 'Why and when do I use it?', body: `${s.why} ${s.when}`.trim() },
    { heading: 'Before and after', body: `Before: ${s.before} After: ${s.after}` },
  ];
  if (s.actions?.length) sections.push({ heading: 'What you do here', body: '', bullets: s.actions });
  if (s.validations?.length) sections.push({ heading: 'Rules the ERP checks', body: '', bullets: s.validations });
  if (s.mistakes?.length) sections.push({ heading: 'Common mistakes', body: '', bullets: s.mistakes });
  if (s.warnings?.length) sections.push({ heading: 'Warnings', body: '', bullets: s.warnings });
  if (s.example) sections.push({ heading: 'Example', body: s.example });
  return {
    id: screenLessonId(s.id), title: s.title, module: s.module, kind: 'concept', roles: s.roles, screens: [s.id],
    summary: s.purpose, sections, audio: s.audio || [], minutes: s.minutes || 3, quiz: s.quiz || [],
  };
}

export const SCREEN_LESSONS: Lesson[] = SCREENS.map(screenLesson);
export const LESSONS: Lesson[] = unique([...START_LESSONS, ...CONCEPT_LESSONS, ...SCREEN_LESSONS]);

export const SCREEN_BY_ID = new Map(SCREENS.map((s) => [s.id, s]));
export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const WORKFLOW_BY_ID = new Map(WORKFLOWS.map((w) => [w.id, w]));
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

/** Module quizzes: every module with enough questions gets a quiz whose pool is all its questions. */
export const MODULE_QUIZZES: Quiz[] = MODULES.map((m) => {
  const pool = QUESTIONS.filter((q) => q.module === m.id).map((q) => q.id);
  return { id: `quiz.${m.id}`, title: `${m.title} – module quiz`, kind: 'module' as const, module: m.id, questions: pool, passPct: 0, minutes: Math.max(5, Math.min(15, Math.round(Math.min(pool.length, QUIZ_DRAW.module) * 0.8))) };
}).filter((q) => q.questions.length >= 4);

/** Workflow quizzes: questions about the screens a workflow passes through. */
export const WORKFLOW_QUIZZES: Quiz[] = WORKFLOWS.map((w) => {
  const screens = new Set(w.steps.map((s) => s.screen));
  const pool = QUESTIONS.filter((q) => q.screens?.some((s) => screens.has(s))).map((q) => q.id);
  return { id: `quiz.${w.id}`, title: `${w.title} – workflow check`, kind: 'workflow' as const, module: w.module, questions: pool, passPct: 0, minutes: 6 };
}).filter((q) => q.questions.length >= 4);

/** Final role assessment: built per learner from the question pools of their curriculum (see curriculum.ts). */
export const finalQuizId = (role: RoleCode | string) => `final.${String(role).toLowerCase()}`;

export const QUIZZES: Quiz[] = [...MODULE_QUIZZES, ...WORKFLOW_QUIZZES];
export const QUIZ_BY_ID = new Map(QUIZZES.map((q) => [q.id, q]));

/** Screen IDs a training item points to – used to open "this ERP screen". */
export function screensOf(kind: 'lesson' | 'exercise' | 'workflow', id: string): string[] {
  if (kind === 'lesson') return LESSON_BY_ID.get(id)?.screens || [];
  if (kind === 'exercise') return [...new Set((EXERCISE_BY_ID.get(id)?.steps || []).map((s) => s.screen))];
  return [...new Set((WORKFLOW_BY_ID.get(id)?.steps || []).map((s) => s.screen))];
}

export const moduleOfScreen = (route: string): ModuleId | undefined => SCREEN_BY_ID.get(route)?.module;
