import React, { useEffect, useMemo, useState } from 'react';
import { NAV, ROLE_GROUPS, findItem, SIMPLE_NAV, OPEN_ROUTES, ROUTE_ALIAS } from '../nav';
import { workCount } from '../features/work';
import { useUI, useDB, A, lookup, getAuthenticatedRoleCode } from '../store/store';
import { cls, ago } from '../lib/util';
import { EMBLEM } from '../assets';
import { Search, Bell, Sun, Moon, Monitor, ChevronDown, ChevronsLeft, ChevronsRight, Menu, Home, FileText, LayoutGrid, X, LogOut, Plus, Check, Building2, Lightbulb, HelpCircle, ListChecks, Columns3, Sparkles, MessageCircle } from 'lucide-react';
import { Avatar } from './ui';
import { useT } from '../lib/useT';
import { LangButton } from './LangSwitch';
import { logoutERP } from '../lib/api';
import { setAuthenticatedPrincipal } from '../store/store';

export function useRole() {
  const db = useDB();
  const userId = useUI((s) => s.userId);
  const user = db.users.find((u: any) => u.id === userId) || db.users[0];
  const authenticatedCode = getAuthenticatedRoleCode();
  const role = db.roles.find((r: any) => r.code === authenticatedCode) || db.roles.find((r: any) => r.id === user.roleId) || db.roles[0];
  // Super Admin is server-authenticated. Preserve its complete navigation even
  // when an older shared ERP-state snapshot has incomplete role menu metadata.
  const roleMenus = role.code === 'SA' ? NAV.flatMap((g) => g.items.map((i) => i.key)) : (role.menus || []);
  const customMenus = ['SA', 'AD'].includes(role.code) ? (user.extraMenus || []) : [];
  const allowed = new Set<string>([...roleMenus, ...customMenus].filter((m) => !(user.deniedMenus || []).includes(m)));
  return { user, role, allowed, can: (k: string) => allowed.has(k) || k === 'dashboard' || (!!ROUTE_ALIAS[k] && allowed.has(ROUTE_ALIAS[k])) };
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-white grid place-items-center shrink-0 shadow-[0_0_0_1px_rgb(255_255_255/.1)]"><img src={EMBLEM} alt="SK Translines" className="w-6 h-6" /></span>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="font-display font-bold text-[14.5px] tracking-tight text-white">SK TRANSLINES</div>
          <div className="text-[10px] text-sidetext/70 font-semibold tracking-[.12em]">PVT. LTD. · ERP</div>
        </div>
      )}
    </div>
  );
}

function SimpleNavList({ onPick, collapsed }: { onPick?: () => void; collapsed?: boolean }) {
  const t = useT();
  const route = useUI((s) => s.route);
  const nav = useUI((s) => s.nav);
  const { allowed, role } = useRole();
  const db = useDB();
  const work = useMemo(() => workCount(db, role.code), [db, role.code]);
  const isActive = (k: string) => route === k || route.startsWith(k + '/');
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(SIMPLE_NAV.filter((g) => g.items.some((i) => isActive(i.key))).map((g) => [g.key, true])));
  return (
    <nav className="flex flex-col gap-0.5 px-2.5 pb-6" data-tour="menu" aria-label={t('Main menu')}>
      {SIMPLE_NAV.map((g) => {
        const items = g.items.filter((i) => OPEN_ROUTES.includes(i.key) || allowed.has(i.key) || allowed.has(ROUTE_ALIAS[i.key]));
        if (!items.length) return null;
        const GI = g.icon;
        if (items.length === 1) {
          const it = items[0];
          return (
            <button key={g.key} data-tour={it.key === 'work' ? 'work' : it.key === 'board' ? 'board' : undefined} title={collapsed ? t(g.label) : undefined} onClick={() => { nav(it.key); onPick?.(); }}
              className={cls('flex items-center gap-3 h-10 rounded-lg px-2.5 text-[14px] font-semibold transition', isActive(it.key) ? 'bg-white/[.1] text-white' : 'text-sidetext hover:text-white hover:bg-white/[.05]')}>
              <GI size={18} className="shrink-0" />{!collapsed && <span className="truncate flex-1 text-left">{t(g.label)}</span>}
              {!collapsed && it.key === 'work' && work > 0 && <span className="text-[10.5px] font-bold bg-brand text-white rounded-full px-1.5 min-w-[20px] text-center tnum">{work > 999 ? '999+' : work}</span>}
            </button>
          );
        }
        return (
          <div key={g.key}>
            <button title={collapsed ? t(g.label) : undefined} onClick={() => (collapsed ? (nav(items[0].key), onPick?.()) : setOpen({ ...open, [g.key]: !open[g.key] }))}
              className={cls('w-full flex items-center gap-3 h-10 rounded-lg px-2.5 text-[14px] font-semibold transition', items.some((i) => isActive(i.key)) ? 'text-white' : 'text-sidetext hover:text-white hover:bg-white/[.05]')}>
              <GI size={18} className="shrink-0" />{!collapsed && <><span className="flex-1 text-left truncate">{t(g.label)}</span><ChevronDown size={14} className={cls('transition opacity-60', open[g.key] && 'rotate-180')} /></>}
            </button>
            {!collapsed && open[g.key] && (
              <div className="ml-[20px] pl-3 border-l border-white/[.08] flex flex-col gap-px mt-0.5 mb-1">
                {items.map((it) => (
                  <button key={it.key} onClick={() => { nav(it.key); onPick?.(); }} className={cls('h-9 rounded-md px-2.5 text-[13.5px] transition text-left truncate', isActive(it.key) ? 'bg-white/[.1] text-white font-semibold' : 'text-sidetext hover:text-white hover:bg-white/[.05]')}>{t(it.label)}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MenuModeToggle({ collapsed }: { collapsed?: boolean }) {
  const t = useT();
  const simple = useUI((s) => s.simple);
  const set = useUI((s) => s.set);
  if (collapsed) return null;
  return (
    <button onClick={() => set({ simple: !simple })} className="mx-2.5 mb-2 h-9 rounded-lg border border-white/[.08] text-sidetext hover:text-white text-[12.5px] font-semibold flex items-center justify-center gap-2" aria-pressed={!simple}>
      {simple ? <><LayoutGrid size={14} /> {t('Show all screens')}</> : <><Sparkles size={14} /> {t('Back to simple menu')}</>}
    </button>
  );
}

function NavList(props: { onPick?: () => void; collapsed?: boolean }) {
  const simple = useUI((s) => s.simple);
  return simple ? <SimpleNavList {...props} /> : <FullNavList {...props} />;
}

function FullNavList({ onPick, collapsed }: { onPick?: () => void; collapsed?: boolean }) {
  const route = useUI((s) => s.route);
  const nav = useUI((s) => s.nav);
  const t = useT();
  const { allowed } = useRole();
  const active = findItem(route);
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [active ? NAV.find((g) => g.items.some((i) => i.key === active.key))?.key || 'ops' : 'ops']: true }));
  useEffect(() => { if (active) { const g = NAV.find((x) => x.items.some((i) => i.key === active.key)); if (g) setOpen((o) => ({ ...o, [g.key]: true })); } }, [route]);
  const db = useDB();
  const badges: Record<string, number> = {
    'ops/order-confirmation': db.orders.filter((o: any) => o.status === 'Pending').length,
    'ws/jobcard-approval': db.jobcards.filter((j: any) => j.status === 'Pending Approval').length,
    'ws/po-approval': db.pos.filter((p: any) => p.status === 'Pending Approval').length,
    'fin/tp-approval': db.tpSlips.filter((s: any) => s.status === 'Pending').length,
    'cust/support': db.complaints.filter((c: any) => !c.closed).length,
  };
  return (
    <nav className="flex flex-col gap-0.5 px-2.5 pb-6">
      {NAV.map((g) => {
        const items = g.items.filter((i) => allowed.has(i.key) || i.key === 'dashboard' || allowed.has(ROUTE_ALIAS[i.key]));
        if (!items.length) return null;
        const GI = g.icon;
        const single = items.length === 1;
        const isActiveGroup = items.some((i) => active?.key === i.key);
        if (single) {
          const it = items[0]; const I = it.icon;
          return (
            <button key={g.key} title={collapsed ? t(it.label) : undefined} onClick={() => { nav(it.key); onPick?.(); }} className={cls('flex items-center gap-2.5 h-9 rounded-lg px-2.5 text-[13px] font-semibold transition', active?.key === it.key ? 'bg-white/[.09] text-white shadow-[inset_2px_0_0_rgb(var(--brand))]' : 'text-sidetext hover:text-white hover:bg-white/[.05]', collapsed && 'justify-center px-0')}>
              <I size={17} className="shrink-0" />{!collapsed && <span className="truncate">{t(it.label)}</span>}
            </button>
          );
        }
        return (
          <div key={g.key} className="mt-1">
            <button title={collapsed ? t(g.label) : undefined} onClick={() => (collapsed ? (nav(items[0].key), onPick?.()) : setOpen({ ...open, [g.key]: !open[g.key] }))} className={cls('w-full flex items-center gap-2.5 h-9 rounded-lg px-2.5 text-[13px] font-semibold transition', isActiveGroup ? 'text-white' : 'text-sidetext hover:text-white hover:bg-white/[.05]', collapsed && 'justify-center px-0', collapsed && isActiveGroup && 'bg-white/[.09]')}>
              <GI size={17} className="shrink-0" />
              {!collapsed && <><span className="flex-1 text-left truncate">{t(g.label)}</span><ChevronDown size={14} className={cls('transition opacity-60', open[g.key] && 'rotate-180')} /></>}
            </button>
            {!collapsed && open[g.key] && (
              <div className="ml-[18px] pl-2.5 border-l border-white/[.08] flex flex-col gap-px mt-0.5 mb-1">
                {items.map((it) => (
                  <button key={it.key} onClick={() => { nav(it.key); onPick?.(); }} className={cls('flex items-center gap-2 h-8 rounded-md px-2.5 text-[12.75px] transition text-left', active?.key === it.key ? 'bg-white/[.09] text-white font-semibold' : 'text-sidetext/85 hover:text-white hover:bg-white/[.04]')}>
                    <span className="truncate flex-1">{t(it.label)}</span>
                    {badges[it.key] > 0 && <span className="text-[10px] font-bold bg-brand text-white rounded-full px-1.5 min-w-[18px] text-center tnum">{badges[it.key]}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const t = useT();
  const collapsed = useUI((s) => s.collapsed);
  const set = useUI((s) => s.set);
  return (
    <aside className={cls('hidden lg:flex flex-col bg-side shrink-0 transition-[width] duration-200 relative', collapsed ? 'w-[68px]' : 'w-[252px]')} style={{ backgroundImage: 'radial-gradient(120% 60% at 0% 0%, rgb(var(--violet) / .22), transparent 60%)' }}>
      <div className={cls('h-16 flex items-center px-4 shrink-0', collapsed && 'justify-center px-0')}><Brand collapsed={collapsed} /></div>
      <div className="flex-1 overflow-y-auto side-scroll"><NavList collapsed={collapsed} /></div>
      <MenuModeToggle collapsed={collapsed} />
      <button onClick={() => set({ collapsed: !collapsed })} className="h-11 border-t border-white/[.06] text-sidetext hover:text-white flex items-center gap-2 px-4 text-[12px] font-semibold" aria-label={collapsed ? t('Expand sidebar') : t('Collapse sidebar')}>
        {collapsed ? <ChevronsRight size={16} className="mx-auto" /> : <><ChevronsLeft size={16} /> {t('Collapse')}</>}
      </button>
    </aside>
  );
}

function ThemeBtn({ className = '' }: { className?: string }) {
  const t = useT();
  const theme = useUI((s) => s.theme);
  const set = useUI((s) => s.set);
  const nextT = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const I = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return <button className={cls('btn-icon', className)} onClick={() => set({ theme: nextT })} title={t('Theme: {theme}', { theme: t(theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark') })} aria-label={t('Toggle theme')}><I size={17} /></button>;
}

function Notifications() {
  const t = useT();
  const db = useDB();
  const [o, setO] = useState(false);
  const nav = useUI((s) => s.nav);
  const unread = db.notifications.filter((n: any) => !n.read).length;
  const tone: any = { warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', ok: 'bg-ok' };
  return (
    <div className="relative">
      <button className="btn-icon relative" onClick={() => setO(!o)} aria-label={t('Notifications')}><Bell size={17} />{unread > 0 && <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-brand text-white text-[9.5px] font-bold grid place-items-center tnum">{unread}</span>}</button>
      {o && <>
        <div className="fixed inset-0 z-40" onClick={() => setO(false)} />
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-10 z-50 sm:w-[360px] card shadow-pop animate-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line"><span className="font-semibold text-[13px]">{t('Notifications')}</span><button className="text-[12px] link" onClick={() => A.markRead()}>{t('Mark all read')}</button></div>
          <ul className="max-h-[60vh] overflow-auto divide-y divide-line">
            {db.notifications.map((n: any) => (
              <li key={n.id}><button onClick={() => { A.markRead(n.id); setO(false); nav(n.link); }} className={cls('w-full text-left px-4 py-3 flex gap-3 hover:bg-surface2', !n.read && 'bg-violet/[.04]')}>
                <span className={cls('w-2 h-2 rounded-full mt-1.5 shrink-0', tone[n.tone] || 'bg-info', n.read && 'opacity-30')} />
                <span className="min-w-0"><span className="block text-[13px] font-semibold">{n.title}</span><span className="block text-[12px] text-muted">{n.body}</span><span className="block text-[11px] text-faint mt-0.5">{ago(n.at)}</span></span>
              </button></li>
            ))}
          </ul>
        </div>
      </>}
    </div>
  );
}

function UserMenu() {
  const t = useT();
  const db = useDB();
  const { user, role } = useRole();
  const set = useUI((s) => s.set);
  const toast = useUI((s) => s.toast);
  const [o, setO] = useState(false);
  const branch = lookup.branch(db, user.branchId);
  return (
    <div className="relative">
      <button onClick={() => setO(!o)} className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-surface2" aria-label={t('Account menu')}>
        <Avatar name={`${user.firstName} ${user.lastName}`} size={28} />
        <span className="hidden xl:block text-left leading-tight"><span className="block text-[12.5px] font-semibold">{user.firstName} {user.lastName}</span><span className="block text-[11px] text-muted">{t(role.name)} · {branch?.short}</span></span>
        <ChevronDown size={14} className="text-muted hidden xl:block" />
      </button>
      {o && <>
        <div className="fixed inset-0 z-40" onClick={() => setO(false)} />
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-11 z-50 sm:w-72 card shadow-pop animate-in py-1.5">
          <div className="px-3.5 py-2 border-b border-line mb-1"><div className="font-semibold text-[13px]">{user.firstName} {user.lastName}</div><div className="text-[12px] text-muted">{user.email}</div></div>
          <div className="border-t border-line mt-1 pt-1">
            <button onClick={async () => { await logoutERP(); setAuthenticatedPrincipal(null); set({ signedIn: false }); window.dispatchEvent(new Event('skt-erp-logout')); setO(false); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-[12.5px] hover:bg-surface2"><LogOut size={14} /> {t('Sign out')}</button>
          </div>
        </div>
      </>}
    </div>
  );
}

const CREATE_ITEMS = [
  ['New booking', 'book', {}, 'Book a truck or rail load – 3 short steps'],
  ['Customer order', 'ops/orders', { new: 1 }, 'Note an order now, make the LR later'],
  ['POD received', 'ops/pod', {}, 'Signed copy came back from the customer'],
  ['Start a trip', 'fleet/trips', { new: 1 }, 'Send one of our trucks out'],
  ['Job card', 'ws/jobcards', { new: 1 }, 'Truck needs repair or service'],
  ['Make bill', 'fin/billing', {}, 'Bill customers for delivered LRs'],
] as const;

function GuideToggle() {
  const t = useT();
  const guide = useUI((s) => s.guide);
  const set = useUI((s) => s.set);
  const toast = useUI((s) => s.toast);
  return (
    <button data-tour="guide" onClick={() => { set({ guide: !guide }); toast(guide ? 'Guide turned off' : 'Guide turned on', 'info', guide ? 'Turn it back on any time from the bulb button' : 'Every screen now explains itself'); }}
      className={cls('h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-[12.5px] font-semibold border transition', guide ? 'bg-warn/10 border-warn/40 text-warn' : 'border-line text-muted hover:text-ink')} aria-pressed={guide} title={t('Turn the on-screen guide on or off')}>
      <Lightbulb size={16} /><span className="hidden sm:inline">{guide ? t('Guide on') : t('Guide off')}</span>
    </button>
  );
}

function Topbar() {
  const t = useT();
  const set = useUI((s) => s.set);
  const route = useUI((s) => s.route);
  const nav = useUI((s) => s.nav);
  const item = findItem(route);
  const group = NAV.find((g) => g.items.some((i) => i.key === item?.key));
  const [qa, setQa] = useState(false);
  const quick = CREATE_ITEMS;
  return (
    <header className="h-14 lg:h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center gap-2 px-3 sm:px-5 sticky top-0 z-30 shrink-0">
      <button className="btn-icon lg:hidden -ml-1" onClick={() => set({ mobileNav: true })} aria-label={t('Open menu')}><Menu size={19} /></button>
      <div className="lg:hidden flex items-center gap-2 min-w-0"><span className="w-7 h-7 rounded-lg bg-white grid place-items-center border border-line shrink-0"><img src={EMBLEM} alt="" className="w-[18px] h-[18px]" /></span><span className="font-display font-bold text-[14px] truncate">{item?.label ? t(item.label) : 'SK Translines'}</span></div>
      <div className="hidden lg:flex items-center gap-1.5 text-[12.5px] text-muted min-w-0">
        <span>{group ? t(group.label) : null}</span>{group && item && group.label !== item.label && <><span className="text-faint">/</span><span className="text-ink font-semibold truncate">{t(item.label)}</span></>}
      </div>
      <button data-tour="search" onClick={() => set({ palette: true })} className="hidden md:flex items-center gap-2 h-9 px-3 ml-auto lg:ml-6 w-[min(380px,32vw)] rounded-lg border border-line bg-surface2 text-faint text-[13px] hover:border-violet/40" aria-label={t('Search')}>
        <Search size={15} /><span className="flex-1 text-left truncate">{t('Search LR, truck, customer…')}</span><span className="kbd">Ctrl K</span>
      </button>
      <div className="flex items-center gap-0.5 ml-auto">
        <button data-tour="search" className="btn-icon md:hidden" onClick={() => set({ palette: true })} aria-label={t('Search')}><Search size={18} /></button>
        <div className="relative hidden sm:block">
          <button data-tour="create" className="btn-primary h-9 ml-1 mr-1" onClick={() => setQa(!qa)}><Plus size={15} /> {t('Create')}</button>
          {qa && <>
            <div className="fixed inset-0 z-40" onClick={() => setQa(false)} />
            <div className="absolute right-0 top-11 z-50 w-72 card shadow-pop py-1.5 animate-in">
              {quick.map(([l, r, p, d]) => <button key={l} onClick={() => { setQa(false); nav(r, p as any); }} className="w-full text-left px-3.5 py-2 hover:bg-surface2"><span className="block text-[13.5px] font-semibold">{t(l)}</span><span className="block text-[11.5px] text-muted">{t(d)}</span></button>)}
            </div>
          </>}
        </div>
        <GuideToggle />
        <span className="ml-1 flex shrink-0"><LangButton /></span>
        <button className="btn-icon" onClick={() => nav('help')} aria-label={t('Help and training')} title={t('Help & training')}><HelpCircle size={18} /></button>
        <ThemeBtn className="hidden sm:inline-flex" />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}

function MobileDrawer() {
  const t = useT();
  const open = useUI((s) => s.mobileNav);
  const set = useUI((s) => s.set);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-in" onClick={() => set({ mobileNav: false })} />
      <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] bg-side flex flex-col animate-slide pt-[env(safe-area-inset-top,0px)]">
        <div className="h-16 flex items-center justify-between px-4"><Brand /><button onClick={() => set({ mobileNav: false })} className="text-sidetext p-2" aria-label={t('Close menu')}><X size={20} /></button></div>
        <div className="flex-1 overflow-y-auto side-scroll"><NavList onPick={() => set({ mobileNav: false })} /></div>
        <div className="pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
          <div className="mx-2.5 mb-2 flex items-center gap-2 text-sidetext">
            <span className="flex-1 text-[12.5px] font-semibold">{t('Screen language')}</span>
            <span className="text-white"><LangButton /></span>
            <ThemeBtn className="text-sidetext hover:text-white hover:bg-white/[.05]" />
          </div>
          <MenuModeToggle />
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const route = useUI((s) => s.route);
  const nav = useUI((s) => s.nav);
  const set = useUI((s) => s.set);
  const t = useT();
  const db = useDB();
  const [sheet, setSheet] = useState(false);
  const items = [
    { k: 'dashboard', l: 'Home', I: Home }, { k: 'work', l: 'My Work', I: ListChecks },
    { k: '__new', l: 'Create', I: Plus }, { k: 'board', l: 'Board', I: Columns3 }, { k: '__menu', l: 'Menu', I: LayoutGrid },
  ];
  const quick = CREATE_ITEMS;
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-5 h-[60px]">
          {items.map(({ k, l, I }) => {
            const active = route === k;
            if (k === '__new') return <button key={k} data-tour="create" onClick={() => setSheet(true)} className="flex flex-col items-center justify-center" aria-label={t('Create')}><span className="w-11 h-11 -mt-5 rounded-2xl bg-brand text-white grid place-items-center shadow-[0_8px_20px_-6px_rgb(var(--brand)/.6)]"><I size={20} /></span></button>;
            return <button key={k} data-tour={({ __menu: 'menu', work: 'work', board: 'board' } as any)[k]} onClick={() => (k === '__menu' ? set({ mobileNav: true }) : nav(k))} className={cls('flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold', active ? 'text-brand' : 'text-muted')}><I size={19} />{t(l)}</button>;
          })}
        </div>
      </nav>
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-in" onClick={() => setSheet(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-surface rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-up">
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-3" />
            <div className="eyebrow mb-2">{t('Quick create')}</div>
            <div className="grid grid-cols-2 gap-2">
              {quick.map(([l, r, p, d]) => <button key={l} onClick={() => { setSheet(false); nav(r, p as any); }} className="min-h-[60px] rounded-xl border border-line text-left px-3 py-2 active:bg-surface2"><span className="block text-[14px] font-semibold">{t(l)}</span><span className="block text-[11.5px] text-muted leading-snug">{t(d)}</span></button>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FloatingChat() {
  const route = useUI((s) => s.route);
  const nav = useUI((s) => s.nav);
  const { can } = useRole();
  if (!can('communication')) return null;
  const active = route === 'communication' || route.startsWith('communication/');
  return <button onClick={() => nav('communication')} aria-label="Open team chat" title="Open team chat" className={cls('fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[35] flex items-center gap-2 rounded-full px-3 h-12 shadow-pop border transition', active ? 'bg-brand text-white border-brand' : 'bg-surface text-violet border-violet/40 hover:bg-violet hover:text-white')}><MessageCircle size={20} /><span className="hidden sm:inline text-[12px] font-semibold">Chat</span></button>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main id="main-scroll" className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-5 pb-28 lg:pb-10">{children}</div>
        </main>
      </div>
      <MobileDrawer />
      <BottomNav />
      <FloatingChat />
    </div>
  );
}
