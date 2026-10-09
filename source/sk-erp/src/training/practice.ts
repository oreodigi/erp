// Practice sandbox + exercise runner.
// Practice always runs on the sample dataset (store source 'sample'), which is kept in this browser only – the store
// refuses to send it to the shared PostgreSQL ERP state (see isServerBacked in store/store.ts). An exercise captures a
// baseline of the practice data when it starts; each step's checker compares the current practice data with it.
import { create } from 'zustand';
import { useStore, useUI } from '../store/store';
import { captureBaseline } from './check';
import { EXERCISE_BY_ID } from './registry';
import { useTraining } from './store';
import type { CheckResult, Exercise, PracticeBaseline } from './types';

export type StepState = { id: string; task: string; expected: string; screen: string; result: CheckResult | null };
type Session = { exerciseId: string; baseline: PracticeBaseline; startedAt: string; ctx: Record<string, any>; checkedAt: string | null; steps: StepState[]; minimized: boolean };
type PS = {
  session: Session | null;
  /** switch the whole ERP to practice (sample) data */
  enter: () => Promise<void>;
  /** back to the shared company data (reloads it from the server) */
  exit: () => Promise<void>;
  /** wipe practice data back to the original sample set */
  resetData: () => Promise<void>;
  start: (exerciseId: string) => Promise<void>;
  check: () => { passed: boolean; steps: StepState[] };
  finish: () => Promise<boolean>;
  abandon: () => void;
  setMin: (m: boolean) => void;
};

export const inPractice = () => useStore.getState().source !== 'legacy';

export function evaluate(ex: Exercise, db: any, baseline: PracticeBaseline, ctx: Record<string, any>): StepState[] {
  return ex.steps.map((st) => {
    let result: CheckResult;
    try { result = st.check(db, baseline, ctx); } catch (e) { result = { ok: false, found: 'Could not check this step yet' }; }
    return { id: st.id, task: st.task, expected: st.expected, screen: st.screen, result };
  });
}

export const usePractice = create<PS>()((set, get) => ({
  session: null,
  enter: async () => { if (!inPractice()) await useStore.getState().switchSource('sample'); },
  exit: async () => { set({ session: null }); if (inPractice()) await useStore.getState().switchSource('legacy'); },
  resetData: async () => {
    if (!inPractice()) return; // resetting is only ever allowed on practice data
    await useStore.getState().reset();
    const s = get().session;
    if (s) { const ex = EXERCISE_BY_ID.get(s.exerciseId); if (ex) set({ session: { ...s, baseline: captureBaseline(useStore.getState().db, ex.watch || [], new Date().toISOString()), steps: s.steps.map((x) => ({ ...x, result: null })) } }); }
  },
  start: async (exerciseId) => {
    const ex = EXERCISE_BY_ID.get(exerciseId);
    if (!ex) return;
    await get().enter();
    const db = useStore.getState().db;
    const startedAt = new Date().toISOString();
    set({ session: { exerciseId, baseline: captureBaseline(db, ex.watch || [], startedAt), startedAt, ctx: {}, checkedAt: null, steps: ex.steps.map((s) => ({ id: s.id, task: s.task, expected: s.expected, screen: s.screen, result: null })), minimized: false } });
    void useTraining.getState().record('exercise', exerciseId, 'started');
    useUI.getState().nav(ex.steps[0].screen);
  },
  check: () => {
    const s = get().session; const ex = s && EXERCISE_BY_ID.get(s.exerciseId);
    if (!s || !ex) return { passed: false, steps: [] };
    const steps = evaluate(ex, useStore.getState().db, s.baseline, s.ctx);
    set({ session: { ...s, steps, checkedAt: new Date().toISOString() } });
    return { passed: steps.every((x) => x.result?.ok), steps };
  },
  finish: async () => {
    const s = get().session; if (!s) return false;
    const { passed, steps } = get().check();
    const done = steps.filter((x) => x.result?.ok).length;
    const score = steps.length ? Math.round((done / steps.length) * 100) : 0;
    const detail = { steps: steps.map((x) => ({ id: x.id, ok: !!x.result?.ok, found: String(x.result?.found || '').slice(0, 160) })) };
    await useTraining.getState().record('exercise', s.exerciseId, passed ? 'passed' : 'failed', score, detail);
    if (passed) set({ session: null });
    return passed;
  },
  abandon: () => set({ session: null }),
  setMin: (m) => { const s = get().session; if (s) set({ session: { ...s, minimized: m } }); },
}));
