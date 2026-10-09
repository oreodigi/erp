// Shared helpers for the server-backed admin screens (User Management, Training Dashboard).
// Role mapping mirrors localRoleCode() in store/store.ts; permission maths mirrors useRole() in AppShell.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV, ROLE_GROUPS, OPEN_ROUTES } from '../../nav';
import { ROLE_LABEL } from '../../training/modules';
import { buildCurriculum, type Curriculum } from '../../training/curriculum';
import { computeProgress, toRecordMap, toQuizMap, type Progress } from '../../training/progress';
import type { ReadinessSettings } from '../../training/config';
import { useUI } from '../../store/store';
import { useT } from '../../lib/useT';
import { cls, fmtDT } from '../../lib/util';
import { Modal as BaseModal, Drawer as BaseDrawer } from '../../components/overlays';
import { Copy, Check, ShieldAlert } from 'lucide-react';

/** Every server role (api/users.mjs accountRoles) with the name employees see. */
export const SERVER_ROLES: [string, string][] = [
  ['superadmin', 'Super Admin'], ['admin', 'Admin'], ['manager', 'ERP Manager'], ['operator', 'Operations'], ['operations', 'Operations (team)'], ['dispatcher', 'Dispatcher'],
  ['accounts', 'Accounts'], ['accountant', 'Accountant'], ['finance_approver', 'Finance Approver'], ['customer_care', 'Customer Care'], ['customerrelations', 'Customer Relations'],
  ['branch_admin', 'Branch Admin'], ['branch_user', 'Branch User'], ['container', 'Container'], ['hr', 'HR'], ['onboarding', 'Onboarding'],
  ['storeincharge', 'Store Incharge'], ['storedirector', 'Store Director'], ['fleetmanager', 'Fleet Manager'], ['warehousemanager', 'Warehouse Manager'], ['workshopmanager', 'Workshop Manager'],
];
export const PRIMARY_ROLES: [string, string][] = [
  ['superadmin', 'Super Admin'], ['admin', 'Administrator'], ['operator', 'Operations'], ['accounts', 'Finance & Accounts'],
  ['fleetmanager', 'Fleet'], ['warehousemanager', 'Warehouse'], ['workshopmanager', 'Workshop / Inventory'],
  ['hr', 'HR & Payroll'], ['customer_care', 'Customer Care'], ['branch_user', 'Branch User'],
];
const ROLE_NAME = new Map(SERVER_ROLES.concat(PRIMARY_ROLES));
export const roleLabel = (role: string) => ROLE_NAME.get(String(role || '').toLowerCase()) || role || '—';

/** Server role → local ERP role code (same table as store.ts localRoleCode). */
export function roleCodeOf(role: string): string {
  const key = String(role || '').trim().toLowerCase();
  return ({ superadmin: 'SA', 'super-admin': 'SA', admin: 'AD', administrator: 'AD', manager: 'AD', operator: 'OP', operations: 'OP', dispatcher: 'OP', finance: 'AC', accounts: 'AC', accountant: 'AC', finance_approver: 'AC', customer_care: 'CC', 'customer-care': 'CC', customerrelations: 'CC', fleet: 'CO', fleetmanager: 'CO', workshop: 'SI', workshopmanager: 'SI', inventory: 'SI', warehousemanager: 'SI', store: 'SI', storeincharge: 'SI', storedirector: 'SI', hr: 'HR', onboarding: 'HR', branch_admin: 'BU', branch_user: 'BU', container: 'BU' } as Record<string, string>)[key] || String(role || '').toUpperCase();
}
export const roleCodeLabel = (role: string) => ROLE_LABEL[roleCodeOf(role)] || roleLabel(role);

/** Menu keys a role gets by default (ROLE_GROUPS → NAV items). */
export function roleDefaultMenus(role: string): Set<string> {
  const groups = ROLE_GROUPS[roleCodeOf(role)] || [];
  return new Set(NAV.filter((g) => groups.includes(g.key)).flatMap((g) => g.items.map((i) => i.key)));
}
/** Effective screens for an account: role default + extra − denied, plus screens every user can open. */
export function effectiveAllowed(role: string, extra: string[] = [], denied: string[] = []): Set<string> {
  const deny = new Set(denied);
  const out = new Set([...roleDefaultMenus(role), ...extra].filter((k) => !deny.has(k)));
  OPEN_ROUTES.forEach((r) => out.add(r));
  return out;
}

/** Curriculum + progress for any employee – the same engine the Academy uses for the learner. */
export function employeeProgress(input: { role: string; extra?: string[]; denied?: string[]; records: any[]; quizzes: any[] }, settings: ReadinessSettings): { curriculum: Curriculum; progress: Progress } {
  const curriculum = buildCurriculum({ role: roleCodeOf(input.role), allowed: effectiveAllowed(input.role, input.extra, input.denied) });
  const progress = computeProgress(curriculum, toRecordMap(input.records as any), toQuizMap(input.quizzes as any), settings);
  return { curriculum, progress };
}

/** Relative time against the real clock (util.ago uses the dataset business date). */
export function relTime(d?: string | null): string {
  if (!d) return '';
  const s = (Date.now() - +new Date(d)) / 1000;
  if (!isFinite(s)) return '';
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))} mo ago`;
  return `${Math.floor(s / (86400 * 365))} y ago`;
}
export function When({ d, empty = 'Never' }: { d?: string | null; empty?: string }) {
  const t = useT();
  if (!d) return <span className="text-faint">{t(empty)}</span>;
  return <time dateTime={d} title={fmtDT(d)} className="whitespace-nowrap">{t(relTime(d))}<span className="block text-[11px] text-faint">{fmtDT(d)}</span></time>;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Request failed');
export const toastError = (title: string, e: unknown) => useUI.getState().toast(title, 'bad', errMsg(e));

/** Circular readiness gauge. */
export function Ring({ value, size = 64, stroke = 7, tone = 'violet', label }: { value: number; size?: number; stroke?: number; tone?: string; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label || `${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`rgb(var(--${tone === 'muted' ? 'faint' : tone}))`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .4s' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-semibold tnum" style={{ fontSize: size * 0.24 }}>{Math.round(v)}%</span>
    </div>
  );
}

// Page content sits inside an animated (transformed) wrapper, which would trap `position: fixed` overlays inside the
// page area. Admin overlays are portalled to <body> so they cover the whole viewport, like the shell's own dialogs.
export function Drawer(p: React.ComponentProps<typeof BaseDrawer>) { return p.open ? createPortal(<BaseDrawer {...p} />, document.body) : null; }
export function Modal(p: React.ComponentProps<typeof BaseModal>) { return p.open ? createPortal(<BaseModal {...p} />, document.body) : null; }

/** One-time temporary password reveal with copy. The password lives only in this modal's props. */
export function PasswordReveal({ data, onClose }: { data: { username: string; password: string; reason: 'create' | 'reset' } | null; onClose: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(data.password); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { useUI.getState().toast(t('Copy failed'), 'warn', t('Select the password and copy it by hand.')); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={t('Temporary password – copy it now')} footer={<button className="btn-primary" onClick={onClose}>{t('I have copied it')}</button>}>
      <div className="grid gap-3">
        <div className="flex items-start gap-2.5 rounded-lg bg-warn/[.08] border border-warn/25 p-3 text-[12.5px]">
          <ShieldAlert size={16} className="text-warn shrink-0 mt-0.5" />
          <span>{t('This password is shown only once. It cannot be viewed again. Give it to the employee in person or by phone – not by group chat. They must set their own password when they first sign in.')}</span>
        </div>
        <div>
          <div className="label">{t('Username')}</div>
          <div className="font-mono text-[13.5px] font-semibold break-all">{data.username}</div>
        </div>
        <div>
          <div className="label">{t('Temporary password')}</div>
          <div className="flex items-stretch gap-2">
            <code data-testid="temp-password" className="flex-1 min-w-0 rounded-lg bg-surface2 border border-line px-3 py-2 font-mono text-[14px] select-all break-all">{data.password}</code>
            <button className="btn-ghost shrink-0" onClick={copy} aria-label={t('Copy password')}>{copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}<span className="hidden sm:inline">{copied ? t('Copied') : t('Copy')}</span></button>
          </div>
        </div>
        <p className="text-[12px] text-muted">{data.reason === 'reset' ? t('The old password no longer works and the employee has been signed out on every device.') : t('The account is active. The employee will be asked to change this password at first sign-in.')}</p>
      </div>
    </Modal>
  );
}

/** Small "why is this disabled" line. */
export function Reason({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={cls('text-[11.5px] text-muted mt-1', className)}>{children}</p>;
}

/** Notice card for people who can open a screen but whose role cannot use it. */
export function Notice({ icon: Icon, title, body, tone = 'info', action }: { icon: any; title: string; body: React.ReactNode; tone?: 'info' | 'warn' | 'bad'; action?: React.ReactNode }) {
  return (
    <div className={cls('card p-4 sm:p-5 flex items-start gap-3', tone === 'warn' && 'border-warn/30', tone === 'bad' && 'border-bad/30')}>
      <span className={cls('w-9 h-9 rounded-xl grid place-items-center shrink-0', tone === 'info' ? 'bg-info/10 text-info' : tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-bad/10 text-bad')}><Icon size={18} /></span>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-[13px] text-muted mt-1">{body}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
