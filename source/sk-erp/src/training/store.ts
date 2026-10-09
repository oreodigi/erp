// Training progress store. Source of truth is PostgreSQL (/api/training/*) for the signed-in employee, so progress
// follows them to any device. Writes are optimistic; failed writes are queued and retried. If the server does not
// have the training API yet (older deployment → 404), the store runs in 'local' mode and says so in the UI.
import { create } from 'zustand';
import { fetchTrainingMe, saveTrainingRecord, resetTrainingKind, saveQuizAttempt, type TrainingRecordDTO } from '../lib/api';
import { DEFAULT_READINESS, normaliseSettings, type ReadinessSettings } from './config';
import { recKey, toQuizMap, type RecordMap } from './progress';
import { mergeAttempt } from './quiz';
import type { QuizSummary, RecordKind, RecordStatus, TrainingRecord } from './types';

type Mode = 'idle' | 'loading' | 'server' | 'local';
type Pending = { type: 'record'; body: any } | { type: 'quiz'; body: any };
type TS = {
  mode: Mode; owner: string; records: RecordMap; quizzes: Record<string, QuizSummary>; settings: ReadinessSettings; error: string; pending: Pending[];
  load: (owner: string) => Promise<void>;
  clear: () => void;
  record: (kind: RecordKind, item_id: string, status: RecordStatus, score?: number | null, detail?: any) => Promise<void>;
  resetKind: (kind: 'onboarding' | 'tour' | 'hint') => Promise<void>;
  submitQuiz: (a: { quiz_id: string; score: number; correct: number; total: number; passed: boolean; wrong: string[]; duration_seconds?: number }) => Promise<QuizSummary>;
  setSettings: (s: ReadinessSettings) => void;
};

const LS = (owner: string) => `skt-training-${owner.toLowerCase()}`;
const readLocal = (owner: string) => { try { return JSON.parse(localStorage.getItem(LS(owner)) || 'null'); } catch { return null; } };
const writeLocal = (owner: string, v: any) => { try { localStorage.setItem(LS(owner), JSON.stringify(v)); } catch { /* quota/blocked */ } };
const isMissingApi = (e: any) => e?.status === 404 || e?.status === 405;
const nowIso = () => new Date().toISOString();
const DONE = new Set(['completed', 'passed', 'understood', 'heard', 'dismissed', 'skipped']);

export const useTraining = create<TS>()((set, get) => {
  const persistLocal = () => { const s = get(); if (s.owner) writeLocal(s.owner, { mode: s.mode, records: s.records, quizzes: s.quizzes, pending: s.pending }); };
  const flush = async () => {
    const s = get(); if (s.mode !== 'server' || !s.pending.length) return;
    const left: Pending[] = [];
    for (const p of s.pending) {
      try { if (p.type === 'record') await saveTrainingRecord(p.body); else await saveQuizAttempt(p.body); }
      catch (e: any) { if (e?.status && e.status >= 400 && e.status < 500 && e.status !== 401) continue; left.push(p); }
    }
    set({ pending: left }); persistLocal();
  };
  return {
    mode: 'idle', owner: '', records: {}, quizzes: {}, settings: DEFAULT_READINESS, error: '', pending: [],
    clear: () => set({ mode: 'idle', owner: '', records: {}, quizzes: {}, settings: DEFAULT_READINESS, error: '', pending: [] }),
    load: async (owner) => {
      const cached = readLocal(owner);
      set({ mode: 'loading', owner, error: '', pending: cached?.pending || [], records: cached?.records || {}, quizzes: cached?.quizzes || {} });
      try {
        const d = await fetchTrainingMe();
        const records: RecordMap = {};
        for (const r of d.records as TrainingRecordDTO[]) records[recKey(r.kind, r.item_id)] = r as TrainingRecord;
        // Unsent local changes win over the server copy until they are flushed.
        for (const p of get().pending) if (p.type === 'record') records[recKey(p.body.kind, p.body.item_id)] = { ...records[recKey(p.body.kind, p.body.item_id)], ...p.body, updated_at: p.body.updated_at || nowIso() };
        set({ mode: 'server', records, quizzes: toQuizMap(d.quizzes as any), settings: normaliseSettings(d.settings?.readiness) });
        persistLocal();
        await flush();
      } catch (e: any) {
        if (isMissingApi(e)) set({ mode: 'local', error: 'Training progress is saved on this device until the server update is installed.' });
        else set({ mode: cached ? 'local' : 'local', error: e?.message || 'Training service unavailable – progress is kept on this device and sent when the server is back.' });
      }
    },
    record: async (kind, item_id, status, score = null, detail) => {
      const key = recKey(kind, item_id);
      const prev = get().records[key];
      const at = nowIso();
      const rec: TrainingRecord = { kind, item_id, status, score: score ?? prev?.score ?? null, detail: detail ?? prev?.detail, updated_at: at, completed_at: DONE.has(status) ? at : status === 'failed' ? null : prev?.completed_at ?? null };
      set({ records: { ...get().records, [key]: rec } });
      const body: any = { kind, item_id, status }; if (score !== null && score !== undefined) body.score = score; if (detail !== undefined) body.detail = detail;
      if (get().mode !== 'server') { set({ pending: [...get().pending.filter((p) => !(p.type === 'record' && p.body.kind === kind && p.body.item_id === item_id)), { type: 'record', body }] }); persistLocal(); return; }
      try { const saved = await saveTrainingRecord(body); set({ records: { ...get().records, [key]: saved as TrainingRecord } }); persistLocal(); }
      catch (e: any) { if (isMissingApi(e)) set({ mode: 'local' }); set({ pending: [...get().pending, { type: 'record', body }] }); persistLocal(); }
    },
    resetKind: async (kind) => {
      const records = Object.fromEntries(Object.entries(get().records).filter(([, r]) => r.kind !== kind));
      set({ records, pending: get().pending.filter((p) => !(p.type === 'record' && p.body.kind === kind)) }); persistLocal();
      if (get().mode === 'server') { try { await resetTrainingKind(kind); } catch { /* local view already reset */ } }
    },
    submitQuiz: async (a) => {
      const optimistic = mergeAttempt(get().quizzes[a.quiz_id], a.quiz_id, a);
      set({ quizzes: { ...get().quizzes, [a.quiz_id]: optimistic } });
      if (get().mode !== 'server') { set({ pending: [...get().pending, { type: 'quiz', body: a }] }); persistLocal(); return optimistic; }
      try { const { summary } = await saveQuizAttempt(a); set({ quizzes: { ...get().quizzes, [a.quiz_id]: summary as QuizSummary } }); persistLocal(); return summary as QuizSummary; }
      catch (e: any) { if (isMissingApi(e)) set({ mode: 'local' }); set({ pending: [...get().pending, { type: 'quiz', body: a }] }); persistLocal(); return optimistic; }
    },
    setSettings: (s) => set({ settings: s }),
  };
});

/** Convenience selectors */
export const useRecord = (kind: string, id: string) => useTraining((s) => s.records[recKey(kind, id)]);
export const hasRecord = (kind: string, id: string, statuses?: string[]) => { const r = useTraining.getState().records[recKey(kind, id)]; return !!r && (!statuses || statuses.includes(r.status)); };
