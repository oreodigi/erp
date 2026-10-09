// Administration › Training Dashboard (admin/training) and Training Coverage (admin/training-coverage).
// Readiness is computed in the browser with the same engine the Academy uses (curriculum + computeProgress), from the
// server's training records and the readiness settings stored in app.training_settings.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUI, usePrincipal } from '../store/store';
import { PageHeader, KPI, StatusBadge, Card, Progress as Bar, Tabs, Field, Input, Skeleton, Avatar } from '../components/ui';
import { DataTable, type Col } from '../components/DataTable';
import { useT } from '../lib/useT';
import { cls, fmtDT } from '../lib/util';
import { fetchTrainingTeam, fetchTrainingSettings, saveTrainingSettings, fetchTrainingUser, fetchAdminUsers, type TeamMember } from '../lib/api';
import { normaliseSettings, validateSettings, DEFAULT_READINESS, type ReadinessSettings } from '../training/config';
import { STATUS_TONE, READINESS_ORDER, isDone, lessonDone, toRecordMap, type Progress, type ReadinessStatus } from '../training/progress';
import type { Curriculum } from '../training/curriculum';
import { SCREEN_BY_ID, LESSON_BY_ID, EXERCISE_BY_ID, QUIZ_BY_ID, QUESTIONS, EXERCISES, screenLessonId } from '../training/registry';
import { MODULES, moduleTitle } from '../training/modules';
import { findItem } from '../nav';
import { PAGES } from '../pages';
import { Drawer, roleLabel, roleCodeLabel, employeeProgress, When, Ring, Notice, toastError, errMsg, relTime } from './admin-ui/shared';
import { GraduationCap, Users, CheckCircle2, Hourglass, BookOpen, CircleDashed, Gauge, RefreshCw, Lock, AlertTriangle, XCircle, Check, X, SlidersHorizontal, Target, ListChecks, Minus, Info, RotateCcw } from 'lucide-react';

const VIEW_ROLES = new Set(['superadmin', 'admin', 'manager', 'hr']);
const SETTINGS_ROLES = new Set(['superadmin', 'admin']);
const lower = (s: any) => String(s ?? '').toLowerCase();
const BANDS = [{ key: '0', label: '0–25%', min: 0, max: 25 }, { key: '25', label: '25–50%', min: 25, max: 50 }, { key: '50', label: '50–75%', min: 50, max: 75 }, { key: '75', label: '75–100%', min: 75, max: 100.01 }];
const quizTitle = (id: string, c?: Curriculum) => (c && id === c.required.final ? c.final.title : id.startsWith('final.') ? 'Final role assessment' : QUIZ_BY_ID.get(id)?.title || id);
const lessonTitle = (id: string) => LESSON_BY_ID.get(id)?.title || id;

type Row = { m: TeamMember; c: Curriculum; p: Progress; name: string };

// =====================================================================================================================
// Training Dashboard
// =====================================================================================================================
export function TrainingDashboard() {
  const t = useT();
  const principal = usePrincipal((s) => s.principal);
  const role = lower(principal?.role);
  const params = useUI((s) => s.params);
  const canView = VIEW_ROLES.has(role);
  const canEdit = SETTINGS_ROLES.has(role);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [settings, setSettings] = useState<ReadinessSettings>(DEFAULT_READINESS);
  const [overrides, setOverrides] = useState<Map<string, { extra: string[]; denied: string[] }>>(new Map());
  const [error, setError] = useState('');
  const [tab, setTab] = useState('people');
  const [fRole, setFRole] = useState('');
  const [fBranch, setFBranch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fBand, setFBand] = useState('');
  const [sort, setSort] = useState('readiness');
  const [openId, setOpenId] = useState<string | null>(params?.user ? String(params.user) : null);

  useEffect(() => { if (params?.user) setOpenId(String(params.user)); }, [params?.user]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [tm, s] = await Promise.all([fetchTrainingTeam(), fetchTrainingSettings().catch(() => ({ readiness: DEFAULT_READINESS }))]);
      setSettings(normaliseSettings(s.readiness));
      setTeam(tm);
      // Per-user menu overrides change the curriculum. Only admins can read them; others use the role default.
      if (canEdit) fetchAdminUsers().then(({ users }) => setOverrides(new Map(users.map((u) => [String(u.id), { extra: u.extra_permissions || [], denied: u.denied_permissions || [] }])))).catch(() => { /* role default */ });
    } catch (e) { setError(errMsg(e)); setTeam((x) => x || []); }
  }, [canEdit]);
  useEffect(() => { if (canView) void load(); }, [canView, load]);

  const rows: Row[] = useMemo(() => (team || []).map((m) => {
    const o = overrides.get(m.id);
    const { curriculum, progress } = employeeProgress({ role: m.role, extra: o?.extra, denied: o?.denied, records: m.records, quizzes: m.quizzes }, settings);
    return { m, c: curriculum, p: progress, name: m.full_name || m.username };
  }), [team, settings, overrides]);

  const filtered = useMemo(() => {
    const band = BANDS.find((b) => b.key === fBand);
    const out = rows.filter((r) => (!fRole || lower(r.m.role) === fRole) && (!fBranch || (r.m.branch_code || '-') === fBranch) && (!fStatus || r.p.status === fStatus) && (!band || (r.p.completionPct >= band.min && r.p.completionPct < band.max)));
    const by: Record<string, (a: Row, b: Row) => number> = {
      readiness: (a, b) => b.p.readinessPct - a.p.readinessPct || a.name.localeCompare(b.name),
      readinessAsc: (a, b) => a.p.readinessPct - b.p.readinessPct || a.name.localeCompare(b.name),
      completion: (a, b) => b.p.completionPct - a.p.completionPct || a.name.localeCompare(b.name),
      activity: (a, b) => String(b.m.last_activity_at || '').localeCompare(String(a.m.last_activity_at || '')) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...out].sort(by[sort] || by.readiness);
  }, [rows, fRole, fBranch, fStatus, fBand, sort]);

  if (!canView) {
    return (
      <div>
        <PageHeader eyebrow={t('Administration')} title={t('Training Dashboard')} />
        <Notice icon={Lock} title={t('Managers, HR and administrators only')} body={t('This dashboard shows every employee’s training. Your own progress is in Help & Training.')} action={<button className="btn-ghost btn-sm" onClick={() => useUI.getState().nav('help')}><GraduationCap size={13} /> {t('Open Help & Training')}</button>} />
      </div>
    );
  }

  const count = (s: ReadinessStatus[]) => rows.filter((r) => s.includes(r.p.status)).length;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.p.readinessPct, 0) / rows.length) : 0;
  const roles = [...new Set(rows.map((r) => lower(r.m.role)))].sort((a, b) => roleLabel(a).localeCompare(roleLabel(b)));
  const branches = [...new Set(rows.map((r) => r.m.branch_code || '-'))].sort();
  const openRow = openId ? rows.find((r) => r.m.id === openId) : undefined;
  const closeProfile = () => { setOpenId(null); if (useUI.getState().params?.user) useUI.getState().set({ params: {} }); };

  const cols: Col<Row>[] = [
    { key: 'name', label: t('Employee'), mobile: 'title', value: (r) => `${r.name} ${r.m.username}`, render: (r) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="hidden md:inline-flex"><Avatar name={r.name} size={30} /></span>
        <div className="min-w-0"><div className="font-semibold truncate">{r.name}{!r.m.active && <span className="ml-1.5 chip bg-surface2 text-muted border border-line">{t('Inactive')}</span>}</div><div className="text-[11.5px] text-muted truncate"><span className="font-mono">{r.m.username}</span><span className="md:hidden"> · {t(roleLabel(r.m.role))}{r.m.branch_code ? ` · ${r.m.branch_code}` : ''}</span></div></div>
      </div>) },
    { key: 'role', label: t('Role'), mobile: 'hide', value: (r) => roleLabel(r.m.role), render: (r) => <span className="whitespace-nowrap">{t(roleLabel(r.m.role))}</span> },
    { key: 'branch', label: t('Branch'), mobile: 'hide', value: (r) => r.m.branch_code || '—' },
    { key: 'completion', label: t('Completion'), mobile: 'meta', value: (r) => r.p.completionPct, render: (r) => <div className="w-full md:w-28 min-w-[120px]"><div className="flex justify-between text-[11.5px] mb-1"><span className="text-muted md:hidden">{t('Completion')}</span><span className="tnum font-semibold">{Math.round(r.p.completionPct)}%</span></div><Bar value={r.p.completionPct} tone={r.p.status === 'Ready' ? 'ok' : 'violet'} /></div> },
    { key: 'readiness', label: t('Readiness'), mobile: 'right', value: (r) => r.p.readinessPct, render: (r) => <div className="flex md:flex-col items-end md:items-start gap-1"><span className="tnum font-semibold">{Math.round(r.p.readinessPct)}%</span><span className="hidden md:inline"><StatusBadge s={t(r.p.status)} tone={STATUS_TONE[r.p.status]} /></span></div> },
    { key: 'status', label: t('Status'), mobile: 'meta', hidden: true, value: (r) => r.p.status, render: (r) => <StatusBadge s={t(r.p.status)} tone={STATUS_TONE[r.p.status]} /> },
    { key: 'lessons', label: t('Lessons'), align: 'right', mobile: 'meta', value: (r) => r.p.lessons.pct, render: (r) => <Count label={t('Lessons')} d={r.p.lessons.done} n={r.p.lessons.total} /> },
    { key: 'practice', label: t('Practice'), align: 'right', mobile: 'meta', value: (r) => r.p.practice.pct, render: (r) => <Count label={t('Practice')} d={r.p.practice.done} n={r.p.practice.total} /> },
    { key: 'quiz', label: t('Quizzes'), align: 'right', mobile: 'meta', value: (r) => r.p.quizzes.pct, render: (r) => <Count label={t('Quizzes')} d={r.p.quizzes.done} n={r.p.quizzes.total} /> },
    { key: 'final', label: t('Final assessment'), mobile: 'meta', value: (r) => (r.p.finalPassed ? 2 : r.p.finalBest !== null ? 1 : 0), render: (r) => <FinalBadge c={r.c} p={r.p} /> },
    { key: 'activity', label: t('Last activity'), mobile: 'meta', value: (r) => r.m.last_activity_at || '', render: (r) => <><span className="md:hidden text-[11.5px] text-muted">{r.m.last_activity_at ? t(relTime(r.m.last_activity_at)) : t('No activity yet')}</span><span className="hidden md:block"><When d={r.m.last_activity_at} empty="No activity yet" /></span></> },
  ];

  return (
    <div>
      <PageHeader eyebrow={t('Administration')} title={t('Training Dashboard')} subtitle={t('Who is ready for their job, who is stuck, and what each person should do next. Readiness uses lessons, screen tours, practice, quizzes and workflows.')}
        actions={<button className="btn-ghost" onClick={() => void load()} aria-label={t('Refresh')}><RefreshCw size={14} /><span className="hidden sm:inline">{t('Refresh')}</span></button>} />
      {error && <div className="mb-4"><Notice icon={AlertTriangle} tone="bad" title={t('Could not load training data')} body={error} action={<button className="btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={13} /> {t('Try again')}</button>} /></div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <KPI label={t('Employees')} value={team ? rows.length : '…'} icon={Users} onClick={() => setFStatus('')} />
        <KPI label={t('Ready')} value={team ? count(['Ready']) : '…'} icon={CheckCircle2} tone="ok" onClick={() => setFStatus('Ready')} />
        <KPI label={t('Assessment Pending')} value={team ? count(['Assessment Pending']) : '…'} icon={Hourglass} tone="warn" onClick={() => setFStatus('Assessment Pending')} />
        <KPI label={t('Practising / Learning')} value={team ? count(['Practising', 'Learning']) : '…'} icon={BookOpen} tone="info" sub={team ? <span>{count(['Practising'])} {t('practising')} · {count(['Learning'])} {t('learning')}</span> : undefined} />
        <KPI label={t('Not Started')} value={team ? count(['Not Started']) : '…'} icon={CircleDashed} tone="muted" onClick={() => setFStatus('Not Started')} />
        <KPI label={t('Average readiness')} value={team ? `${avg}%` : '…'} icon={Gauge} tone="violet" />
      </div>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ key: 'people', label: t('Employees'), count: rows.length }, { key: 'settings', label: t('Readiness rules') }]} />
      {tab === 'settings' ? <SettingsCard settings={settings} editable={canEdit} onSaved={(s) => setSettings(s)} /> : !team ? <Card><div className="grid gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card> : (
        <DataTable id="training-team" rows={filtered} cols={cols} pageSize={25} onRow={(r) => setOpenId(r.m.id)}
          toolbar={<div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <select className="input h-8 w-auto max-w-[48%] sm:max-w-none" value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label={t('Readiness status')}><option value="">{t('All statuses')}</option>{READINESS_ORDER.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
            <select className="input h-8 w-auto max-w-[48%] sm:max-w-none" value={fBand} onChange={(e) => setFBand(e.target.value)} aria-label={t('Completion')}><option value="">{t('Any completion')}</option>{BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
            <select className="input h-8 w-auto max-w-[48%] sm:max-w-none" value={fRole} onChange={(e) => setFRole(e.target.value)} aria-label={t('Role')}><option value="">{t('All roles')}</option>{roles.map((r) => <option key={r} value={r}>{t(roleLabel(r))}</option>)}</select>
            <select className="input h-8 w-auto max-w-[48%] sm:max-w-none" value={fBranch} onChange={(e) => setFBranch(e.target.value)} aria-label={t('Branch')}><option value="">{t('All branches')}</option>{branches.map((b) => <option key={b} value={b}>{b === '-' ? t('No branch') : b}</option>)}</select>
            <select className="input h-8 w-auto max-w-[48%] sm:max-w-none" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('Sort by')}>
              <option value="readiness">{t('Sort: readiness (high first)')}</option><option value="readinessAsc">{t('Sort: readiness (low first)')}</option><option value="completion">{t('Sort: completion')}</option><option value="activity">{t('Sort: last activity')}</option><option value="name">{t('Sort: name')}</option>
            </select>
          </div>}
          empty={<div className="py-10 text-center text-[13px] text-muted">{rows.length ? t('No employees match these filters.') : t('No employees yet.')}</div>} />
      )}
      {openId && <TrainingProfile id={openId} row={openRow} settings={settings} overrides={overrides.get(openId)} onClose={closeProfile} />}
    </div>
  );
}

function Count({ d, n, label }: { d: number; n: number; label: string }) {
  return <span className="tnum whitespace-nowrap"><span className="md:hidden text-muted text-[11.5px]">{label} </span><span className={cls('font-semibold', n > 0 && d >= n && 'text-ok')}>{d}</span><span className="text-muted">/{n}</span></span>;
}

function FinalBadge({ c, p }: { c: Curriculum; p: Progress }) {
  const t = useT();
  if (!c.required.final) return <span className="text-faint text-[12px]">{t('Not required')}</span>;
  if (p.finalPassed) return <StatusBadge s={`${t('Passed')}${p.finalBest !== null ? ` · ${Math.round(p.finalBest)}%` : ''}`} tone="ok" />;
  if (p.finalBest !== null) return <StatusBadge s={`${t('Not passed')} · ${t('best')} ${Math.round(p.finalBest)}%`} tone="bad" />;
  return <StatusBadge s={t('Not taken')} tone="muted" />;
}

// ---------------------------------------------------------------------------------------------------------------------
// Employee training profile
// ---------------------------------------------------------------------------------------------------------------------
type Attempt = { id: string; quiz_id: string; score: number; correct: number; total: number; passed: boolean; wrong: string[]; duration_seconds: number | null; created_at: string };

function TrainingProfile({ id, row, settings, overrides, onClose }: { id: string; row?: Row; settings: ReadinessSettings; overrides?: { extra: string[]; denied: string[] }; onClose: () => void }) {
  const t = useT();
  const [data, setData] = useState<{ user: any; records: any[]; attempts: Attempt[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true; setData(null); setError('');
    fetchTrainingUser(id).then((d) => live && setData(d as any)).catch((e) => live && setError(errMsg(e)));
    return () => { live = false; };
  }, [id]);

  const view = useMemo(() => {
    if (!data) return null;
    // Quiz summaries from the attempt history (newest first), same shape as /api/training/me.
    const byQuiz = new Map<string, any>();
    for (const a of data.attempts) {
      const q = byQuiz.get(a.quiz_id);
      if (!q) byQuiz.set(a.quiz_id, { quiz_id: a.quiz_id, attempts: 1, best: a.score, last: a.score, passed: !!a.passed, last_at: a.created_at, wrong: a.wrong || [] });
      else { q.attempts++; q.best = Math.max(q.best, a.score); q.passed = q.passed || !!a.passed; }
    }
    const quizzes = [...byQuiz.values()];
    const { curriculum: c, progress: p } = employeeProgress({ role: data.user.role, extra: overrides?.extra, denied: overrides?.denied, records: data.records, quizzes }, settings);
    const recs = toRecordMap(data.records);
    const doneLessons = data.records.filter((r) => r.kind === 'lesson' && ['completed', 'passed', 'understood', 'heard'].includes(r.status));
    const requiredSet = new Set(c.required.lessons);
    const missingLessons = c.required.lessons.filter((l) => !lessonDone(recs, l));
    const tours = c.required.tours.map((s) => ({ id: s, title: SCREEN_BY_ID.get(s)?.title || s, done: isDone(recs, 'tour', s) }));
    const exIds = [...new Set([...c.required.exercises, ...data.records.filter((r) => r.kind === 'exercise').map((r) => r.item_id)])];
    const exercises = exIds.map((eid) => ({ id: eid, ex: EXERCISE_BY_ID.get(eid), rec: recs[`exercise:${eid}`], required: c.required.exercises.includes(eid) }));
    const failedEx = exercises.filter((e) => e.rec?.status === 'failed');
    const retrain: { kind: string; id: string; title: string; why: string }[] = [];
    const seen = new Set<string>();
    const add = (kind: string, rid: string, title: string, why: string) => { if (!seen.has(kind + rid)) { seen.add(kind + rid); retrain.push({ kind, id: rid, title, why }); } };
    p.weak.forEach((w) => add('lesson', w.lesson, lessonTitle(w.lesson), `Missed ${w.misses} quiz question${w.misses === 1 ? '' : 's'} on ${w.title}`));
    failedEx.forEach((e) => add('exercise', e.id, e.ex?.title || e.id, `Practice failed (${Math.round(Number(e.rec?.score || 0))}%)`));
    missingLessons.slice(0, 8).forEach((l) => add('lesson', l, lessonTitle(l), 'Required lesson not completed'));
    return { c, p, recs, quizzes, doneLessons, requiredSet, missingLessons, tours, exercises, retrain };
  }, [data, settings, overrides]);

  const u = data?.user;
  const name = u?.full_name || u?.username || row?.name || '';
  const p = view?.p;
  const verdict = (() => {
    if (!p || !u) return '';
    if (p.status === 'Ready') return t('Yes. {name} has met every readiness requirement for the {role} role.', { name, role: t(roleCodeLabel(u.role)) });
    if (p.status === 'Not Started') return t('Not yet. {name} has not started training.', { name });
    return t('Not yet. {name} is {pct}% ready ({status}). Main gap: {gap}', { name, pct: Math.round(p.readinessPct), status: t(p.status), gap: t(p.blockers[0] || 'finish the remaining required items.') });
  })();

  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={name || t('Training profile')}
      subtitle={u ? <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-mono">{String(u.username).replace(/\.deleted\.\d+$/i, '')}</span><span>· {t(roleLabel(u.role))}</span>{u.branch_code && <span>· {u.branch_code}</span>}{u.deleted_at ? <StatusBadge s={t('Deleted')} tone="bad" /> : !u.active ? <StatusBadge s={t('Inactive')} tone="muted" /> : null}</span> : undefined}>
      {error ? <div className="p-5"><Notice icon={AlertTriangle} tone="bad" title={t('Could not load this profile')} body={error} /></div> : !view || !p || !u ? (
        <div className="p-5 grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="p-4 sm:p-5 grid gap-4">
          {/* Header: readiness + verdict */}
          <section className="card p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
            <Ring value={p.readinessPct} size={84} stroke={8} tone={STATUS_TONE[p.status]} label={t('Readiness {pct}%', { pct: Math.round(p.readinessPct) })} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge s={t(p.status)} tone={STATUS_TONE[p.status]} /><span className="text-[12px] text-muted">{t('{pct}% of required items done', { pct: Math.round(p.completionPct) })}</span></div>
              <p className="font-semibold mt-1.5 text-[14px]" data-testid="ready-verdict">{t('Is this employee ready for their job?')} <span className="font-normal">{verdict}</span></p>
              {p.blockers.length > 0 && <ul className="mt-2 grid gap-1 text-[12.5px]">{p.blockers.map((b) => <li key={b} className="flex gap-1.5 text-warn"><AlertTriangle size={13} className="shrink-0 mt-0.5" /><span className="text-ink">{t(b)}</span></li>)}</ul>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                <span>{t('Last activity')}: <b className="text-ink font-medium">{row?.m.last_activity_at || p.lastActivity ? `${t(relTime(row?.m.last_activity_at || p.lastActivity))} · ${fmtDT(row?.m.last_activity_at || p.lastActivity)}` : t('None')}</b></span>
                <span>{t('Last login')}: <b className="text-ink font-medium">{u.last_login_at ? `${t(relTime(u.last_login_at))} · ${fmtDT(u.last_login_at)}` : t('Never')}</b></span>
              </div>
            </div>
          </section>

          {/* Evidence */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {([['Lessons', p.lessons], ['Screen tours', p.tours], ['Practice', p.practice], ['Quizzes', p.quizzes], ['Workflows', p.workflows]] as const).map(([l, part]) => (
              <div key={l} className="card p-3 min-w-0"><div className="text-[11px] font-semibold text-muted truncate">{t(l)}</div><div className="font-display text-[17px] font-semibold tnum mt-0.5">{part.done}<span className="text-muted text-[13px]">/{part.total}</span></div><Bar className="mt-1.5" value={part.pct} tone={part.pct >= 100 ? 'ok' : 'violet'} /></div>
            ))}
          </div>

          {view.retrain.length > 0 && (
            <Card title={t('Recommended retraining')} icon={Target} subtitle={t('Weak topics first, then failed practice, then missing lessons')}>
              <ul className="grid gap-2">{view.retrain.map((r) => (
                <li key={r.kind + r.id} className="flex items-start gap-2.5 min-w-0">
                  <span className={cls('chip shrink-0 mt-0.5', r.kind === 'exercise' ? 'bg-bad/10 text-bad' : 'bg-violet/10 text-violet')}>{r.kind === 'exercise' ? t('Practice') : t('Lesson')}</span>
                  <div className="min-w-0"><div className="text-[13px] font-medium break-words">{t(r.title)}</div><div className="text-[11.5px] text-muted">{t(r.why)}</div></div>
                </li>))}</ul>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title={t('Lessons')} icon={BookOpen} subtitle={t('{d} of {n} required done', { d: p.lessons.done, n: p.lessons.total })}>
              {view.missingLessons.length > 0 && <>
                <div className="eyebrow mb-1.5">{t('Not done yet (required)')}</div>
                <ul className="grid gap-1 mb-3 text-[12.5px]">{view.missingLessons.slice(0, 12).map((l) => <li key={l} className="flex gap-1.5 min-w-0"><Minus size={13} className="text-faint shrink-0 mt-0.5" /><span className="break-words">{t(lessonTitle(l))}</span></li>)}
                  {view.missingLessons.length > 12 && <li className="text-muted">{t('…and {n} more', { n: view.missingLessons.length - 12 })}</li>}</ul>
              </>}
              <div className="eyebrow mb-1.5">{t('Completed')}</div>
              {view.doneLessons.length === 0 ? <p className="text-[12.5px] text-muted">{t('No lessons completed yet.')}</p> : (
                <ul className="grid gap-1 text-[12.5px]">{view.doneLessons.slice(0, 15).map((r) => <li key={r.item_id} className="flex gap-1.5 min-w-0"><Check size={13} className="text-ok shrink-0 mt-0.5" /><span className="break-words flex-1">{t(lessonTitle(r.item_id))}{!view.requiredSet.has(r.item_id) && <span className="text-faint"> · {t('optional')}</span>}</span><span className="text-faint text-[11px] shrink-0">{r.completed_at ? fmtDT(r.completed_at).split(',')[0] : ''}</span></li>)}
                  {view.doneLessons.length > 15 && <li className="text-muted">{t('…and {n} more', { n: view.doneLessons.length - 15 })}</li>}</ul>
              )}
            </Card>
            <Card title={t('Screen tours')} icon={ListChecks} subtitle={t('{d} of {n} required done', { d: p.tours.done, n: p.tours.total })}>
              {view.tours.length === 0 ? <p className="text-[12.5px] text-muted">{t('No screen tours are required for this role.')}</p> : (
                <ul className="grid gap-1 text-[12.5px]">{view.tours.map((s) => <li key={s.id} className="flex gap-1.5">{s.done ? <Check size={13} className="text-ok shrink-0 mt-0.5" /> : <Minus size={13} className="text-faint shrink-0 mt-0.5" />}<span className={cls(!s.done && 'text-muted')}>{t(s.title)}</span></li>)}</ul>
              )}
            </Card>
          </div>

          <Card title={t('Practice exercises')} icon={Target} subtitle={t('{d} of {n} required passed', { d: p.practice.done, n: p.practice.total })} pad={false}>
            {view.exercises.length === 0 ? <p className="p-4 text-[12.5px] text-muted">{t('No practice exercises for this role.')}</p> : (
              <ul className="divide-y divide-line">{view.exercises.map((e) => {
                const st = e.rec?.status;
                const steps: { id: string; ok: boolean; found?: string }[] = e.rec?.detail?.steps || [];
                return (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="min-w-0 font-medium text-[13px] break-words">{t(e.ex?.title || e.id)}{!e.required && <span className="text-faint font-normal"> · {t('optional')}</span>}</div>
                      <div className="flex items-center gap-2 shrink-0">{e.rec?.score != null && <span className="tnum text-[12px] text-muted">{Math.round(Number(e.rec.score))}%</span>}<StatusBadge s={st === 'passed' ? t('Passed') : st === 'failed' ? t('Failed') : st === 'started' ? t('Started') : t('Not started')} tone={st === 'passed' ? 'ok' : st === 'failed' ? 'bad' : st === 'started' ? 'info' : 'muted'} /></div>
                    </div>
                    {steps.length > 0 && <ol className="mt-2 grid gap-1">{steps.map((s, i) => {
                      const task = e.ex?.steps.find((x) => x.id === s.id)?.task || s.id;
                      return <li key={s.id + i} className="flex gap-1.5 text-[12px] min-w-0">{s.ok ? <Check size={13} className="text-ok shrink-0 mt-0.5" /> : <X size={13} className="text-bad shrink-0 mt-0.5" />}<span className="min-w-0 break-words"><span className="text-ink">{i + 1}. {t(task)}</span>{s.found && <span className="text-muted"> – {s.found}</span>}</span></li>;
                    })}</ol>}
                  </li>
                );
              })}</ul>
            )}
          </Card>

          <Card title={t('Quiz attempts')} icon={GraduationCap} subtitle={t('{d} of {n} required quizzes passed (including the final)', { d: p.quizzes.done, n: p.quizzes.total })} pad={false}>
            {data!.attempts.length === 0 ? <p className="p-4 text-[12.5px] text-muted">{t('No quiz attempts yet.')}</p> : <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[.04em] text-muted"><th className="px-4 py-2">{t('Quiz')}</th><th className="px-3 py-2 text-right">{t('Score')}</th><th className="px-3 py-2">{t('Result')}</th><th className="px-4 py-2">{t('Date')}</th></tr></thead>
                  <tbody>{data!.attempts.slice(0, 30).map((a) => <tr key={a.id} className="border-b border-line/60"><td className="px-4 py-2">{t(quizTitle(a.quiz_id, view.c))}</td><td className="px-3 py-2 text-right tnum">{Math.round(a.score)}% <span className="text-faint">({a.correct}/{a.total})</span></td><td className="px-3 py-2"><StatusBadge s={a.passed ? t('Passed') : t('Failed')} tone={a.passed ? 'ok' : 'bad'} /></td><td className="px-4 py-2 text-muted whitespace-nowrap">{fmtDT(a.created_at)}</td></tr>)}</tbody>
                </table>
              </div>
              <ul className="sm:hidden divide-y divide-line">{data!.attempts.slice(0, 30).map((a) => <li key={a.id} className="px-4 py-2.5"><div className="flex justify-between gap-2"><span className="text-[13px] font-medium min-w-0 break-words">{t(quizTitle(a.quiz_id, view.c))}</span><StatusBadge s={a.passed ? t('Passed') : t('Failed')} tone={a.passed ? 'ok' : 'bad'} /></div><div className="text-[11.5px] text-muted mt-0.5 tnum">{Math.round(a.score)}% ({a.correct}/{a.total}) · {fmtDT(a.created_at)}</div></li>)}</ul>
            </>}
            {p.weak.length > 0 && (
              <div className="border-t border-line p-4">
                <div className="eyebrow mb-2">{t('Failed topics (latest attempts)')}</div>
                <ul className="grid gap-1.5">{p.weak.map((w) => <li key={w.screen} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]"><XCircle size={13} className="text-bad" /><span className="font-medium">{t(w.title)}</span><span className="text-muted">· {t('{n} missed', { n: w.misses })}</span><span className="text-muted">· {t('Lesson')}: {t(lessonTitle(w.lesson))}</span></li>)}</ul>
              </div>
            )}
          </Card>
          {!overrides && <p className="text-[11.5px] text-muted flex gap-1.5"><Info size={13} className="shrink-0 mt-0.5" />{t('The plan uses the role’s default menu. Personal menu changes are visible to administrators only.')}</p>}
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Readiness settings
// ---------------------------------------------------------------------------------------------------------------------
function SettingsCard({ settings, editable, onSaved }: { settings: ReadinessSettings; editable: boolean; onSaved: (s: ReadinessSettings) => void }) {
  const t = useT();
  const [f, setF] = useState<ReadinessSettings>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(settings), [settings]);
  const num = (v: string) => (v === '' ? NaN : Number(v));
  const err = validateSettings(f);
  const dirty = JSON.stringify(f) !== JSON.stringify(settings);
  const wsum = Object.values(f.weights).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const save = async () => {
    if (err) return;
    setSaving(true);
    try { const r = await saveTrainingSettings(f); onSaved(normaliseSettings(r.readiness)); useUI.getState().toast(t('Readiness rules saved'), 'ok', t('Every employee’s readiness now uses the new rules.')); }
    catch (e) { toastError(t('Could not save readiness rules'), e); }
    finally { setSaving(false); }
  };
  const box = (label: string, value: number, onChange: (n: number) => void, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input type="number" inputMode="numeric" min={0} max={100} step={1} value={Number.isFinite(value) ? value : ''} disabled={!editable} onChange={(e) => onChange(num(e.target.value))} />
    </Field>
  );
  const W = [['lessons', 'Lessons'], ['tours', 'Screen tours'], ['practice', 'Practice'], ['quiz', 'Quizzes'], ['workflow', 'Workflows']] as const;
  const T = [['learning', 'Learning from'], ['practising', 'Practising from'], ['assessment', 'Assessment Pending from'], ['ready', 'Ready from']] as const;
  return (
    <Card title={t('Readiness rules')} icon={SlidersHorizontal} subtitle={editable ? t('Used for every employee. Changes apply at once.') : t('Only an Admin or Super Admin can change these rules.')}
      actions={editable ? <button className="btn-subtle btn-sm" onClick={() => setF(DEFAULT_READINESS)}><RotateCcw size={12} /> {t('Defaults')}</button> : undefined}>
      <div className="grid gap-5">
        <fieldset className="min-w-0">
          <legend className="eyebrow mb-2 flex items-center gap-2 w-full">{t('Weights (must add up to 100)')}<span className={cls('chip ml-auto', wsum === 100 ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad')}>{t('Total')} {wsum}</span></legend>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{W.map(([k, l]) => <React.Fragment key={k}>{box(t(l), f.weights[k], (n) => setF({ ...f, weights: { ...f.weights, [k]: n } }))}</React.Fragment>)}</div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="eyebrow mb-2">{t('Status thresholds (readiness %)')}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{T.map(([k, l]) => <React.Fragment key={k}>{box(t(l), f.thresholds[k], (n) => setF({ ...f, thresholds: { ...f.thresholds, [k]: n } }))}</React.Fragment>)}</div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="eyebrow mb-2">{t('Pass rules')}</legend>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {box(t('Quiz pass mark %'), f.passPct, (n) => setF({ ...f, passPct: n }), t('40–100'))}
            {box(t('Minimum practice passed %'), f.minPracticePct, (n) => setF({ ...f, minPracticePct: n }), t('Needed before Ready'))}
          </div>
        </fieldset>
        <p className="text-[12px] text-muted">{t('Ready also needs the final role assessment passed and the minimum practice share – quiz scores alone never make someone Ready.')}</p>
        {editable && <div className="flex flex-wrap items-center gap-3 justify-end">
          {err && <span className="text-[12px] text-bad mr-auto flex items-center gap-1.5"><AlertTriangle size={13} />{t(err)}</span>}
          <button className="btn-ghost" disabled={!dirty || saving} onClick={() => setF(settings)}>{t('Undo changes')}</button>
          <button className="btn-primary" disabled={!dirty || !!err || saving} onClick={() => void save()}>{saving ? t('Saving…') : t('Save rules')}</button>
        </div>}
      </div>
    </Card>
  );
}

// =====================================================================================================================
// Training Coverage
// =====================================================================================================================
// Optional explicit exclusions (src/training/coverage-exclusions.ts). Loaded through a glob so the screen works without it.
// @ts-ignore – Vite import.meta.glob
const EXCLUSION_MODULES: Record<string, any> = import.meta.glob('../training/coverage-exclusions.ts', { eager: true });
function loadExclusions(): Map<string, string> {
  const out = new Map<string, string>();
  for (const mod of Object.values(EXCLUSION_MODULES || {})) {
    const raw = mod?.COVERAGE_EXCLUSIONS ?? mod?.EXCLUSIONS ?? mod?.default ?? Object.values(mod || {})[0];
    if (Array.isArray(raw)) raw.forEach((x: any) => (typeof x === 'string' ? out.set(x, 'Excluded') : x && (x.route || x.id) && out.set(String(x.route || x.id), String(x.reason || 'Excluded'))));
    else if (raw && typeof raw === 'object') Object.entries(raw).forEach(([k, v]: [string, any]) => out.set(k, typeof v === 'string' ? v : String(v?.reason || 'Excluded')));
  }
  return out;
}
const NAV_GROUP_MODULE: Record<string, string> = { home: 'home', comms: 'comms', 'comms-admin': 'comms', ops: 'ops', fleet: 'fleet', rail: 'rail', wh: 'wh', fin: 'fin', ws: 'ws', cust: 'cust', marketing: 'crm', hr: 'hr', payroll: 'payroll', reports: 'reports', masters: 'masters', access: 'access', superadmin: 'access', admin: 'admin' };
const COV_COLS = [['help', 'Help'], ['lesson', 'Lesson'], ['audio', 'Audio'], ['walkthrough', 'Walkthrough'], ['quiz', 'Quiz'], ['practice', 'Practice'], ['roles', 'Roles']] as const;
type CovKey = typeof COV_COLS[number][0];
type CovRow = { id: string; route: string; title: string; module: string; screenRoles: string[]; has: Record<CovKey, boolean>; missing: CovKey[]; excluded: string | null };

function buildCoverage(): CovRow[] {
  const exclusions = loadExclusions();
  const routes = Object.keys(PAGES);
  const quizScreens = new Set(QUESTIONS.flatMap((q) => q.screens || []));
  const practiceScreens = new Set(EXERCISES.flatMap((e) => e.steps.map((s) => s.screen)));
  return routes.map((route) => {
    const s = SCREEN_BY_ID.get(route);
    const has: Record<CovKey, boolean> = {
      help: !!s, lesson: LESSON_BY_ID.has(screenLessonId(route)), audio: !!s?.audio?.length, walkthrough: !!s?.walkthrough?.length,
      quiz: quizScreens.has(route), practice: practiceScreens.has(route), roles: !!s?.roles?.length,
    };
    // A route without its own training that renders the same component as a trained route is an alias.
    const aliasOf = !s ? routes.find((r) => r !== route && PAGES[r] === PAGES[route] && SCREEN_BY_ID.has(r)) : undefined;
    const excluded = exclusions.get(route) || (aliasOf ? `Alias of ${aliasOf} (same screen)` : null);
    const nav = findItem(route);
    const module = s?.module || (aliasOf && SCREEN_BY_ID.get(aliasOf)?.module) || (nav && NAV_GROUP_MODULE[nav.group]) || 'other';
    return { id: route, route, title: s?.title || nav?.label || route, module, screenRoles: s?.roles || [], has, missing: COV_COLS.map(([k]) => k).filter((k) => !has[k]), excluded };
  });
}

export function TrainingCoverage() {
  const t = useT();
  const rows = useMemo(buildCoverage, []);
  const [fModule, setFModule] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const counted = rows.filter((r) => !r.excluded);
  const full = counted.filter((r) => r.missing.length === 0).length;
  const pct = counted.length ? Math.round((full / counted.length) * 100) : 0;
  const per = COV_COLS.map(([k, l]) => ({ k, l, n: counted.filter((r) => r.has[k]).length }));
  const modules = [...new Set(rows.map((r) => r.module))].sort((a, b) => (MODULES.find((m) => m.id === a)?.order ?? 99) - (MODULES.find((m) => m.id === b)?.order ?? 99));
  const shown = rows.filter((r) => (!fModule || r.module === fModule) && (!onlyGaps || (!r.excluded && r.missing.length > 0)));
  const gapRows = counted.filter((r) => r.missing.length > 0);
  const noHelp = counted.filter((r) => !r.has.help);

  const icon = (ok: boolean, label: string) => ok ? <CheckCircle2 size={15} className="text-ok inline" aria-label={`${label}: ${t('yes')}`} /> : <XCircle size={15} className="text-bad inline" aria-label={`${label}: ${t('missing')}`} />;
  const cols: Col<CovRow>[] = [
    { key: 'title', label: t('Screen'), mobile: 'title', value: (r) => `${r.title} ${r.route}`, render: (r) => <div className="min-w-0"><div className="font-semibold truncate">{t(r.title)}</div><div className="text-[11px] text-muted font-mono truncate">{r.route}</div></div> },
    { key: 'module', label: t('Module'), mobile: 'sub', value: (r) => moduleTitle(r.module), render: (r) => <span className="text-[12px]">{t(moduleTitle(r.module))}</span> },
    ...COV_COLS.map(([k, l]) => ({ key: k, label: t(l), align: 'center' as const, mobile: 'hide' as const, value: (r: CovRow) => (r.has[k] ? 1 : 0), render: (r: CovRow) => (r.excluded ? <span className="text-faint">–</span> : k === 'roles' && r.has.roles ? <span className="text-[11px] text-muted whitespace-nowrap">{r.screenRoles.join(', ')}</span> : icon(r.has[k], l)) })),
    { key: 'state', label: t('Coverage'), mobile: 'meta', value: (r) => (r.excluded ? -1 : COV_COLS.length - r.missing.length), render: (r) => r.excluded ? <span className="chip bg-surface2 text-muted border border-line" title={r.excluded}>{t('Excluded')}: {t(r.excluded)}</span> : r.missing.length === 0 ? <StatusBadge s={t('Full')} tone="ok" /> : <span className="inline-flex flex-wrap gap-1">{r.missing.map((m) => <span key={m} className="chip bg-bad/10 text-bad">{t('No')} {t(COV_COLS.find((c) => c[0] === m)![1].toLowerCase())}</span>)}</span> },
  ];

  return (
    <div>
      <PageHeader eyebrow={t('Administration')} title={t('Training Coverage')} subtitle={t('Every ERP screen and the training it has: help text, lesson, audio, walkthrough, quiz questions, practice and role tags.')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label={t('Screens (routes)')} value={rows.length} icon={ListChecks} sub={rows.length - counted.length ? <span>{rows.length - counted.length} {t('excluded')}</span> : undefined} />
        <KPI label={t('Full coverage')} value={`${pct}%`} icon={CheckCircle2} tone={pct >= 80 ? 'ok' : 'warn'} sub={<span>{full}/{counted.length} {t('screens')}</span>} />
        <KPI label={t('Screens with gaps')} value={gapRows.length} icon={AlertTriangle} tone={gapRows.length ? 'warn' : 'ok'} onClick={() => setOnlyGaps(true)} />
        <KPI label={t('No help at all')} value={noHelp.length} icon={XCircle} tone={noHelp.length ? 'bad' : 'ok'} onClick={() => setOnlyGaps(true)} />
      </div>
      <Card title={t('Coverage by type')} className="mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-x-5 gap-y-3">
          {per.map((c) => { const v = counted.length ? (c.n / counted.length) * 100 : 0; return (
            <div key={c.k} className="min-w-0"><div className="flex justify-between text-[12px]"><span className="font-semibold">{t(c.l)}</span><span className="tnum text-muted">{c.n}/{counted.length}</span></div><Bar className="mt-1.5" value={v} tone={v >= 100 ? 'ok' : v >= 70 ? 'violet' : 'warn'} /></div>
          ); })}
        </div>
      </Card>
      <DataTable id="training-coverage" rows={shown} cols={cols} pageSize={50}
        toolbar={<div className="flex flex-wrap items-center gap-2">
          <select className="input h-8 w-auto" value={fModule} onChange={(e) => setFModule(e.target.value)} aria-label={t('Module')}><option value="">{t('All modules')}</option>{modules.map((m) => <option key={m} value={m}>{t(moduleTitle(m))}</option>)}</select>
          <label className="inline-flex items-center gap-2 text-[12.5px] cursor-pointer"><input type="checkbox" className="accent-[rgb(var(--violet))] w-4 h-4" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} />{t('Only gaps')}</label>
        </div>}
        empty={<div className="py-10 text-center text-[13px] text-muted">{onlyGaps ? t('No gaps here – every screen is fully covered.') : t('No screens match.')}</div>} />
    </div>
  );
}
