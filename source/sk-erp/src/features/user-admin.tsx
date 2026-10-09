// Users & Access › Users – server-backed login accounts (app.users via /api/admin/users).
// Rules mirror api/users.mjs: superadmin and admin manage accounts; an admin cannot touch a Super Admin account or grant
// Super Admin; nobody can deactivate, delete or demote themselves; the last active Super Admin is protected.
// Temporary passwords are shown once and never stored in component state after the reveal closes.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDB, useUI, usePrincipal } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Card, KV, Avatar, FormSection, Skeleton } from '../components/ui';
import { DataTable, type Col } from '../components/DataTable';
import { useT } from '../lib/useT';
import { cls, fmtDT } from '../lib/util';
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, resetAdminUserPassword, fetchTrainingTeam, fetchTrainingSettings, type AdminAuthUser, type AdminUserInput } from '../lib/api';
import { normaliseSettings, DEFAULT_READINESS } from '../training/config';
import { STATUS_TONE, type Progress } from '../training/progress';
import { Drawer, Modal, SERVER_ROLES, roleLabel, employeeProgress, When, PasswordReveal, Reason, Notice, toastError, errMsg, relTime } from './admin-ui/shared';
import { PermissionEditor, normaliseOverrides } from './admin-ui/PermissionEditor';
import { Users as UsersIcon, UserPlus, UserCheck, UserX, KeyRound, Trash2, Pencil, GraduationCap, ShieldCheck, Lock, RefreshCw, Clock, AlertTriangle, Eye, EyeOff, Info } from 'lucide-react';

const MANAGER_ROLES = new Set(['superadmin', 'admin']);
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+ -]*$/;
const BRANCH_RE = /^[A-Za-z0-9_-]{0,12}$/;
const passwordOk = (p: string) => p.length >= 12 && p.length <= 256 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);
const lower = (s: any) => String(s ?? '').toLowerCase();
const isSuper = (u: { role: string }) => lower(u.role) === 'superadmin';
/** Soft-deleted usernames are renamed to <name>.deleted.<id>; show the original name. */
const displayUsername = (u: AdminAuthUser) => (u.deleted_at ? u.username.replace(/\.deleted\.\d+$/i, '') : u.username);
const nameOf = (u: AdminAuthUser) => u.full_name || displayUsername(u);

type AccountStatus = 'Active' | 'Inactive' | 'Must change password' | 'Deleted';
const statusOf = (u: AdminAuthUser): AccountStatus => (u.deleted_at ? 'Deleted' : !u.active ? 'Inactive' : u.must_change_password ? 'Must change password' : 'Active');
const STATUS_TONES: Record<AccountStatus, string> = { Active: 'ok', Inactive: 'muted', 'Must change password': 'warn', Deleted: 'bad' };

type Guard = { edit: string | null; role: string | null; toggle: string | null; reset: string | null; remove: string | null };

export function UserManagement() {
  const t = useT();
  const principal = usePrincipal((s) => s.principal);
  const actorRole = lower(principal?.role);
  const canManage = MANAGER_ROLES.has(actorRole);
  const route = useUI((s) => s.route);
  if (!canManage) {
    return (
      <div>
        <PageHeader eyebrow={t('Users & Access')} title={t('Users')} subtitle={t('Login accounts for the ERP.')} />
        <Notice icon={Lock} title={t('An administrator manages logins')} body={<>{t('Creating accounts, changing roles or permissions, and resetting passwords is done by an Admin or Super Admin. Ask your administrator if someone needs access or is locked out.')} {t('To change your own password, use Change Password.')}</>}
          action={<div className="flex flex-wrap gap-2"><button className="btn-ghost btn-sm" onClick={() => useUI.getState().nav('access/password')}><KeyRound size={13} /> {t('Change Password')}</button>{['hr', 'manager'].includes(actorRole) && <button className="btn-ghost btn-sm" onClick={() => useUI.getState().nav('admin/training')}><GraduationCap size={13} /> {t('Training Dashboard')}</button>}</div>} />
      </div>
    );
  }
  return <UserAdmin key={route} actorId={String(principal?.id ?? '')} actorSuper={actorRole === 'superadmin'} />;
}

function UserAdmin({ actorId, actorSuper }: { actorId: string; actorSuper: boolean }) {
  const t = useT();
  const db = useDB();
  const { toast, ask, nav } = useUI.getState();
  const [users, setUsers] = useState<AdminAuthUser[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [progress, setProgress] = useState<Map<string, Progress> | null>(null);
  const [trainingError, setTrainingError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fRole, setFRole] = useState('');
  const [fBranch, setFBranch] = useState('');
  const [fStatus, setFStatus] = useState('current');
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; user?: AdminAuthUser } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ username: string; password: string; reason: 'create' | 'reset' } | null>(null);
  const [resetFor, setResetFor] = useState<AdminAuthUser | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminAuthUser | null>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { users } = await fetchAdminUsers(true);
      setUsers(users);
      // Readiness needs the training engine: fetch the team once and join by id. Failure only hides readiness.
      try {
        const [team, s] = await Promise.all([fetchTrainingTeam(), fetchTrainingSettings().catch(() => ({ readiness: DEFAULT_READINESS }))]);
        const settings = normaliseSettings(s.readiness);
        const byId = new Map(users.map((u) => [String(u.id), u]));
        setProgress(new Map(team.map((m) => { const u = byId.get(m.id); return [m.id, employeeProgress({ role: m.role, extra: u?.extra_permissions, denied: u?.denied_permissions, records: m.records, quizzes: m.quizzes }, settings).progress]; })));
        setTrainingError(false);
      } catch { setTrainingError(true); }
    } catch (e) { setLoadError(errMsg(e)); setUsers((u) => u || []); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const branches = useMemo(() => {
    const list = (db.branches || []).map((b: any) => {
      const code = [b.id, b.short, b.code].map((x) => String(x ?? '')).find((x) => x && BRANCH_RE.test(x)) || '';
      return { value: code, label: `${b.name || code}${code ? ` (${code})` : ''}` };
    }).filter((b: any) => b.value);
    return list as { value: string; label: string }[];
  }, [db.branches]);
  const branchName = useCallback((code?: string) => { if (!code) return ''; const b = (db.branches || []).find((x: any) => [x.id, x.short, x.code].map(String).includes(code)); return b?.name || code; }, [db.branches]);

  const all = users || [];
  const current = all.filter((u) => !u.deleted_at);
  const activeSupers = current.filter((u) => u.active && isSuper(u)).length;

  const guard = useCallback((u: AdminAuthUser): Guard => {
    const self = String(u.id) === actorId;
    const lastSuper = isSuper(u) && u.active && activeSupers <= 1;
    const protectedSuper = isSuper(u) && !actorSuper ? t('Only a Super Admin can change a Super Admin account.') : null;
    if (u.deleted_at) { const r = t('This account was deleted. Its training history is kept.'); return { edit: r, role: r, toggle: r, reset: r, remove: r }; }
    return {
      edit: protectedSuper,
      role: protectedSuper || (self ? t('You cannot change your own role.') : lastSuper ? t('This is the last active Super Admin. Add another Super Admin first.') : null),
      toggle: protectedSuper || (u.active ? (lastSuper ? t('This is the last active Super Admin. Add another Super Admin first.') : self ? t('You cannot deactivate your own account.') : null) : null),
      reset: protectedSuper || (!u.active ? t('Activate the account before resetting its password.') : null),
      remove: protectedSuper || (lastSuper ? t('This is the last active Super Admin. Add another Super Admin first.') : self ? t('You cannot delete your own account.') : null),
    };
  }, [actorId, actorSuper, activeSupers, t]);

  const rows = useMemo(() => all.filter((u) => {
    const st = statusOf(u);
    if (fStatus === 'deleted' ? st !== 'Deleted' : st === 'Deleted') return false;
    if (fStatus === 'active' && !u.active) return false;
    if (fStatus === 'inactive' && st !== 'Inactive') return false;
    if (fStatus === 'must' && st !== 'Must change password') return false;
    if (fStatus === 'never' && u.last_login_at) return false;
    if (fRole && lower(u.role) !== fRole) return false;
    if (fBranch && (u.branch_code || '') !== (fBranch === '-' ? '' : fBranch)) return false;
    return true;
  }), [all, fStatus, fRole, fBranch]);

  const run = async (label: string, fn: () => Promise<any>, ok: string, body?: string) => {
    setBusy(true);
    try { await fn(); toast(ok, 'ok', body); await load(); return true; }
    catch (e) { toastError(label, e); await load(); return false; }
    finally { setBusy(false); }
  };
  const toggleActive = (u: AdminAuthUser) => ask({
    title: u.active ? t('Deactivate {name}?', { name: nameOf(u) }) : t('Activate {name}?', { name: nameOf(u) }),
    body: u.active ? t('They are signed out on every device straight away and cannot sign in until an administrator activates the account again. Their records and training history are kept.') : t('They can sign in again with their current password.'),
    confirmLabel: u.active ? t('Deactivate') : t('Activate'), tone: u.active ? 'bad' : 'primary',
    onConfirm: () => void run(t('Account update failed'), () => updateAdminUser(u.id, { active: !u.active }), u.active ? t('Account deactivated') : t('Account activated'), displayUsername(u)),
  });
  const openTraining = (u: AdminAuthUser) => nav('admin/training', { user: String(u.id) });

  const roleOpts = SERVER_ROLES.map(([value, label]) => ({ value, label: t(label) }));
  const usedBranches = [...new Set(all.map((u) => u.branch_code || ''))];
  const branchFilterOpts = [...branches.filter((b) => usedBranches.includes(b.value)), ...usedBranches.filter((c) => c && !branches.some((b) => b.value === c)).map((c) => ({ value: c, label: c })), ...(usedBranches.includes('') ? [{ value: '-', label: t('No branch') }] : [])];

  const cols: Col<AdminAuthUser>[] = [
    { key: 'name', label: t('Employee'), mobile: 'title', value: (u) => `${nameOf(u)} ${displayUsername(u)}`, render: (u) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="hidden md:inline-flex"><Avatar name={nameOf(u)} size={30} /></span>
        <div className="min-w-0"><div className="font-semibold truncate">{nameOf(u)}{String(u.id) === actorId && <span className="ml-1.5 chip bg-violet/10 text-violet">{t('You')}</span>}</div><div className="text-[11.5px] text-muted font-mono truncate">{displayUsername(u)}</div></div>
      </div>) },
    { key: 'role', label: t('Role'), mobile: 'sub', value: (u) => roleLabel(u.role), render: (u) => <span className="inline-flex items-center gap-1">{isSuper(u) && <ShieldCheck size={13} className="text-brand" />}{t(roleLabel(u.role))}</span> },
    { key: 'branch', label: t('Branch'), mobile: 'hide', value: (u) => branchName(u.branch_code) },
    { key: 'dept', label: t('Department / designation'), mobile: 'hide', value: (u) => [u.department, u.designation].filter(Boolean).join(' · '), render: (u) => u.department || u.designation ? <div className="min-w-0"><div className="truncate">{u.department || '—'}</div><div className="text-[11.5px] text-muted truncate">{u.designation}</div></div> : <span className="text-faint">—</span> },
    { key: 'status', label: t('Status'), mobile: 'meta', value: (u) => statusOf(u), render: (u) => <StatusBadge s={t(statusOf(u))} tone={STATUS_TONES[statusOf(u)]} /> },
    { key: 'login', label: t('Last login'), mobile: 'meta', value: (u) => u.last_login_at || '', render: (u) => <span className="md:block"><span className="md:hidden text-muted">{t('Login')}: {u.last_login_at ? t(relTime(u.last_login_at)) : t('Never')}</span><span className="hidden md:block"><When d={u.last_login_at} /></span></span> },
    { key: 'training', label: t('Training'), mobile: 'meta', sortable: false, value: (u) => progress?.get(String(u.id))?.readinessPct ?? '', render: (u) => <TrainingCell u={u} p={progress?.get(String(u.id))} /> },
  ];

  const k = {
    total: current.length, active: current.filter((u) => u.active).length, inactive: current.filter((u) => !u.active).length,
    must: current.filter((u) => u.active && u.must_change_password).length, never: current.filter((u) => !u.last_login_at).length,
  };
  const detail = detailId ? all.find((u) => String(u.id) === detailId) || null : null;

  return (
    <div>
      <PageHeader eyebrow={t('Users & Access')} title={t('Users')} subtitle={t('Login accounts, roles, menu access and passwords. Passwords are never shown after they are issued.')}
        actions={<>
          <button className="btn-ghost" onClick={() => void load()} disabled={busy} aria-label={t('Refresh')}><RefreshCw size={14} /><span className="hidden sm:inline">{t('Refresh')}</span></button>
          <button className="btn-primary" onClick={() => setForm({ mode: 'create' })}><UserPlus size={15} /> {t('Add user')}</button>
        </>} />
      {loadError && <div className="mb-4"><Notice icon={AlertTriangle} tone="bad" title={t('Could not load users')} body={loadError} action={<button className="btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={13} /> {t('Try again')}</button>} /></div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <KPI label={t('Total users')} value={users ? k.total : '…'} icon={UsersIcon} onClick={() => setFStatus('current')} />
        <KPI label={t('Active')} value={users ? k.active : '…'} icon={UserCheck} tone="ok" onClick={() => setFStatus('active')} />
        <KPI label={t('Inactive')} value={users ? k.inactive : '…'} icon={UserX} tone="muted" onClick={() => setFStatus('inactive')} />
        <KPI label={t('Must change password')} value={users ? k.must : '…'} icon={KeyRound} tone="warn" onClick={() => setFStatus('must')} />
        <KPI label={t('Never logged in')} value={users ? k.never : '…'} icon={Clock} tone="info" onClick={() => setFStatus('never')} />
      </div>
      {trainingError && <p className="text-[12px] text-muted mb-3 flex items-center gap-1.5"><Info size={13} /> {t('Training readiness is not available right now. Lesson and quiz counts are still shown.')}</p>}
      {!users ? <Card><div className="grid gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div></Card> : (
        <DataTable id="server-users" rows={rows} cols={cols} pageSize={25} onRow={(u) => setDetailId(String(u.id))}
          toolbar={<div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select className="input h-8 w-auto max-w-[46%] sm:max-w-none" value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label={t('Status')}>
              <option value="current">{t('All current')}</option><option value="active">{t('Active')}</option><option value="inactive">{t('Inactive')}</option>
              <option value="must">{t('Must change password')}</option><option value="never">{t('Never logged in')}</option><option value="deleted">{t('Deleted')}</option>
            </select>
            <select className="input h-8 w-auto max-w-[46%] sm:max-w-none" value={fRole} onChange={(e) => setFRole(e.target.value)} aria-label={t('Role')}>
              <option value="">{t('All roles')}</option>{roleOpts.filter((o) => all.some((u) => lower(u.role) === o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input h-8 w-auto max-w-[46%] sm:max-w-none" value={fBranch} onChange={(e) => setFBranch(e.target.value)} aria-label={t('Branch')}>
              <option value="">{t('All branches')}</option>{branchFilterOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>}
          rowActions={(u) => { const g = guard(u); return [
            { label: t('Edit'), icon: Pencil, hidden: !!g.edit, onClick: () => setForm({ mode: 'edit', user: u }) },
            { label: t('Reset password'), icon: KeyRound, hidden: !!g.reset, onClick: () => setResetFor(u) },
            { label: u.active ? t('Deactivate') : t('Activate'), icon: u.active ? UserX : UserCheck, hidden: !!g.toggle, tone: u.active ? 'bad' : undefined, onClick: () => toggleActive(u) },
            { label: t('Open training profile'), icon: GraduationCap, onClick: () => openTraining(u) },
            { label: t('Delete'), icon: Trash2, tone: 'bad', hidden: !!g.remove, onClick: () => setDeleteFor(u) },
          ]; }}
          empty={<div className="py-10 text-center text-[13px] text-muted">{fStatus === 'deleted' ? t('No deleted accounts.') : t('No users match these filters.')}</div>} />
      )}

      {detail && <UserDetail u={detail} g={guard(detail)} p={progress?.get(String(detail.id))} self={String(detail.id) === actorId} branch={branchName(detail.branch_code)} onClose={() => setDetailId(null)}
        onEdit={() => setForm({ mode: 'edit', user: detail })} onReset={() => setResetFor(detail)} onToggle={() => toggleActive(detail)} onDelete={() => setDeleteFor(detail)} onTraining={() => openTraining(detail)} />}

      {form && <UserForm mode={form.mode} user={form.user} actorSuper={actorSuper} actorId={actorId} guard={form.user ? guard(form.user) : null} branches={branches} existing={all}
        onClose={() => setForm(null)}
        onSaved={async (res) => { setForm(null); if (res?.temporaryPassword) setReveal({ username: res.user.username, password: res.temporaryPassword, reason: 'create' }); await load(); }} />}

      {resetFor && <ResetDialog u={resetFor} onClose={() => setResetFor(null)} onDone={async (r) => { setResetFor(null); setReveal({ username: r.user.username, password: r.temporaryPassword, reason: 'reset' }); toast(t('Password reset'), 'ok', t('Copy the temporary password now. It cannot be viewed again.')); await load(); }} onError={() => void load()} />}

      {deleteFor && <DeleteDialog u={deleteFor} onClose={() => setDeleteFor(null)} onDone={async () => { const name = displayUsername(deleteFor); setDeleteFor(null); setDetailId(null); toast(t('Account deleted'), 'ok', t('{name} can no longer sign in. Training and audit history are kept.', { name })); await load(); }} onError={() => void load()} />}

      <PasswordReveal data={reveal} onClose={() => setReveal(null)} />
    </div>
  );
}

function TrainingCell({ u, p }: { u: AdminAuthUser; p?: Progress }) {
  const t = useT();
  const tr = u.training;
  return (
    <div className="min-w-0 text-[12px] inline-flex md:flex flex-wrap md:flex-col gap-x-2 gap-y-0.5 items-center md:items-start">
      {p ? <StatusBadge s={`${t(p.status)} · ${Math.round(p.readinessPct)}%`} tone={STATUS_TONE[p.status]} /> : null}
      <span className="text-muted whitespace-nowrap" title={t('Lessons completed · quizzes passed')}>{t('{l} lessons · {q} quizzes', { l: tr?.lessons_completed ?? 0, q: tr?.quizzes_passed ?? 0 })}</span>
      {tr?.last_activity_at && <span className="text-faint whitespace-nowrap hidden md:inline" title={fmtDT(tr.last_activity_at)}>{t('Active')} {t(relTime(tr.last_activity_at))}</span>}
    </div>
  );
}

function ActionRow({ icon: Icon, label, reason, onClick, tone, testId }: { icon: any; label: string; reason: string | null; onClick: () => void; tone?: 'bad'; testId?: string }) {
  return (
    <div className="flex flex-col">
      <button type="button" data-testid={testId} className={cls('justify-start w-full', tone === 'bad' ? 'btn-ghost text-bad' : 'btn-ghost')} disabled={!!reason} onClick={onClick} title={reason || undefined} aria-describedby={reason ? `${testId}-why` : undefined}>
        <Icon size={14} /> {label}
      </button>
      {reason && <Reason className="px-1" ><span id={`${testId}-why`}>{reason}</span></Reason>}
    </div>
  );
}

function UserDetail({ u, g, p, self, branch, onClose, onEdit, onReset, onToggle, onDelete, onTraining }: { u: AdminAuthUser; g: Guard; p?: Progress; self: boolean; branch: string; onClose: () => void; onEdit: () => void; onReset: () => void; onToggle: () => void; onDelete: () => void; onTraining: () => void }) {
  const t = useT();
  const st = statusOf(u);
  return (
    <Drawer open onClose={onClose} width="max-w-xl" title={nameOf(u)} subtitle={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono">{displayUsername(u)}</span><StatusBadge s={t(st)} tone={STATUS_TONES[st]} />{self && <span className="chip bg-violet/10 text-violet">{t('You')}</span>}</span>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <Card title={t('Profile')}>
          <KV items={[
            [t('Role'), t(roleLabel(u.role))], [t('Branch'), branch || '—'], [t('Department'), u.department || '—'], [t('Designation'), u.designation || '—'],
            [t('Email'), u.email || '—'], [t('Phone'), u.phone || '—'], [t('Last login'), <When d={u.last_login_at} />], [t('Created'), fmtDT(u.created_at)],
            ...(u.deleted_at ? [[t('Deleted'), fmtDT(u.deleted_at)] as [string, React.ReactNode]] : []),
          ]} />
        </Card>
        <Card title={t('Menu access')} subtitle={t('Role default plus personal changes')}>
          {!(u.extra_permissions?.length || u.denied_permissions?.length) ? <p className="text-[13px] text-muted">{t('Follows the role’s default menu. No personal changes.')}</p> : (
            <div className="flex flex-wrap gap-1.5">
              {(u.extra_permissions || []).map((k) => <span key={'+' + k} className="chip bg-ok/10 text-ok font-mono">+ {k}</span>)}
              {(u.denied_permissions || []).map((k) => <span key={'-' + k} className="chip bg-bad/10 text-bad font-mono">− {k}</span>)}
            </div>
          )}
        </Card>
        <Card title={t('Training')} actions={<button className="btn-ghost btn-sm" onClick={onTraining}><GraduationCap size={13} /> {t('Open training profile')}</button>}>
          <KV cols={2} items={[
            [t('Readiness'), p ? <StatusBadge s={`${t(p.status)} · ${Math.round(p.readinessPct)}%`} tone={STATUS_TONE[p.status]} /> : '—'],
            [t('Lessons completed'), u.training?.lessons_completed ?? 0], [t('Quizzes passed'), u.training?.quizzes_passed ?? 0],
            [t('Last training activity'), <When d={u.training?.last_activity_at} empty="No activity yet" />],
          ]} />
        </Card>
        {!u.deleted_at && (
          <Card title={t('Actions')}>
            <div className="grid gap-2">
              <ActionRow testId="act-edit" icon={Pencil} label={t('Edit details and access')} reason={g.edit} onClick={onEdit} />
              <ActionRow testId="act-reset" icon={KeyRound} label={t('Reset password')} reason={g.reset} onClick={onReset} />
              <ActionRow testId="act-toggle" icon={u.active ? UserX : UserCheck} label={u.active ? t('Deactivate account') : t('Activate account')} reason={g.toggle} onClick={onToggle} tone={u.active ? 'bad' : undefined} />
              <ActionRow testId="act-delete" icon={Trash2} label={t('Delete account')} reason={g.remove} onClick={onDelete} tone="bad" />
            </div>
          </Card>
        )}
      </div>
    </Drawer>
  );
}

type FormState = { username: string; full_name: string; role: string; branch_code: string; email: string; phone: string; department: string; designation: string; password: string; extra: string[]; denied: string[] };

function validate(f: FormState, mode: 'create' | 'edit', existing: AdminAuthUser[], selfId?: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (mode === 'create') {
    if (!USERNAME_RE.test(f.username) || /\.deleted\.\d+$/i.test(f.username)) e.username = 'Use 3–64 characters: letters, numbers, dot, dash or underscore.';
    else if (existing.some((u) => !u.deleted_at && lower(u.username) === lower(f.username))) e.username = 'This username is already taken.';
    if (f.password && !passwordOk(f.password)) e.password = 'At least 12 characters, with letters and numbers.';
  }
  const n = f.full_name.trim();
  if (n.length < 1 || n.length > 120) e.full_name = 'Enter the full name (up to 120 characters).';
  if (!f.role) e.role = 'Choose a role.';
  if (f.email.trim() && (f.email.trim().length > 160 || !EMAIL_RE.test(f.email.trim()))) e.email = 'Enter a valid email, or leave it empty.';
  if (f.phone.trim().length > 20 || !PHONE_RE.test(f.phone.trim())) e.phone = 'Up to 20 digits; + - and spaces allowed.';
  if (!BRANCH_RE.test(f.branch_code.trim())) e.branch_code = 'Branch code: up to 12 letters, numbers, - or _.';
  if (f.department.trim().length > 80) e.department = 'Up to 80 characters.';
  if (f.designation.trim().length > 80) e.designation = 'Up to 80 characters.';
  return e;
}
const sameSet = (a: string[] = [], b: string[] = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function UserForm({ mode, user, actorSuper, actorId, guard, branches, existing, onClose, onSaved }: { mode: 'create' | 'edit'; user?: AdminAuthUser; actorSuper: boolean; actorId: string; guard: Guard | null; branches: { value: string; label: string }[]; existing: AdminAuthUser[]; onClose: () => void; onSaved: (r: { user: AdminAuthUser; temporaryPassword?: string } | null) => void }) {
  const t = useT();
  const { ask, toast } = useUI.getState();
  const [f, setF] = useState<FormState>(() => ({
    username: user?.username || '', full_name: user?.full_name || '', role: lower(user?.role) || 'operator', branch_code: user?.branch_code || '', email: user?.email || '', phone: user?.phone || '',
    department: user?.department || '', designation: user?.designation || '', password: '', extra: user?.extra_permissions || [], denied: user?.denied_permissions || [],
  }));
  const [touched, setTouched] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<'details' | 'access'>('details');
  const set = (k: keyof FormState, v: any) => setF((p) => ({ ...p, [k]: v }));
  const errors = validate(f, mode, existing, actorId);
  const err = (k: string) => (touched && errors[k] ? t(errors[k]) : undefined);
  const self = !!user && String(user.id) === actorId;
  const roleLocked = mode === 'edit' && !!guard?.role;
  const roleOptions = SERVER_ROLES.filter(([v]) => v !== 'superadmin' || actorSuper || lower(user?.role) === 'superadmin').map(([value, label]) => ({ value, label: t(label) }));
  const ov = normaliseOverrides(f.role, f.extra, f.denied);
  const roleChanged = mode === 'edit' && lower(user?.role) !== f.role;
  const permChanged = mode === 'edit' && (!sameSet(ov.extra, user?.extra_permissions) || !sameSet(ov.denied, user?.denied_permissions));
  const branchOpts = [...branches, ...(f.branch_code && !branches.some((b) => b.value === f.branch_code) ? [{ value: f.branch_code, label: f.branch_code }] : [])];

  const submit = async () => {
    setTouched(true);
    if (Object.keys(errors).length) { toast(t('Check the highlighted fields'), 'warn', Object.values(errors).map((x) => t(x))[0]); if (errors.username || errors.full_name || errors.role || errors.email || errors.phone || errors.password || errors.branch_code) setSection('details'); return; }
    const profile = { full_name: f.full_name.trim(), branch_code: f.branch_code.trim(), email: f.email.trim(), phone: f.phone.trim(), department: f.department.trim(), designation: f.designation.trim() };
    if (mode === 'create') {
      const body: AdminUserInput = { username: f.username.trim(), role: f.role, ...profile, extra_permissions: ov.extra, denied_permissions: ov.denied, ...(f.password ? { password: f.password } : {}) };
      setSaving(true);
      try { const r = await createAdminUser(body); toast(t('User created'), 'ok', r.user.username); onSaved(r); }
      catch (e) { toastError(t('Could not create user'), e); }
      finally { setSaving(false); }
      return;
    }
    if (!user) return;
    const patch: AdminUserInput = {};
    (Object.keys(profile) as (keyof typeof profile)[]).forEach((k) => { if ((user[k] || '') !== profile[k]) (patch as any)[k] = profile[k]; });
    if (roleChanged && !roleLocked) patch.role = f.role;
    if (!sameSet(ov.extra, user.extra_permissions)) patch.extra_permissions = ov.extra;
    if (!sameSet(ov.denied, user.denied_permissions)) patch.denied_permissions = ov.denied;
    if (!Object.keys(patch).length) { toast(t('No changes to save'), 'info'); onClose(); return; }
    const save = async () => {
      setSaving(true);
      try { const r = await updateAdminUser(user.id, patch); toast(t('User updated'), 'ok', (patch.role || patch.extra_permissions || patch.denied_permissions) ? t('{name} has been signed out and must sign in again.', { name: user.username }) : user.username); onSaved(r); }
      catch (e) { toastError(t('Could not update user'), e); }
      finally { setSaving(false); }
    };
    if (patch.role || patch.extra_permissions || patch.denied_permissions) {
      ask({ title: t('Sign {name} out?', { name: user.full_name || user.username }), tone: 'primary', confirmLabel: t('Save and sign out'),
        body: self ? t('You changed your own menu access. Saving signs you out on every device; sign in again to continue.') : t('Changing the role or menu access signs this person out on every device. They will see the new menu when they sign in again.'),
        onConfirm: () => void save() });
    } else void save();
  };

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={mode === 'create' ? t('Add user') : t('Edit {name}', { name: user?.full_name || user?.username || '' })}
      subtitle={mode === 'create' ? t('Creates a login. A temporary password is shown once after saving.') : <span className="font-mono">{user?.username}</span>}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={saving}>{t('Cancel')}</button><button className="btn-primary" onClick={() => void submit()} disabled={saving} data-testid="user-form-save">{saving ? t('Saving…') : mode === 'create' ? t('Create user') : t('Save changes')}</button></>}>
      <div className="px-4 sm:px-5 pt-3 sticky top-0 bg-bg z-10 border-b border-line">
        <div className="flex gap-1" role="tablist">
          {(['details', 'access'] as const).map((k) => <button key={k} role="tab" aria-selected={section === k} className={cls('tab', section === k && 'tab-active')} onClick={() => setSection(k)}>{k === 'details' ? t('Details') : t('Menu access')}{k === 'access' && (ov.extra.length + ov.denied.length) > 0 && <span className="ml-1.5 text-[10.5px] px-1.5 rounded-full bg-violet/10 text-violet tnum">{ov.extra.length + ov.denied.length}</span>}</button>)}
        </div>
      </div>
      <div className="p-4 sm:p-5 grid gap-5">
        {(roleChanged || permChanged) && (
          <div className="flex items-start gap-2.5 rounded-lg bg-warn/[.08] border border-warn/25 p-3 text-[12.5px]"><AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" /><span>{self ? t('Saving these access changes will sign you out.') : t('Saving a role or menu change signs this person out on every device.')}</span></div>
        )}
        {section === 'details' ? <>
          <FormSection title={t('Login')} cols={2}>
            <Field label={t('Username')} required={mode === 'create'} error={err('username')} hint={mode === 'create' ? t('Letters, numbers, dot, dash or underscore. Cannot be changed later.') : t('Usernames cannot be changed.')}>
              <Input value={f.username} onChange={(e) => set('username', e.target.value)} disabled={mode === 'edit'} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="e.g. ravi.patil" aria-invalid={!!err('username')} />
            </Field>
            <Field label={t('Role')} required error={err('role')} hint={roleLocked ? guard?.role || undefined : f.role === 'superadmin' ? t('Super Admin can manage every account, including other Super Admins.') : undefined}>
              <Select native value={f.role} onChange={(e) => set('role', e.target.value)} disabled={roleLocked} options={roleOptions} aria-label={t('Role')} />
            </Field>
            {mode === 'create' && (
              <Field label={t('Password (optional)')} error={err('password')} hint={t('Leave empty to generate a strong temporary password. The employee must change it at first sign-in.')} className="sm:col-span-2">
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" className="pr-10" aria-invalid={!!err('password')} />
                  <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon h-7 w-7" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t('Hide password') : t('Show password')}>{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </Field>
            )}
          </FormSection>
          <FormSection title={t('Employee')} cols={2}>
            <Field label={t('Full name')} required error={err('full_name')}><Input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} autoComplete="off" aria-invalid={!!err('full_name')} /></Field>
            <Field label={t('Branch')} error={err('branch_code')}>
              {branchOpts.length ? <Select value={f.branch_code} onChange={(e) => set('branch_code', e.target.value)} options={branchOpts} placeholder={t('No branch')} aria-label={t('Branch')} />
                : <Input value={f.branch_code} onChange={(e) => set('branch_code', e.target.value)} placeholder="e.g. JL" maxLength={12} />}
            </Field>
            <Field label={t('Department')} error={err('department')}><Input value={f.department} onChange={(e) => set('department', e.target.value)} maxLength={80} /></Field>
            <Field label={t('Designation')} error={err('designation')}><Input value={f.designation} onChange={(e) => set('designation', e.target.value)} maxLength={80} /></Field>
            <Field label={t('Email')} error={err('email')}><Input type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" aria-invalid={!!err('email')} /></Field>
            <Field label={t('Phone')} error={err('phone')}><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} aria-invalid={!!err('phone')} /></Field>
          </FormSection>
          <button type="button" className="btn-subtle btn-sm justify-self-start" onClick={() => setSection('access')}>{t('Next: menu access')} →</button>
        </> : (
          <FormSection title={t('Menu access for {role}', { role: t(roleLabel(f.role)) })} cols={1} desc={t('The role decides the default menu. Tick or untick screens to change it for this person only.')}>
            <PermissionEditor role={f.role} extra={ov.extra} denied={ov.denied} onChange={(v) => setF((p) => ({ ...p, extra: v.extra, denied: v.denied }))} />
          </FormSection>
        )}
      </div>
    </Drawer>
  );
}

function ResetDialog({ u, onClose, onDone, onError }: { u: AdminAuthUser; onClose: () => void; onDone: (r: { user: AdminAuthUser; temporaryPassword: string }) => void; onError: () => void }) {
  const t = useT();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const bad = !!pw && !passwordOk(pw);
  const go = async () => {
    if (bad) return;
    setBusy(true);
    try { onDone(await resetAdminUserPassword(u.id, pw || undefined)); }
    catch (e) { toastError(t('Password reset failed'), e); onError(); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={t('Reset password · {name}', { name: u.username })}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={busy}>{t('Cancel')}</button><button className="btn-primary" disabled={busy || bad} onClick={() => void go()} data-testid="reset-confirm"><KeyRound size={14} /> {busy ? t('Resetting…') : t('Reset password')}</button></>}>
      <div className="grid gap-3">
        <p className="text-[13px] text-muted">{t('The current password stops working at once and {name} is signed out on every device. They must choose a new password at their next sign-in.', { name: nameOf(u) })}</p>
        <Field label={t('New temporary password (optional)')} error={bad ? t('At least 12 characters, with letters and numbers.') : undefined} hint={t('Leave empty to generate a strong one.')}>
          <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function DeleteDialog({ u, onClose, onDone, onError }: { u: AdminAuthUser; onClose: () => void; onDone: () => void; onError: () => void }) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const match = typed.trim() === u.username;
  const go = async () => {
    if (!match) return;
    setBusy(true);
    try { await deleteAdminUser(u.id); onDone(); }
    catch (e) { toastError(t('Could not delete account'), e); onError(); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={t('Delete {name}?', { name: nameOf(u) })}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={busy}>{t('Cancel')}</button><button className="btn-bad" disabled={!match || busy} onClick={() => void go()} data-testid="delete-confirm"><Trash2 size={14} /> {busy ? t('Deleting…') : t('Delete account')}</button></>}>
      <div className="grid gap-3">
        <div className="flex items-start gap-2.5 rounded-lg bg-bad/[.06] border border-bad/25 p-3 text-[12.5px]"><AlertTriangle size={15} className="text-bad shrink-0 mt-0.5" />
          <span>{t('The login is closed and the person is signed out everywhere. Their training and audit history are kept, and the username can be used again for a new account. This cannot be undone from the ERP.')}</span></div>
        <Field label={t('Type the username {name} to confirm', { name: u.username })}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label={t('Type the username to confirm')} onKeyDown={(e) => e.key === 'Enter' && void go()} />
        </Field>
      </div>
    </Modal>
  );
}
