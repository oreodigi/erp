// Helpers for practice-exercise checkers. A checker compares the practice dataset with the baseline captured
// when the exercise started, so only work the employee did during the exercise counts.
import type { CheckResult, PracticeBaseline } from './types';

const arr = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);

/** Records in `coll` that did not exist when the exercise started. */
export function created(db: any, base: PracticeBaseline, coll: string, pred: (r: any) => boolean = () => true): any[] {
  const before = new Set(base.ids[coll] || []);
  return arr(db, coll).filter((r) => r && !before.has(r.id) && pred(r));
}

/** Records whose `status` differs from the status they had at start (new records included). */
export function changed(db: any, base: PracticeBaseline, coll: string, pred: (r: any, oldStatus: string | undefined) => boolean = () => true): any[] {
  const old = base.status[coll] || {};
  return arr(db, coll).filter((r) => r && (old[r.id] === undefined || old[r.id] !== String(r.status ?? '')) && pred(r, old[r.id]));
}

/** Records touched in any way relevant to the predicate: new, or existing ones that now match it. */
export function touched(db: any, base: PracticeBaseline, coll: string, pred: (r: any, oldStatus: string | undefined) => boolean): any[] {
  const old = base.status[coll] || {};
  return arr(db, coll).filter((r) => r && pred(r, old[r.id]));
}

export const pass = (found: string): CheckResult => ({ ok: true, found });
export const notYet = (found = 'Not done yet'): CheckResult => ({ ok: false, found });

/** Collections and the status field captured for every exercise (cheap: ids + status only). */
export const DEFAULT_WATCH = ['orders', 'lrs', 'bills', 'clientPayments', 'loadPlans', 'trips', 'tripExpenses', 'grns', 'dgrns', 'dcs', 'schedules', 'jobcards', 'pos', 'inwards', 'tpSlips', 'customers', 'rateContracts', 'stock'];

/** Flat copy of a record: primitive fields as-is, object/array fields as presence flags (true/false). */
export function flat(r: any): Record<string, any> {
  const o: Record<string, any> = {};
  for (const [k, v] of Object.entries(r || {})) o[k] = v === null || v === undefined ? v : typeof v === 'object' ? (Array.isArray(v) ? v.length > 0 : true) : v;
  return o;
}

/** The record as it was when the exercise started (flat), or undefined if it is new. */
export const before = (base: PracticeBaseline, coll: string, id: string): Record<string, any> | undefined => base.snap?.[coll]?.[id];

/** Records where `field` changed since the start (new records count when the predicate holds). */
export function fieldChanged(db: any, base: PracticeBaseline, coll: string, field: string, pred: (r: any) => boolean = () => true): any[] {
  return arr(db, coll).filter((r) => { if (!r?.id || !pred(r)) return false; const b = before(base, coll, r.id); const now = flat(r)[field]; return !b || b[field] !== now; });
}

export function captureBaseline(db: any, watch: string[], startedAt: string): PracticeBaseline {
  const ids: Record<string, string[]> = {}, status: Record<string, Record<string, string>> = {}, snap: Record<string, Record<string, Record<string, any>>> = {};
  for (const c of new Set([...DEFAULT_WATCH, ...watch])) {
    const a = arr(db, c).filter((r) => r?.id);
    ids[c] = a.map((r) => r.id);
    status[c] = Object.fromEntries(a.map((r) => [r.id, String(r.status ?? '')]));
    snap[c] = Object.fromEntries(a.map((r) => [r.id, flat(r)]));
  }
  return { ids, status, snap, startedAt };
}
