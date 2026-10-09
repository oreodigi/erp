// Role curriculum: turns the logged-in user's role code + effective permissions (allowed route keys) into an ordered,
// de-duplicated training plan. Required items count towards readiness; optional items are offered but not scored.
import type { Exercise, Lesson, Quiz, RoleCode, ScreenTraining, Workflow, ModuleId } from './types';
import { SCREENS, START_LESSONS, CONCEPT_LESSONS, SCREEN_LESSONS, EXERCISES, WORKFLOWS, QUESTIONS, MODULE_QUIZZES, WORKFLOW_QUIZZES, screenLessonId, finalQuizId } from './registry';
import { MODULES, MANAGER_ROLES } from './modules';
import { QUIZ_DRAW } from './config';

/** Screens every signed-in user can open (see OPEN_ROUTES in nav.ts) – passed in by callers that know the menu. */
export type CurriculumInput = { role: RoleCode | string; allowed: Iterable<string> };

export type SectionKey = 'start' | 'role' | 'daily' | 'modules' | 'workflows' | 'practice' | 'assess' | 'glossary' | 'manager';
export const SECTION_TITLES: Record<SectionKey, string> = {
  start: 'Getting Started', role: 'Your Role', daily: 'Your Daily Work', modules: 'Module Training', workflows: 'End-to-End Workflows',
  practice: 'Practice Exercises', assess: 'Assessments', glossary: 'ERP Glossary', manager: 'Advanced & Manager Training',
};

export type ModuleCourse = { module: ModuleId; screens: ScreenTraining[]; lessons: Lesson[]; required: string[] };

export type Curriculum = {
  role: string;
  manager: boolean;
  allowed: Set<string>;
  /** screens the user can open and that have training */
  screens: ScreenTraining[];
  /** screens used by this role every day – their walkthrough tours are required */
  coreScreens: ScreenTraining[];
  sections: {
    start: Lesson[]; role: Lesson[]; daily: Lesson[]; modules: ModuleCourse[]; workflows: Workflow[];
    practice: Exercise[]; extraPractice: Exercise[]; assess: Quiz[]; manager: Lesson[];
  };
  /** every lesson in the plan, in learning order, without duplicates */
  lessons: Lesson[];
  required: { lessons: string[]; tours: string[]; exercises: string[]; workflows: string[]; quizzes: string[]; final: string };
  final: Quiz;
};

const has = (roles: string[] | undefined, role: string) => !roles || roles.length === 0 || roles.includes(role);

export function buildCurriculum({ role, allowed: allowedIn }: CurriculumInput): Curriculum {
  const code = String(role || '').toUpperCase() as RoleCode;
  const allowed = new Set<string>(allowedIn);
  ['dashboard', 'help'].forEach((r) => allowed.add(r));
  const manager = MANAGER_ROLES.has(code);

  const screens = SCREENS.filter((s) => allowed.has(s.id));
  // Core = screens tagged for this role. Managers' core is their oversight set (screens tagged only for SA/AD),
  // plus the shared start screens – otherwise a Super Admin would be "required" to master all 120 screens.
  const core = screens.filter((s) => (manager ? s.roles.includes(code) && (s.roles.length <= 3 || ['dashboard', 'work', 'board', 'help'].includes(s.id)) : s.roles.includes(code)));
  const coreIds = new Set(core.map((s) => s.id));

  const start = START_LESSONS.filter((l) => l.kind === 'getting-started');
  const roleL = START_LESSONS.filter((l) => l.kind === 'role' && l.roles?.includes(code));
  const daily = START_LESSONS.filter((l) => l.kind === 'daily' && l.roles?.includes(code));
  const dailyScreens = new Set(daily.flatMap((l) => l.screens));
  const managerL = CONCEPT_LESSONS.filter((l) => l.kind === 'manager' && (manager || l.roles?.includes(code)) && l.screens.some((s) => allowed.has(s)));

  // Module training: screen lessons for every allowed screen + concept/workflow lessons whose screens are allowed.
  const conceptFor = (m: ModuleId) => CONCEPT_LESSONS.filter((l) => l.module === m && l.kind !== 'manager' && l.screens.some((s) => allowed.has(s)) && (has(l.roles, code) || manager));
  const modules: ModuleCourse[] = MODULES.map((m) => {
    const ms = screens.filter((s) => s.module === m.id);
    const concept = conceptFor(m.id);
    const lessons = [...concept, ...ms.map((s) => SCREEN_LESSONS.find((l) => l.id === screenLessonId(s.id))!).filter(Boolean)];
    const required = [...concept.filter((l) => l.screens.some((s) => coreIds.has(s)) && has(l.roles, code)).map((l) => l.id), ...ms.filter((s) => coreIds.has(s.id)).map((s) => screenLessonId(s.id))];
    return { module: m.id, screens: ms, lessons, required };
  }).filter((c) => c.lessons.length > 0);

  const stepsAllowed = (w: Workflow) => w.steps.filter((s) => allowed.has(s.screen)).length / Math.max(1, w.steps.length);
  const workflows = WORKFLOWS.filter((w) => (w.roles.includes(code) && stepsAllowed(w) >= 0.5) || stepsAllowed(w) === 1);
  const requiredWorkflows = workflows.filter((w) => w.roles.includes(code) && (!manager || w.roles.length <= 4 || stepsAllowed(w) === 1));

  const exAllowed = (e: Exercise) => e.steps.every((s) => allowed.has(s.screen));
  // Managers practise the end-to-end exercises; other roles practise every exercise tagged for their role.
  const practice = EXERCISES.filter((e) => e.roles.includes(code) && exAllowed(e) && (!manager || !!e.workflow));
  const practiceIds = new Set(practice.map((e) => e.id));
  const extraPractice = EXERCISES.filter((e) => !practiceIds.has(e.id) && exAllowed(e));

  // Assessments: module quizzes for modules with core screens; workflow checks for required workflows; one final.
  const coreModules = new Set(core.map((s) => s.module));
  const moduleQuizzes = MODULE_QUIZZES.filter((q) => q.module && (coreModules.has(q.module) || (manager && modules.some((m) => m.module === q.module))));
  const requiredModuleQuizzes = MODULE_QUIZZES.filter((q) => q.module && coreModules.has(q.module));
  const wfQuizzes = WORKFLOW_QUIZZES.filter((q) => requiredWorkflows.some((w) => `quiz.${w.id}` === q.id));
  const finalPool = QUESTIONS.filter((q) => q.screens?.some((s) => coreIds.has(s)) || (q.module && coreModules.has(q.module) && q.screens?.some((s) => allowed.has(s)))).map((q) => q.id);
  const final: Quiz = { id: finalQuizId(code), title: 'Final role assessment', kind: 'final', role: code as RoleCode, questions: finalPool, passPct: 0, minutes: 20 };

  const lessonsOrdered: Lesson[] = [];
  const seen = new Set<string>();
  for (const l of [...start, ...roleL, ...daily, ...modules.flatMap((m) => m.lessons), ...managerL]) if (!seen.has(l.id)) { seen.add(l.id); lessonsOrdered.push(l); }

  const requiredLessons = [...start, ...roleL, ...daily].map((l) => l.id).concat(modules.flatMap((m) => m.required)).concat(manager ? managerL.map((l) => l.id) : []);

  return {
    role: code, manager, allowed, screens, coreScreens: core,
    sections: { start, role: roleL, daily, modules, workflows, practice, extraPractice, assess: [...moduleQuizzes, ...wfQuizzes, ...(finalPool.length >= 5 ? [final] : [])], manager: managerL },
    lessons: lessonsOrdered,
    required: {
      lessons: [...new Set(requiredLessons)],
      // Screen tours: the screens of the role's daily routine (plus Home and My Work), not every screen in the menu.
      tours: core.filter((s) => s.walkthrough?.length && (dailyScreens.has(s.id) || ['dashboard', 'work'].includes(s.id))).map((s) => s.id),
      exercises: practice.map((e) => e.id),
      workflows: requiredWorkflows.map((w) => w.id),
      quizzes: requiredModuleQuizzes.map((q) => q.id),
      final: finalPool.length >= 5 ? final.id : '',
    },
    final,
  };
}

/** Number of questions drawn for one attempt of a quiz. */
export const drawSize = (q: Quiz) => Math.min(q.questions.length, QUIZ_DRAW[q.kind]);
