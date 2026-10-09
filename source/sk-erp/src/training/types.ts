// Training Academy data contracts.
// Content lives in typed registries under src/training/content/*. Every entry references real ERP route keys
// (the keys of PAGES in src/pages.tsx), which are the stable screen IDs used by coverage checks and progress records.

export type ModuleId =
  | 'home' | 'ops' | 'smartload' | 'rail' | 'fleet' | 'wh' | 'fin' | 'ws' | 'cust' | 'crm' | 'hr' | 'payroll'
  | 'comms' | 'reports' | 'masters' | 'access' | 'admin';

/** Local ERP role codes used by role menus (see ROLE_GROUPS in nav.ts). */
export type RoleCode = 'SA' | 'AD' | 'OP' | 'BU' | 'AC' | 'CC' | 'CO' | 'SI' | 'HR';

/** Text that may later carry translations. English is required; other languages are optional. */
export type LText = string | { en: string; hi?: string; mr?: string };

export type FieldHelp = { name: string; help: string };
export type StatusHelp = { status: string; meaning: string };
export type WalkStep = { title: string; body: string; target?: string /* optional data-tour / CSS hint */ };

/** Training metadata for one navigable ERP screen. `id` must equal a PAGES route key. */
export type ScreenTraining = {
  id: string;
  module: ModuleId;
  title: string;
  /** What is this screen? (1–2 sentences) */
  purpose: string;
  /** Why do I use it? */
  why: string;
  /** When should I use it? */
  when: string;
  /** Roles that use this screen day to day. Access itself comes from role menus/permissions. */
  roles: RoleCode[];
  /** Screen IDs that normally come before / after this one in the work. */
  upstream: string[];
  downstream: string[];
  /** Short explanation of what happens before and after, in plain words. */
  before: string;
  after: string;
  prerequisites: string[];
  actions: string[];
  records: string[];
  validations: string[];
  mistakes: string[];
  warnings?: string[];
  shortcuts?: string[];
  fields?: FieldHelp[];
  statuses?: StatusHelp[];
  example?: string;
  walkthrough: WalkStep[];
  related: string[];
  /** Practice exercise ID that trains this screen (if practice is possible here). */
  practice?: string;
  /** Hinglish narration (Devanagari with English work words) – one item per spoken line. */
  audio: string[];
  /** Question IDs that test this screen. */
  quiz: string[];
  /** Approx. lesson length in minutes. */
  minutes?: number;
};

/** Concept / role / workflow lessons that are not tied to a single screen. Screen lessons are generated from ScreenTraining. */
export type LessonSection = { heading: string; body: string; bullets?: string[] };
export type Lesson = {
  id: string;
  title: string;
  module: ModuleId;
  kind: 'getting-started' | 'role' | 'daily' | 'concept' | 'workflow' | 'manager';
  roles?: RoleCode[];            // empty/undefined = everyone
  screens: string[];             // screens this lesson explains / opens
  summary: string;
  sections: LessonSection[];
  audio: string[];
  minutes: number;
  prerequisites?: string[];      // lesson IDs
  quiz?: string[];
};

export type WorkflowStep = { screen: string; title: string; does: string; lesson?: string };
export type Workflow = {
  id: string;
  title: string;
  module: ModuleId;
  roles: RoleCode[];
  summary: string;
  steps: WorkflowStep[];
  exercise?: string;
  lesson?: string;
  notes?: string[];
};

export type QuestionType = 'mcq' | 'tf' | 'order' | 'scenario' | 'next' | 'spot';
export type QOption = { id: string; text: string };
export type Question = {
  id: string;
  module: ModuleId;
  type: QuestionType;
  prompt: string;
  scenario?: string;
  options?: QOption[];          // mcq / tf / scenario / next / spot
  answer: string | string[];    // option id, or ordered item ids for 'order'
  items?: QOption[];            // 'order': items shown shuffled
  explanation: string;          // teaches the actual system rule
  screens: string[];
  difficulty?: 1 | 2 | 3;
};

export type Quiz = {
  id: string;
  title: string;
  kind: 'module' | 'workflow' | 'final';
  module?: ModuleId;
  role?: RoleCode;
  questions: string[];
  passPct: number;
  minutes: number;
};

/** Practice exercises run against isolated practice data. Checkers look at what changed since the exercise started. */
/** ids, status and a flat snapshot (primitive fields + presence flags of object fields) of watched records at exercise start. */
export type PracticeBaseline = { ids: Record<string, string[]>; status: Record<string, Record<string, string>>; snap: Record<string, Record<string, Record<string, any>>>; startedAt: string };
export type CheckResult = { ok: boolean; found: string };
export type ExerciseStep = {
  id: string;
  task: string;
  expected: string;
  screen: string;
  check: (db: any, base: PracticeBaseline, ctx: Record<string, any>) => CheckResult;
};
export type Exercise = {
  id: string;
  title: string;
  module: ModuleId;
  roles: RoleCode[];
  summary: string;
  minutes: number;
  steps: ExerciseStep[];
  /** collections whose ids/status are captured at start */
  watch: string[];
  workflow?: boolean;
};

export type RecordKind = 'onboarding' | 'lesson' | 'tour' | 'hint' | 'exercise' | 'workflow' | 'audio' | 'screen';
export type RecordStatus = 'started' | 'completed' | 'dismissed' | 'understood' | 'passed' | 'failed' | 'skipped' | 'heard';
export type TrainingRecord = { kind: RecordKind; item_id: string; status: RecordStatus; score?: number | null; detail?: any; updated_at?: string; completed_at?: string | null };
export type QuizSummary = { quiz_id: string; attempts: number; best: number; last: number; passed: boolean; last_at: string; wrong: string[] };
