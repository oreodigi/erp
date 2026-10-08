import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, useStore, getDB, hasLegacy } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Stat, EmptyState, Tabs, Toggle, Avatar, Segmented } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal } from '../components/overlays';
import { useRole } from '../components/AppShell';
import { NAV, ALL_ITEMS } from '../nav';
import { PRINT_DOCS } from '../components/Print';
import { ImportModal } from './customers';
import { REPORTS } from './reports';
import { DEFS } from './masters';
import { fmtDate, fmtDT, ymd, sum, inr, cls, daysBetween, downloadText, saveMsg, now, fy } from '../lib/util';
import { Plus, Pencil, Trash2, KeyRound, LogIn, UserCheck, UserX, Shield, Eraser, Megaphone, Upload, Barcode, Gauge, Sparkles, Printer, Eye, RotateCcw, Download, ChevronRight, ChevronsRight, ChevronLeft, ChevronsLeft, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { fetchAdminUsers, resetAdminUserPassword, updateAdminUser, changeOwnPassword, type AdminAuthUser } from '../lib/api';

export function Users() {
  const db = useDB();
  const { set, toast, ask } = useUI.getState();
  const { role } = useRole();
  const isSuperAdmin = role.code === 'SA';
  const [form, setForm] = useState<any>(null);
  const [act, setAct] = useState('Active');
  return (
    <div>
      <PageHeader eyebrow="Users & Access" title="Users" subtitle="Application users with branch and role. Change your own password here; Super Admin manages other login accounts." actions={<div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => set({ route: 'access/password' })}>Change my password</button><button className="btn-ghost" hidden={!isSuperAdmin} onClick={() => set({ route: 'access/credentials' })}>Manage login credentials</button><button className="btn-primary" onClick={() => setForm({ company: 'skt', branchId: 'JL', roleId: (db.roles.find((r: any) => r.code === 'BU') || db.roles[0])?.id, active: true })}><Plus size={15} /> Add user</button></div>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"><KPI label="Users" value={db.users.length} /><KPI label="Active" value={db.users.filter((u: any) => u.active).length} tone="ok" /><KPI label="Roles" value={db.roles.length} /><KPI label="Logged in today" value={db.users.filter((u: any) => daysBetween(u.lastLogin) === 0).length} tone="info" /></div>
      <DataTable id="users" rows={db.users.filter((u: any) => act === 'All' || (act === 'Active' ? u.active : !u.active))} toolbar={<Segmented size="sm" options={['Active', 'Inactive', 'All']} value={act} onChange={setAct} />} cols={[{ key: 'username', label: 'User name', render: (r) => <span className="flex items-center gap-2"><Avatar name={`${r.firstName} ${r.lastName}`} size={24} /><span className="docno">{r.username}</span></span>, mobile: 'title' }, { key: 'full', label: 'Full name', value: (r) => `${r.firstName} ${r.lastName}`, mobile: 'sub' }, { key: 'role', label: 'Role', value: (r) => db.roles.find((x: any) => x.id === r.roleId)?.name, filter: true }, { key: 'branch', label: 'Branch name', value: (r) => lookup.branch(db, r.branchId)?.name, filter: true }, { key: 'email', label: 'Email' }, { key: 'lastLogin', label: 'Last login', render: (r) => fmtDT(r.lastLogin) }, { key: 'loginCount', label: 'Logins', align: 'right' }, { key: 'st', label: 'Status', value: (r) => (r.active ? 'Active' : 'Inactive'), render: (r) => <StatusBadge s={r.active ? 'Active' : 'Inactive'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setForm(r) }, { label: 'Login as user', icon: LogIn, hidden: !r.active, onClick: () => { set({ userId: r.id, route: 'dashboard' }); toast(`Logged in as ${r.firstName} ${r.lastName}`, 'info'); } }, { label: 'Change login password', icon: KeyRound, hidden: !isSuperAdmin, onClick: () => set({ route: 'access/credentials' }) }, { label: r.active ? 'Deactivate' : 'Activate', icon: r.active ? UserX : UserCheck, onClick: () => A.patch('users', r.id, { active: !r.active }) }, { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.username}?`, tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.remove('users', r.id, 'User') }) }]} />
      {form && <Drawer open onClose={() => setForm(null)} title={form.id ? `Edit ${form.username}` : 'New user'} subtitle="Legacy: MasterPages/UserDetail.aspx · UserPerRoleDetail.aspx" footer={<><button className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={() => { if (!form.username || !form.firstName) return toast('User name and first name are required', 'bad'); A.save('users', { extraMenus: [], deniedMenus: [], loginCount: 0, lastLogin: '', ...form }, 'User'); setForm(null); }}>Save</button></>}>
        <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-3">
          <Field label="User name" required><Input value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="First name" required><Input value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Middle name"><Input value={form.middleName || ''} onChange={(e) => setForm({ ...form, middleName: e.target.value })} /></Field>
          <Field label="Last name"><Input value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Company"><Select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} options={[{ value: 'skt', label: 'S.K. Translines Pvt. Ltd.' }]} /></Field>
          <Field label="Branch"><Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Role"><Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} options={db.roles.map((r: any) => ({ value: r.id, label: r.name }))} /></Field>
          <div className="sm:col-span-2"><Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" /></div>
        </div>
      </Drawer>}
    </div>
  );
}

const AUTH_ROLE_OPTIONS = [
  ['superadmin', 'Super Admin'], ['admin', 'Admin'], ['manager', 'ERP Manager'], ['operator', 'Operations'], ['accountant', 'Accountant'], ['accounts', 'Accounts'], ['customer_care', 'Customer Care'], ['branch_admin', 'Branch Admin'], ['branch_user', 'Branch User'], ['container', 'Container'], ['fleetmanager', 'Fleet Manager'], ['warehousemanager', 'Warehouse Manager'], ['workshopmanager', 'Workshop Manager'], ['storeincharge', 'Store Incharge'], ['storedirector', 'Store Director'], ['hr', 'HR'], ['onboarding', 'Onboarding'], ['dispatcher', 'Dispatcher'], ['finance_approver', 'Finance Approver'], ['customerrelations', 'Customer Relations'],
];

export function CredentialAdministration() {
  const { toast } = useUI.getState();
  const [rows, setRows] = useState<AdminAuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ user: AdminAuthUser; password: string } | null>(null);
  const [revealed, setRevealed] = useState<{ username: string; password: string } | null>(null);
  const load = async () => { setLoading(true); try { setRows((await fetchAdminUsers()).users); } catch (e) { toast('Unable to load authentication users', 'bad', e instanceof Error ? e.message : 'Request failed'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const savePassword = async () => {
    if (!dialog) return;
    try { const result = await resetAdminUserPassword(dialog.user.id, dialog.password || undefined); setDialog(null); setRevealed({ username: result.user.username, password: result.temporaryPassword }); await load(); toast('Password reset', 'ok', 'Copy the temporary password now; it cannot be viewed again.'); }
    catch (e) { toast('Password reset failed', 'bad', e instanceof Error ? e.message : 'Request failed'); }
  };
  const changeRole = async (user: AdminAuthUser, role: string) => { try { await updateAdminUser(user.id, { role }); await load(); toast('Role updated', 'ok', `${user.username} now uses ${role}.`); } catch (e) { toast('Role update failed', 'bad', e instanceof Error ? e.message : 'Request failed'); } };
  const changeActive = async (user: AdminAuthUser) => { try { await updateAdminUser(user.id, { active: !user.active }); await load(); toast(user.active ? 'Account deactivated' : 'Account activated'); } catch (e) { toast('Account update failed', 'bad', e instanceof Error ? e.message : 'Request failed'); } };
  return <div>
    <PageHeader eyebrow="Super Admin" title="Credential administration" subtitle="Manage authentication accounts and roles. Existing passwords are never displayed or recoverable." />
    <Card>
      <div className="flex items-start gap-3 rounded-lg bg-warn/[.08] border border-warn/[.25] p-3 mb-4 text-[12.5px]"><Shield size={17} className="text-warn shrink-0 mt-0.5" /><span>Reset passwords only when necessary. The new temporary password is shown once and is not written to the audit log.</span></div>
      {loading ? <div className="text-muted text-sm py-8 text-center">Loading authentication accounts…</div> : <div className="overflow-auto"><table className="w-full text-[12.5px] min-w-[760px]"><thead><tr className="border-b border-line text-left text-muted"><th className="px-3 py-2">Username</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map(user => <tr key={user.id} className="border-b border-line/60"><td className="px-3 py-2.5 font-mono font-semibold">{user.username}</td><td className="px-3 py-2.5"><Select value={user.role} onChange={e => void changeRole(user, e.target.value)} options={AUTH_ROLE_OPTIONS.map(([value, label]) => ({ value, label }))} /></td><td className="px-3 py-2.5"><StatusBadge s={user.active ? 'Active' : 'Inactive'} /></td><td className="px-3 py-2.5 text-muted">{fmtDT(user.created_at)}</td><td className="px-3 py-2.5"><div className="flex justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => void changeActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</button><button className="btn-primary btn-sm" onClick={() => setDialog({ user, password: '' })}><KeyRound size={13} /> Set / reset password</button></div></td></tr>)}</tbody></table></div>}
    </Card>
    {dialog && <Modal open onClose={() => setDialog(null)} title={`Set password · ${dialog.user.username}`} size="sm" footer={<><button className="btn-ghost" onClick={() => setDialog(null)}>Cancel</button><button className="btn-primary" onClick={() => void savePassword()}>Save password</button></>}><div className="grid gap-3"><p className="text-sm text-muted">Enter at least 12 characters, or leave blank to generate a secure temporary password.</p><Field label="New password"><Input type="password" autoComplete="new-password" value={dialog.password} onChange={e => setDialog({ ...dialog, password: e.target.value })} /></Field></div></Modal>}
    {revealed && <Modal open onClose={() => setRevealed(null)} title="Temporary password — copy now" size="sm" footer={<button className="btn-primary" onClick={() => setRevealed(null)}>Done</button>}><div className="grid gap-3"><p className="text-sm text-muted">This password is shown once. Deliver it securely to the user and ask them to change it immediately.</p><div className="rounded-lg bg-surface2 border border-line p-3 font-mono text-sm select-all break-all">{revealed.username} · {revealed.password}</div></div></Modal>}
  </div>;
}

export function Roles() {
  const db = useDB();
  const { toast } = useUI.getState();
  const [tab, setTab] = useState('matrix');
  const [rf, setRf] = useState<any>(null);
  const toggle = (role: any, key: string) => { const has = role.menus.includes(key); A.patch('roles', role.id, { menus: has ? role.menus.filter((m: string) => m !== key) : [...role.menus, key] }); };
  // menu per user
  const [uid, setUid] = useState(db.users[1]?.id);
  const u = db.users.find((x: any) => x.id === uid);
  const base = new Set(db.roles.find((r: any) => r.id === u?.roleId)?.menus || []);
  const eff = new Set([...base, ...(u?.extraMenus || [])].filter((m) => !(u?.deniedMenus || []).includes(m)));
  const [selA, setSelA] = useState<string[]>([]);
  const [selB, setSelB] = useState<string[]>([]);
  const allKeys = ALL_ITEMS.map((i) => i.key);
  const setEff = (next: Set<string>) => A.patch('users', u.id, { extraMenus: [...next].filter((m) => !base.has(m)), deniedMenus: [...base].filter((m) => !next.has(m)) });
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Users & Access" title="Roles & permissions" subtitle="Role-based menu access (legacy MenuPerRole) with per-user overrides (MenuPerUser). Changes apply immediately – switch profile from the account menu to verify." actions={<button className="btn-primary" onClick={() => setRf({ name: '', description: '', menus: ['dashboard'] })}><Plus size={15} /> Add role</button>} />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'matrix', label: 'Permission matrix' }, { key: 'roles', label: 'Roles', count: db.roles.length }, { key: 'user', label: 'Menu access per user' }]} />
      {tab === 'matrix' && <Card pad={false}><div className="overflow-auto max-h-[70vh]"><table className="text-[12px] min-w-[900px] w-full"><thead className="sticky top-0 bg-surface2 z-10"><tr><th className="text-left px-3 py-2 sticky left-0 bg-surface2 min-w-[200px]">Menu</th>{db.roles.map((r: any) => <th key={r.id} className="px-2 py-2 font-semibold text-center whitespace-nowrap">{r.name}</th>)}</tr></thead>
        <tbody>{NAV.map((g) => <React.Fragment key={g.key}><tr className="bg-surface2/60"><td colSpan={db.roles.length + 1} className="px-3 py-1.5 eyebrow">{g.label}</td></tr>{g.items.map((i) => <tr key={i.key} className="border-t border-line/60 hover:bg-surface2/50"><td className="px-3 py-1.5 sticky left-0 bg-surface">{i.label}</td>{db.roles.map((r: any) => <td key={r.id} className="text-center"><input type="checkbox" aria-label={`${r.name} – ${i.label}`} checked={r.menus.includes(i.key)} disabled={r.code === 'SA'} onChange={() => toggle(r, i.key)} className="accent-[rgb(var(--violet))]" /></td>)}</tr>)}</React.Fragment>)}</tbody></table></div></Card>}
      {tab === 'roles' && <DataTable id="roles" rows={db.roles} cols={[{ key: 'name', label: 'Role', mobile: 'title' }, { key: 'description', label: 'Description', mobile: 'sub' }, { key: 'menus', label: 'Menus', align: 'right', value: (r) => r.menus.length }, { key: 'users', label: 'Users', align: 'right', value: (r) => db.users.filter((u: any) => u.roleId === r.id).length, mobile: 'right' }]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setRf(r) }, { label: 'Delete', icon: Trash2, tone: 'bad', hidden: db.users.some((u: any) => u.roleId === r.id), onClick: () => A.remove('roles', r.id, 'Role') }]} />}
      {tab === 'user' && u && <Card>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mb-4"><Field label="User"><Select value={uid} onChange={(e) => { setUid(e.target.value); setSelA([]); setSelB([]); }} options={db.users.map((x: any) => ({ value: x.id, label: `${x.firstName} ${x.lastName} · ${db.roles.find((r: any) => r.id === x.roleId)?.name}` }))} /></Field><button className="btn-ghost" onClick={() => setPreview(true)}><Eye size={14} /> Preview menu</button></div>
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div><div className="label">Available menus</div><select multiple className="input h-72 py-1" value={selA} onChange={(e) => setSelA(Array.from(e.target.selectedOptions).map((o) => o.value))} aria-label="Available menus">{allKeys.filter((k) => !eff.has(k)).map((k) => <option key={k} value={k}>{ALL_ITEMS.find((i) => i.key === k)?.groupLabel} › {ALL_ITEMS.find((i) => i.key === k)?.label}</option>)}</select></div>
          <div className="flex md:flex-col gap-2 justify-center">
            <button className="btn-ghost btn-sm" aria-label="Add selected" onClick={() => { setEff(new Set([...eff, ...selA])); setSelA([]); }}><ChevronRight size={14} /></button>
            <button className="btn-ghost btn-sm" aria-label="Add all" onClick={() => setEff(new Set(allKeys))}><ChevronsRight size={14} /></button>
            <button className="btn-ghost btn-sm" aria-label="Remove selected" onClick={() => { setEff(new Set([...eff].filter((k) => !selB.includes(k)))); setSelB([]); }}><ChevronLeft size={14} /></button>
            <button className="btn-ghost btn-sm" aria-label="Remove all" onClick={() => setEff(new Set(['dashboard']))}><ChevronsLeft size={14} /></button>
          </div>
          <div><div className="label">Assigned to {u.firstName} ({eff.size})</div><select multiple className="input h-72 py-1" value={selB} onChange={(e) => setSelB(Array.from(e.target.selectedOptions).map((o) => o.value))} aria-label="Assigned menus">{allKeys.filter((k) => eff.has(k)).map((k) => <option key={k} value={k}>{base.has(k) ? '' : '+ '}{ALL_ITEMS.find((i) => i.key === k)?.groupLabel} › {ALL_ITEMS.find((i) => i.key === k)?.label}</option>)}</select></div>
        </div>
        <div className="flex justify-between items-center mt-3 text-[12px] text-muted"><span>“+” marks user-specific additions beyond the role.</span><button className="btn-primary btn-sm" onClick={() => toast('Menu access saved', 'ok', `${u.firstName} ${u.lastName}`)}>Submit</button></div>
        {preview && <Modal open onClose={() => setPreview(false)} title={`Menu preview · ${u.firstName}`} size="sm"><ul className="grid gap-1 text-[13px]">{NAV.map((g) => { const it = g.items.filter((i) => eff.has(i.key)); if (!it.length) return null; return <li key={g.key}><b>{g.label}</b><ul className="ml-4 text-muted">{it.map((i) => <li key={i.key}>{i.label}</li>)}</ul></li>; })}</ul></Modal>}
      </Card>}
      {rf && <Modal open onClose={() => setRf(null)} title={rf.id ? `Edit ${rf.name}` : 'New role'} size="sm" footer={<><button className="btn-ghost" onClick={() => setRf(null)}>Cancel</button><button className="btn-primary" onClick={() => { A.save('roles', { code: rf.code || rf.name.slice(0, 2).toUpperCase(), ...rf }, 'Role'); setRf(null); }}>Save</button></>}><div className="grid gap-3"><Field label="Role"><Input value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} /></Field><Field label="Description"><Textarea rows={2} value={rf.description} onChange={(e) => setRf({ ...rf, description: e.target.value })} /></Field></div></Modal>}
    </div>
  );
}

export function ChangePassword() {
  const [f, setF] = useState({ old: '', pw: '', re: '' });
  const toast = useUI((s) => s.toast);
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(f.pw)).length;
  const err = f.re && f.pw !== f.re ? 'Passwords do not match' : '';
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-lg">
      <PageHeader eyebrow="Users & Access" title="Change password" subtitle="Use at least 8 characters with a capital letter, a number and a symbol." />
      <Card><form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (!f.old) return toast('Enter your current password', 'bad'); if (score < 3) return toast('Choose a stronger password', 'bad'); if (err) return toast(err, 'bad'); setBusy(true); try { await changeOwnPassword(f.old, f.pw); toast('Password changed', 'ok', 'Use it next time you sign in'); setF({ old: '', pw: '', re: '' }); } catch (e) { toast('Password change failed', 'bad', e instanceof Error ? e.message : 'Request failed'); } finally { setBusy(false); } }}>
        <Field label="Old password"><Input id="pw-old" type="password" autoComplete="current-password" value={f.old} onChange={(e) => setF({ ...f, old: e.target.value })} /></Field>
        <Field label="New password"><Input id="pw-new" type="password" autoComplete="new-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} /></Field>
        <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cls('h-1.5 flex-1 rounded-full', i < score ? (score < 3 ? 'bg-warn' : 'bg-ok') : 'bg-line')} />)}</div>
        <Field label="Re-type password" error={err}><Input id="pw-re" type="password" autoComplete="new-password" value={f.re} onChange={(e) => setF({ ...f, re: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setF({ old: '', pw: '', re: '' })}>Cancel</button><button disabled={busy} type="submit" className="btn-primary">{busy ? 'Saving…' : 'Save'}</button></div>
      </form></Card>
    </div>
  );
}

export function Corrections() {
  const db = useDB();
  const { ask, toast, nav } = useUI.getState();
  const [tab, setTab] = useState('lr');
  const [v, setV] = useState('');
  const [trip, setTrip] = useState({ type: 'Advance', name: '', amount: '' });
  const bill = db.bills.find((b: any) => b.billNo.toLowerCase() === v.trim().toLowerCase() && !b.deleted);
  const lr = db.lrs.find((l: any) => l.lrNo.toLowerCase() === v.trim().toLowerCase());
  const T: any = { lr: ['Delete LR', 'LR number', 'SKT/JL/10419'], bill: ['Delete bill', 'Bill number', db.bills[0]?.billNo], billlr: ['Delete bill LR', 'Bill number', db.bills[0]?.billNo], ledger: ['Delete ledger entry', 'Voucher number', 'PV/611'], receipt: ['Delete payment receivable entry', 'Voucher number', 'RV/412'], logslip: ['Open log slip', 'Log slip number', db.logslips[0]?.no], updatelr: ['Update finalised LR', 'LR number', db.lrs.find((l: any) => l.isFinal && !l.billId)?.lrNo], trip: ['Update trip', '', ''] };
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Data corrections" subtitle="Controlled corrections that the legacy Admin pages provided. Every action is confirmed and written to the audit log." />
      <div className="grid lg:grid-cols-[240px_1fr] gap-4 items-start">
        <Card pad={false}><ul className="py-1">{Object.entries(T).map(([k, [l]]: any) => <li key={k}><button onClick={() => { setTab(k); setV(''); }} className={cls('w-full text-left px-4 py-2 text-[13px] hover:bg-surface2', tab === k && 'bg-violet/[.06] font-semibold text-violet')}>{l}</button></li>)}</ul></Card>
        <Card title={T[tab][0]}>
          {tab !== 'trip' ? <div className="grid gap-4 max-w-xl">
            <Field label={T[tab][1]} hint={`e.g. ${T[tab][2] || ''}`}><Input className="font-mono" value={v} onChange={(e) => setV(e.target.value)} /></Field>
            {tab === 'billlr' && bill && <div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-[12.5px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="text-left px-3 py-2">LR no.</th><th className="text-left px-2">Consignor</th><th className="text-left px-2">Consignee</th><th className="text-left px-2">From → To</th><th className="px-2" /></tr></thead><tbody>{bill.rows.map((r: any) => { const l = db.lrs.find((x: any) => x.id === r.lrId); return <tr key={r.lrId} className="border-t border-line"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-2">{lookup.cust(db, l?.consignorId)?.short}</td><td className="px-2">{lookup.cust(db, l?.consigneeId)?.short}</td><td className="px-2">{l?.source} → {l?.destination}</td><td className="px-2 text-right"><button className="btn-bad btn-sm" onClick={() => ask({ title: `Remove ${l?.lrNo} from ${bill.billNo}?`, body: 'Bill value and GST are recalculated; the LR returns to billing.', tone: 'bad', confirmLabel: 'Remove', onConfirm: () => A.removeBillLR(bill.id, r.lrId) })}>Delete</button></td></tr>; })}</tbody></table></div>}
            {tab === 'bill' && bill && <div className="text-[13px] rounded-lg bg-surface2 p-3">{lookup.custName(db, bill.clientId)} · {inr(bill.net)} · {bill.rows.length} LRs · pending {inr(bill.pending)}</div>}
            {(tab === 'lr' || tab === 'updatelr') && lr && <div className="text-[13px] rounded-lg bg-surface2 p-3">{lookup.custName(db, lr.consignorId)} · {lr.source} → {lr.destination} · <StatusBadge s={lr.status} />{lr.billId && <span className="text-bad ml-2">Billed</span>}</div>}
            <div className="flex gap-2">
              {tab === 'lr' && <button className="btn-bad" disabled={!v} onClick={() => ask({ title: `Delete LR ${v}?`, body: 'Permanently removes the LR. Billed LRs cannot be deleted.', tone: 'bad', confirmLabel: 'Delete LR', onConfirm: () => A.deleteLR(v) && setV('') })}><Trash2 size={14} /> Delete LR</button>}
              {tab === 'bill' && <button className="btn-bad" disabled={!bill} onClick={() => ask({ title: `Delete bill ${bill.billNo}?`, body: 'All LRs return to the billing queue and the sales voucher is reversed. Appears in Sale Bill Deleted report.', tone: 'bad', confirmLabel: 'Delete bill', onConfirm: () => { A.deleteBill(bill.id); setV(''); } })}><Trash2 size={14} /> Delete bill</button>}
              {tab === 'ledger' && <button className="btn-bad" disabled={!v} onClick={() => ask({ title: `Delete voucher ${v}?`, tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.deleteLedger(v) && setV('') })}><Trash2 size={14} /> Delete entry</button>}
              {tab === 'receipt' && <button className="btn-bad" disabled={!v} onClick={() => ask({ title: `Delete receipt ${v}?`, body: 'Bill outstanding is restored.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.deleteReceipt(v) && setV('') })}><Trash2 size={14} /> Delete receipt</button>}
              {tab === 'logslip' && <button className="btn-violet" disabled={!v} onClick={() => A.openLogslip(v) && setV('')}><RotateCcw size={14} /> Open log slip</button>}
              {tab === 'updatelr' && <button className="btn-violet" disabled={!lr || !!lr?.billId} onClick={() => nav('ops/lr-new', { id: lr.id })}><Pencil size={14} /> Open LR for update</button>}
            </div>
          </div> : <div className="grid gap-4 max-w-xl">
            <Field label="Update"><Radio options={['Advance', 'Onward Freight', 'Trip Opening KM']} value={trip.type} onChange={(t) => setTrip({ ...trip, type: t })} /></Field>
            <Field label="Trip name"><Select value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} placeholder="Select trip" options={db.trips.filter((t: any) => !t.logslipId).map((t: any) => ({ value: t.id, label: `${t.name} · ${lookup.truckNo(db, t.truckId)}` }))} /></Field>
            <Field label={trip.type === 'Trip Opening KM' ? 'KM' : 'Amount (₹)'}><Input type="number" value={trip.amount} onChange={(e) => setTrip({ ...trip, amount: e.target.value })} /></Field>
            <div><button className="btn-primary" disabled={!trip.name || !trip.amount} onClick={() => { A.patch('trips', trip.name, { [trip.type === 'Advance' ? 'advance' : trip.type === 'Onward Freight' ? 'onwardFreight' : 'openingKm']: Number(trip.amount) }); toast('Trip updated', 'ok'); setTrip({ ...trip, amount: '' }); }}>Update trip</button></div>
          </div>}
        </Card>
      </div>
      <div className="mt-6"><DataTable id="deleted-log" title="Correction audit log" rows={db.activity.filter((a: any) => a.module === 'Admin')} cols={[{ key: 'at', label: 'When', render: (r) => fmtDT(r.at), mobile: 'meta' }, { key: 'text', label: 'Action', mobile: 'title' }, { key: 'ref', label: 'Reference', render: (r) => <span className="docno">{r.ref}</span>, mobile: 'sub' }, { key: 'by', label: 'By' }]} /></div>
    </div>
  );
}

export function Announcements() {
  const db = useDB();
  const [tab, setTab] = useState('internal');
  const [f, setF] = useState<any>(null);
  const coll = tab === 'internal' ? 'announcements' : 'custAnnouncements';
  const targetsFor = (viewers: string) => (viewers === 'Branch' ? db.branches.map((b: any) => ({ id: b.id, label: b.name })) : viewers === 'Roles' ? db.roles.map((r: any) => ({ id: r.id, label: r.name })) : viewers === 'Users' ? db.users.map((u: any) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` })) : viewers === 'Select Customers' ? db.customers.map((c: any) => ({ id: c.id, label: c.name })) : []);
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Announcements" subtitle="Notices for staff (all, by branch, role or user) and for customers on the portal." actions={<button className="btn-primary" onClick={() => setF(tab === 'internal' ? { title: '', description: '', expiry: ymd(), viewers: 'All', targets: [] } : { title: '', description: '', start: ymd(), end: ymd(), viewers: 'All', targets: [] })}><Plus size={15} /> New announcement</button>} />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'internal', label: 'Staff', count: db.announcements.length }, { key: 'customer', label: 'Customer portal', count: db.custAnnouncements.length }]} />
      <DataTable id={`ann-${tab}`} rows={(db as any)[coll]} cols={[{ key: 'title', label: 'Title', mobile: 'title' }, { key: 'description', label: 'Description', mobile: 'sub', render: (r) => <span className="block max-w-md truncate">{r.description}</span> }, ...(tab === 'internal' ? [{ key: 'expiry', label: 'Expiry date', render: (r: any) => fmtDate(r.expiry) }] : [{ key: 'start', label: 'Start date', render: (r: any) => fmtDate(r.start) }, { key: 'end', label: 'End date', render: (r: any) => fmtDate(r.end) }]), { key: 'viewers', label: 'Viewers', render: (r) => `${r.viewers}${r.targets?.length ? ` (${r.targets.length})` : ''}` }, { key: 'st', label: 'Status', value: (r) => ((r.expiry || r.end) < ymd() ? 'Expired' : 'Active'), render: (r) => <StatusBadge s={(r.expiry || r.end) < ymd() ? 'Expired' : 'Active'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setF(r) }, { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => A.remove(coll, r.id, 'Announcement') }]} />
      {f && <Drawer open onClose={() => setF(null)} title={f.id ? 'Edit announcement' : 'New announcement'} subtitle={tab === 'internal' ? 'Legacy: Admin/Announcements.aspx' : 'Legacy: Admin/Announcement-Customer.aspx'} footer={<><button className="btn-ghost" onClick={() => setF(null)}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.title) return; A.save(coll, { createdAt: now().toISOString(), ...f }, 'Announcement'); setF(null); }}>Publish</button></>}>
        <div className="p-4 sm:p-5 grid gap-4">
          <Field label="Title" required><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          {tab === 'internal' ? <Field label="Expiry date"><Input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></Field> : <div className="grid grid-cols-2 gap-3"><Field label="Start date"><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field><Field label="End date"><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field></div>}
          <Field label="Viewers"><Radio options={tab === 'internal' ? ['All', 'Branch', 'Roles', 'Users'] : ['All', 'Select Customers']} value={f.viewers} onChange={(v) => setF({ ...f, viewers: v, targets: [] })} /></Field>
          {f.viewers !== 'All' && <div className="grid sm:grid-cols-2 gap-2">{targetsFor(f.viewers).map((t: any) => <Check key={t.id} label={t.label} checked={f.targets.includes(t.id)} onChange={(v) => setF({ ...f, targets: v ? [...f.targets, t.id] : f.targets.filter((x: string) => x !== t.id) })} />)}</div>}
        </div>
      </Drawer>}
    </div>
  );
}

export function ExcelImport() {
  const db = useDB();
  const [table, setTable] = useState('LGST_Customer');
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const tables = ['LGST_Customer', 'LGST_Goods', 'LGST_City', 'LGST_Truck', 'LGST_Driver', 'LGST_Transport', 'LGST_RateMatrix', 'LGST_Godowns', 'LGST_Labour', 'LGST_InventorySpare'];
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Administration" title="Excel upload data" subtitle="Bulk-load master data from Excel into a selected table. Rows are validated before import and a message log is kept." />
      <Card><div className="grid gap-4">
        <Field label="Table"><Select value={table} onChange={(e) => setTable(e.target.value)} options={tables} /></Field>
        <div className="flex gap-2"><button className="btn-primary" onClick={() => setOpen(true)}><Upload size={15} /> Upload file</button><button className="btn-ghost" onClick={() => { downloadText(`${table}_template.csv`, 'Name,Code,City,Remarks\n', 'text/csv').then((o) => { const [t, tone] = saveMsg(o, 'Template downloaded'); useUI.getState().toast(t, tone); }); }}><Download size={15} /> Template</button></div>
        <Field label="Messages"><Textarea rows={6} readOnly value={log.join('\n') || 'No uploads yet.'} className="font-mono text-[12px]" /></Field>
      </div></Card>
      {open && <ImportModal title={`Upload into ${table}`} sample="Name, Code, City, Remarks" onClose={() => setOpen(false)} onImport={(n) => setLog([`${now().toLocaleTimeString()}  ${table}: ${n} row(s) validated and imported`, ...log])} />}
    </div>
  );
}

export function LRBarcodes() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  return (
    <div>
      <PageHeader eyebrow="Administration" title="LR barcodes" subtitle="Barcode labels for each package of an LR (legacy GenerateLRBarcode). Select an LR to preview and print labels." />
      <DataTable id="barcodes" rows={db.lrs.filter((l: any) => l.isFinal).slice().reverse()} onRow={(r) => openPrint('barcode', r.id)} cols={[{ key: 'lrNo', label: 'LR no.', render: (r) => <DocNo>{r.lrNo}</DocNo>, mobile: 'title' }, { key: 'code', label: 'Barcode value', value: (r) => r.lrNo.replace(/\//g, '').replace('SKT', ''), render: (r) => <span className="docno">{r.lrNo.replace(/\//g, '').replace('SKT', '')}</span> }, { key: 'c', label: 'Consignee', value: (r) => lookup.custName(db, r.consigneeId), mobile: 'sub' }, { key: 'packages', label: 'Labels', align: 'right' }]} rowActions={(r: any) => [{ label: 'Print labels', icon: Barcode, onClick: () => openPrint('barcode', r.id) }]} />
    </div>
  );
}

export function Settings() {
  const db = useDB();
  const reset = useStore((s) => s.reset);
  const switchSource = useStore((s) => s.switchSource);
  const source = useStore((s) => s.source);
  const legacy = source === 'legacy';
  const { ask, toast, set } = useUI.getState();
  const theme = useUI((s) => s.theme);
  const [mail, setMail] = useState({ on: true, time: '19:00' });
  return (
    <div>
      <PageHeader eyebrow="Administration" title="System settings" subtitle="Company profile, number series, scheduled e-mails, appearance and data source." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Company"><div className="grid gap-2 text-[13px]">{[['Name', db.company.name], ['Address', db.company.address], ['GSTIN', db.company.gst], ['PAN / TAN', `${db.company.pan} / ${db.company.tan}`], ['Phone', db.company.phone], ['Email', db.company.email]].map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><span className="text-muted">{k}</span><span>{v}</span></div>)}</div></Card>
        <Card title="Number series" subtitle="Next numbers issued"><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[['LR', `SKT/<BR>/${db.counters.lr + 1}`], ['Order', `ORD-${db.counters.order + 1}`], ['GRN', `GRN/JL/${db.counters.grn + 1}`], ['DGRN', `DGRN/<BR>/${db.counters.dgrn + 1}`], ['Challan', `DC/<BR>/${db.counters.dc + 1}`], ['Bill', `SKT/B/${db.counters.bill + 1}/${fy()}`], ['Receipt', `RV/${db.counters.rv + 1}`], ['Payment slip', `TPS/${db.counters.tps + 1}`], ['Job card', `JC/${db.counters.jc + 1}`]].map(([k, v]) => <Stat key={k} label={k} value={<span className="docno text-[13px]">{v}</span>} />)}</div></Card>
        <Card title="Scheduled e-mails" subtitle="Legacy: Schedule/GRNMail.aspx"><div className="grid gap-3"><Toggle checked={mail.on} onChange={(v) => setMail({ ...mail, on: v })} label="Daily GRN summary to clients" /><Field label="Send at"><Input type="time" value={mail.time} onChange={(e) => setMail({ ...mail, time: e.target.value })} /></Field><button className="btn-ghost w-fit" onClick={() => toast('Test GRN mail queued', 'ok', `${db.grns.filter((g: any) => daysBetween(g.inDate) <= 1).length} GRNs in last 24h`)}>Send test now</button></div></Card>
        <Card title="Appearance"><Field label="Theme"><Segmented options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} value={theme} onChange={(v: any) => set({ theme: v })} /></Field></Card>
        <Card title="Data source" subtitle="Which data this prototype runs on" className="lg:col-span-2">
          <div className="grid gap-4">
            {hasLegacy() && <Segmented options={[{ key: 'legacy', label: 'SK Logistics data (converted)' }, { key: 'sample', label: 'Sample data' }]} value={source} onChange={(v: any) => { if (v !== source) ask({ title: v === 'legacy' ? 'Switch to SK Logistics data?' : 'Switch to sample data?', body: 'Each data source keeps its own changes in this browser. You can switch back any time.', confirmLabel: 'Switch', onConfirm: () => { switchSource(v).then(() => { set({ signedIn: false }); toast(v === 'legacy' ? 'SK Logistics data loaded' : 'Sample data loaded', 'ok'); }); } }); }} />}
            {legacy ? <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
              {[['Source backup', `${(db as any).sourceInfo?.file} (SQL Server, ${(db as any).sourceInfo?.database})`], ['Data as of', fmtDate((db as any).asOf)], ['Transactions loaded', `${fmtDate((db as any).windowFrom)} → ${fmtDate((db as any).asOf)}`], ['Ledger entries loaded', `from ${fmtDate((db as any).ledgerFrom)}`], ['Full database', `${(db as any).sourceInfo?.tables} tables · ${Number((db as any).sourceInfo?.rows || 0).toLocaleString('en-IN')} rows (PostgreSQL export)`], ['In this browser', `${db.lrs.length.toLocaleString('en-IN')} LRs · ${db.trips.length.toLocaleString('en-IN')} trips · ${db.bills.length.toLocaleString('en-IN')} bills · ${db.customers.length.toLocaleString('en-IN')} customers`]].map(([k, v]) => <div key={k} className="grid grid-cols-[150px_1fr] gap-2"><span className="text-muted">{k}</span><span className="min-w-0 break-words">{v}</span></div>)}
              <p className="sm:col-span-2 text-[12px] text-muted mt-2">Client receipts were posted in Tally rather than in the old ERP, so bill balances show as outstanding exactly as recorded in the legacy database. "Today" in this prototype is the backup date, so ageing and dashboards line up with the data.</p>
            </div> : <p className="text-[13px] text-muted">Generated sample data: {db.lrs.length} LRs, {db.schedules.length} rakes, {db.bills.length} bills.</p>}
            <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => { downloadText('sk-erp-data.json', JSON.stringify(getDB()), 'application/json').then((o) => { const [t, tone] = saveMsg(o, 'Data exported'); toast(t, tone); }); }}><Download size={15} /> Export JSON</button><button className="btn-bad" onClick={() => ask({ title: 'Restore original data?', body: `All changes made in this browser will be discarded and the original ${legacy ? 'SK Logistics' : 'sample'} data restored.`, tone: 'bad', confirmLabel: 'Restore', onConfirm: () => { reset().then(() => toast('Original data restored', 'ok')); } })}><RotateCcw size={15} /> Restore original data</button></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PrintGallery() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  const [pick, setPick] = useState<Record<string, string>>({});
  const label = (src: string, r: any) => r.lrNo || r.dcNo || r.grnNo || r.billNo || r.no || r.slipNo || r.name || r.rakeNo || r.voucherNo || r.id;
  return (
    <div>
      <PageHeader eyebrow="Reports & MIS" title="Print formats" subtitle={`All ${PRINT_DOCS.length} printable documents rebuilt as A4 layouts with SK Translines branding. Pick a record and preview.`} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {PRINT_DOCS.map((d) => { const recs = ((db as any)[d.source] || []).slice(-25).reverse(); const id = pick[d.key] || recs[0]?.id; return (
          <Card key={d.key}><div className="flex items-start gap-3"><span className="w-9 h-9 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0"><Printer size={16} /></span><div className="min-w-0 flex-1"><div className="font-semibold text-[13.5px]">{d.label}</div><div className="text-[10.5px] text-faint font-mono truncate">{d.legacy}</div>
            <div className="flex gap-2 mt-3"><select className="input h-8 text-[12px]" aria-label="Record" value={id || ''} onChange={(e) => setPick({ ...pick, [d.key]: e.target.value })}>{recs.map((r: any) => <option key={r.id} value={r.id}>{label(d.source, r)}</option>)}</select><button className="btn-violet btn-sm h-8" disabled={!id} onClick={() => openPrint(d.key === 'lr-preprint' ? 'lr' : d.key, id, d.key === 'lr-preprint' ? 'preprint' : undefined)}>Preview</button></div></div></div></Card>); })}
      </div>
    </div>
  );
}

const LEGACY_PAGES = `Accounts/ClientPaymentEntry Accounts/DCApproval Accounts/DCPaymentEntry Accounts/DCPaymentSlip Accounts/GenerateTransporterPaymentSlip Accounts/HamaliPaymentDGRN Accounts/HamaliPaymentGRN Accounts/HamaliPaymentVPLoading Accounts/LRToBillGeneration Accounts/LRToBillGeneration_V1 Accounts/LedgerPaymentEntry Accounts/TallyXML Accounts/TransporterPaymentApprove Accounts/TransporterPaymentEntry Accounts/UpdateLRFreight Admin/Announcement-Customer Admin/Announcements Admin/ChangePassword Admin/DeleteBill Admin/DeleteBillLR Admin/DeleteLR Admin/DeleteLedgerEntry Admin/DeletePaymentReceivableEntry Admin/MenuPerUser Admin/OpenLogslip Admin/ResetPassword Admin/UpdateLR Admin/UpdateTrip Admin/UpdateTruckLR Common/Unauthorized Container/AccidentDetail Container/AccidentList Container/LogSlipGeneration Container/MonthlyVariableExpensesDetail Container/MonthlyVariableExpensesList Container/TripCompletion Container/TripDetail Container/TripExpense Container/TripList Dashboard/DashboardAC Dashboard/DashboardAD Dashboard/DashboardBU Dashboard/DashboardCC Dashboard/DashboardCO Dashboard/DashboardHR Dashboard/DashboardOP Dashboard/DashboardSA Dashboard/DashboardSD Dashboard/DashboardSI Default Error/Default GenerateBarcode/GenerateLRBarcode Inventory/CategoryDetail Inventory/CategoryList Inventory/Dashboard Inventory/GenerateJobCard Inventory/GeneratePurchaseOrder Inventory/GenerateServiceBill Inventory/InventoryPaymentEntry Inventory/InwardStock Inventory/JobCardApproval Inventory/PurchaseOrderApproval Inventory/ReplacementInward Inventory/ServicePaymentEntry Inventory/SpareDetail Inventory/SpareList Inventory/SpareReplacement Inventory/SupplierDetail Inventory/SupplierList Inventory/TruckCheckList Schedule/GRNMail Support/CustomerComplaint Transactions/CourierDetail Transactions/CourierList Transactions/CourierReceived Transactions/CreateConnectedLDC Transactions/DCAckClient Transactions/DCAckCollection Transactions/DCAcknowledgment Transactions/DCWCDestination Transactions/DCWCSource Transactions/DGRNDetail Transactions/Delivered Transactions/DeliveryChallan Transactions/DeliveryChallanComments Transactions/GRN Transactions/GenerateDirectLR Transactions/GenerateLR Transactions/GenerateTruckLR Transactions/InitiateOrder Transactions/LRAcknowledgment Transactions/MR_RR Transactions/OrderConfirmation Transactions/OrderList Transactions/RakeDestination Transactions/RakeSource Transactions/RakeStatus Transactions/VPLoading Transactions/VPPlanning Transactions/VPSchedule WebMethods/GetDataList`.split(' ');
const MASTER_PAGES = 'Agreement Branch City Company Country Customer Department Designation Document Driver Employee ExpenseType Godown Goods Hamali Labour Ledger Pump Role State Transport Truck Unit User UserPerRole Wagon'.split(' ');

export function LegacyMap() {
  const rows = useMemo(() => {
    const special: Record<string, string> = { Default: 'Sign-in (demo profile picker)', 'Error/Default': 'Error boundary state', 'Common/Unauthorized': 'Access-denied state', 'WebMethods/GetDataList': 'Client-side data store (no page)', 'Dashboard/DashboardHR': 'Command Center (role-aware)', 'Dashboard/DashboardSD': 'Command Center (role-aware)', 'MasterPages/UserPerRoleDetail': 'Users & Access › Users (role on user)', 'MasterPages/UserPerRoleList': 'Users & Access › Users', 'Prints/EmailLR': 'LR 360 › Email/SMS', 'Prints/EmailDC': 'Delivery challans › Email LDC', 'Prints/Print': 'Print preview (pre-printed / blank, new format)' };
    const resolve = (p: string) => {
      if (special[p]) return { route: special[p], key: '' };
      const short = p.split('/').pop()!;
      const nav = ALL_ITEMS.find((i) => (i.legacy || []).some((l) => l.split(/[\/, ]/).includes(short) || l === p));
      if (nav) return { route: `${nav.groupLabel} › ${nav.label}`, key: nav.key };
      const rep = REPORTS.find((r) => r.legacy.includes(short + '.aspx'));
      if (rep) return { route: `Reports & MIS › ${rep.title}`, key: `reports/${rep.id}` };
      const def = Object.entries(DEFS).find(([, d]) => d.legacy.some((l) => l.split('/').pop() === short));
      if (def) return { route: `Masters › ${def[1].title}`, key: `masters/${def[0]}` };
      const pr = PRINT_DOCS.find((d) => d.legacy.includes(short) || (/^Bill[A-I]?Print$/.test(short) && d.key === 'bill') || (/^Supplementary[AB]?Bill$/.test(short) && d.key === 'supplementary'));
      if (pr) return { route: `Print formats › ${pr.label}`, key: 'prints' };
      return { route: 'Not mapped', key: '' };
    };
    return LEGACY_ALL.map((p) => ({ id: p, page: `${p}.aspx`, area: p.split('/')[0], ...resolve(p) }));
  }, []);
  const nav = useUI((s) => s.nav);
  const unmapped = rows.filter((r) => r.route === 'Not mapped').length;
  return (
    <div>
      <PageHeader eyebrow="Administration · developer" title="Developer reference" subtitle="Internal mapping of every legacy ASPX page to its modern screen, for the development team. Not shown to business users." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"><KPI label="Legacy ASPX pages" value={rows.length} /><KPI label="Mapped" value={rows.length - unmapped} tone="ok" /><KPI label="Unmapped" value={unmapped} tone={unmapped ? 'bad' : 'ok'} /><KPI label="Entities (EDMX)" value="115" /></div>
      <DataTable id="legacy-map" rows={rows} pageSize={25} onRow={(r) => r.key && nav(r.key)} cols={[{ key: 'area', label: 'Area', filter: true, mobile: 'meta' }, { key: 'page', label: 'Legacy page', render: (r) => <span className="docno">{r.page}</span>, mobile: 'title' }, { key: 'route', label: 'Modern screen', mobile: 'sub', render: (r) => <span className={cls(r.route === 'Not mapped' && 'text-bad font-semibold')}>{r.route}</span> }]} />
    </div>
  );
}

const LEGACY_ALL = 'Accounts/ClientPaymentEntry Accounts/DCApproval Accounts/DCPaymentEntry Accounts/DCPaymentSlip Accounts/GenerateTransporterPaymentSlip Accounts/HamaliPaymentDGRN Accounts/HamaliPaymentGRN Accounts/HamaliPaymentVPLoading Accounts/LRToBillGeneration Accounts/LRToBillGeneration_V1 Accounts/LedgerPaymentEntry Accounts/TallyXML Accounts/TransporterPaymentApprove Accounts/TransporterPaymentEntry Accounts/UpdateLRFreight Admin/Announcement-Customer Admin/Announcements Admin/ChangePassword Admin/DeleteBill Admin/DeleteBillLR Admin/DeleteLR Admin/DeleteLedgerEntry Admin/DeletePaymentReceivableEntry Admin/MenuPerUser Admin/OpenLogslip Admin/ResetPassword Admin/UpdateLR Admin/UpdateTrip Admin/UpdateTruckLR Common/Unauthorized Container/AccidentDetail Container/AccidentList Container/LogSlipGeneration Container/MonthlyVariableExpensesDetail Container/MonthlyVariableExpensesList Container/TripCompletion Container/TripDetail Container/TripExpense Container/TripList Dashboard/DashboardAC Dashboard/DashboardAD Dashboard/DashboardBU Dashboard/DashboardCC Dashboard/DashboardCO Dashboard/DashboardHR Dashboard/DashboardOP Dashboard/DashboardSA Dashboard/DashboardSD Dashboard/DashboardSI Default Error/Default GenerateBarcode/GenerateLRBarcode Inventory/CategoryDetail Inventory/CategoryList Inventory/Dashboard Inventory/GenerateJobCard Inventory/GeneratePurchaseOrder Inventory/GenerateServiceBill Inventory/InventoryPaymentEntry Inventory/InwardStock Inventory/JobCardApproval Inventory/PurchaseOrderApproval Inventory/ReplacementInward Inventory/ServicePaymentEntry Inventory/SpareDetail Inventory/SpareList Inventory/SpareReplacement Inventory/SupplierDetail Inventory/SupplierList Inventory/TruckCheckList MasterPages/AgreementDetail MasterPages/AgreementList MasterPages/BranchDetail MasterPages/BranchList MasterPages/CityDetail MasterPages/CityList MasterPages/CompanyDetail MasterPages/CompanyList MasterPages/CountryDetail MasterPages/CountryList MasterPages/CustomerDetail MasterPages/CustomerList MasterPages/CustomerUpload MasterPages/DepartmentDetail MasterPages/DepartmentList MasterPages/DesignationDetail MasterPages/DesignationList MasterPages/DocumentDetail MasterPages/DocumentList MasterPages/DriverDetail MasterPages/DriverList MasterPages/EmployeeDetails MasterPages/EmployeeList MasterPages/ExcelUploadData MasterPages/ExpenseTypeDetail MasterPages/ExpenseTypeList MasterPages/GodownDetail MasterPages/GodownList MasterPages/GoodsDetail MasterPages/GoodsList MasterPages/HamaliDetail MasterPages/HamaliList MasterPages/LabourDetail MasterPages/LabourList MasterPages/LedgerDetail MasterPages/LedgerList MasterPages/OwnVehicleRateContract MasterPages/PumpDetail MasterPages/PumpList MasterPages/RailwayFreight MasterPages/RateContract MasterPages/RoleDetail MasterPages/RoleList MasterPages/StateDetail MasterPages/StateList MasterPages/TransportDetail MasterPages/TransportList MasterPages/TransporterRateMatrix MasterPages/TruckDetail MasterPages/TruckList MasterPages/UnitDetail MasterPages/UnitList MasterPages/UserDetail MasterPages/UserList MasterPages/UserPerRoleDetail MasterPages/UserPerRoleList MasterPages/WagonDetail MasterPages/WagonList Prints/AcknowledgmentPrint Prints/BillAPrint Prints/BillBPrint Prints/BillCPrint Prints/BillDPrint Prints/BillEPrint Prints/BillFPrint Prints/BillGPrint Prints/BillHPrint Prints/BillIPrint Prints/BillPrint Prints/DCPrint Prints/DieselExpenseSlip Prints/EmailDC Prints/EmailLR Prints/FreightSlipPrint Prints/GRNPrint Prints/JCGatePass Prints/JobCard Prints/LRPrePrint Prints/LRPrint Prints/LRPrintNewFormat Prints/LogSlipPrint Prints/MaintenancePrint Prints/POPrint Prints/Print Prints/RPGatePass Prints/SupplementaryABill Prints/SupplementaryBBill Prints/SupplementaryBill Prints/TransporterPaySlip Prints/TripAdvance Prints/VPLoadSummary Reports/BranchwiseTruckAdvanceSummary Reports/ClientBussinessChart Reports/ClientOutstanding Reports/ClientRateMatrix Reports/CourierDetail Reports/DCBranch Reports/DailyFreightPlanning Reports/DamageShortage Reports/DeliveryChallan Reports/DriverPerformance Reports/GodownStock Reports/GodownStockSummary Reports/HamaliLoadingUnloading Reports/InventoryStockDetail Reports/InventoryStockSummary Reports/JobCardReport Reports/LDCLifeCycleReport Reports/LRAcknowledgmentDetails Reports/LRDetails Reports/LedgerAudit Reports/LedgerReport Reports/MIS Reports/MechanicPerformanceReport Reports/PanwisePeriodicReport Reports/PendingAckSummary Reports/PendingLogslipReport Reports/PumpWiseDetails Reports/QualityControl Reports/RakeCompletionSummary Reports/RakeProfitability Reports/RakeProfitabilitySummary Reports/RateMatrix Reports/SaleBillDeleted Reports/SaleBillReport Reports/StockLoadingVerification Reports/StockMove Reports/SupervisorPerformance Reports/TopTenDrivers Reports/TopTenTrucks Reports/TruckStatus Reports/VehiclePerformance Reports/VehiclePerformanceSummary Schedule/GRNMail Support/CustomerComplaint Transactions/CourierDetail Transactions/CourierList Transactions/CourierReceived Transactions/CreateConnectedLDC Transactions/DCAckClient Transactions/DCAckCollection Transactions/DCAcknowledgment Transactions/DCWCDestination Transactions/DCWCSource Transactions/DGRNDetail Transactions/Delivered Transactions/DeliveryChallan Transactions/DeliveryChallanComments Transactions/GRN Transactions/GenerateDirectLR Transactions/GenerateLR Transactions/GenerateTruckLR Transactions/InitiateOrder Transactions/LRAcknowledgment Transactions/MR_RR Transactions/OrderConfirmation Transactions/OrderList Transactions/RakeDestination Transactions/RakeSource Transactions/RakeStatus Transactions/VPLoading Transactions/VPPlanning Transactions/VPSchedule WebMethods/GetDataList'.split(' ');
