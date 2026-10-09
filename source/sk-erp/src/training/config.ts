// Readiness scoring configuration. The server copy (app.training_settings 'readiness') overrides these defaults,
// and admins edit it from Admin › Training dashboard. Components must read thresholds from here – never hard-code them.
export type ReadinessSettings = {
  /** weight of each evidence type in the readiness %; integers summing to 100 */
  weights: { lessons: number; tours: number; practice: number; quiz: number; workflow: number };
  /** readiness % at which the status moves up: Learning ≥ learning, Practising ≥ practising, Assessment Pending ≥ assessment, Ready ≥ ready */
  thresholds: { learning: number; practising: number; assessment: number; ready: number };
  /** quiz pass mark (%) */
  passPct: number;
  /** minimum share of required practice exercises (%) that must be passed before an employee can be Ready */
  minPracticePct: number;
};

export const DEFAULT_READINESS: ReadinessSettings = {
  weights: { lessons: 25, tours: 10, practice: 30, quiz: 25, workflow: 10 },
  thresholds: { learning: 1, practising: 35, assessment: 60, ready: 85 },
  passPct: 70,
  minPracticePct: 60,
};

/** Quiz sizes: how many questions are drawn from a pool for one attempt. */
export const QUIZ_DRAW = { module: 10, workflow: 6, final: 15 } as const;

export function normaliseSettings(v: any): ReadinessSettings {
  const d = DEFAULT_READINESS;
  if (!v || typeof v !== 'object') return d;
  const num = (x: any, f: number) => (Number.isFinite(Number(x)) ? Number(x) : f);
  return {
    weights: { lessons: num(v.weights?.lessons, d.weights.lessons), tours: num(v.weights?.tours, d.weights.tours), practice: num(v.weights?.practice, d.weights.practice), quiz: num(v.weights?.quiz, d.weights.quiz), workflow: num(v.weights?.workflow, d.weights.workflow) },
    thresholds: { learning: num(v.thresholds?.learning, d.thresholds.learning), practising: num(v.thresholds?.practising, d.thresholds.practising), assessment: num(v.thresholds?.assessment, d.thresholds.assessment), ready: num(v.thresholds?.ready, d.thresholds.ready) },
    passPct: num(v.passPct, d.passPct),
    minPracticePct: num(v.minPracticePct, d.minPracticePct),
  };
}

/** Same rules the API enforces on PUT /api/training/settings. Returns an error message or null. */
export function validateSettings(s: ReadinessSettings): string | null {
  const w = Object.values(s.weights);
  if (w.some((x) => !Number.isInteger(x) || x < 0 || x > 100)) return 'Weights must be whole numbers from 0 to 100.';
  if (w.reduce((a, b) => a + b, 0) !== 100) return 'Weights must add up to 100.';
  const t = s.thresholds;
  if ([t.learning, t.practising, t.assessment, t.ready].some((x) => !Number.isInteger(x) || x < 0 || x > 100)) return 'Thresholds must be whole numbers from 0 to 100.';
  if (!(t.learning < t.practising && t.practising < t.assessment && t.assessment < t.ready)) return 'Thresholds must increase: Learning < Practising < Assessment < Ready.';
  if (!Number.isInteger(s.passPct) || s.passPct < 40 || s.passPct > 100) return 'Pass mark must be 40–100%.';
  if (!Number.isInteger(s.minPracticePct) || s.minPracticePct < 0 || s.minPracticePct > 100) return 'Minimum practice must be 0–100%.';
  return null;
}
