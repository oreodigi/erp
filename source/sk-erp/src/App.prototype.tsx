import React, { useEffect, Suspense } from 'react';
import { useUI, useDB, useStore, usePrincipal } from './store/store';
import { LOGO } from './assets';
import { AppShell, useRole } from './components/AppShell';
import { Toasts, ConfirmHost, CommandPalette } from './components/overlays';
import { RecordDrawer } from './components/RecordDrawer';
import { PrintHost } from './components/Print';
import { PAGES } from './pages';
import { EmptyState } from './components/ui';
import { ShieldAlert } from 'lucide-react';
import { SignIn } from './features/signin';
import { QuickActionHost } from './components/QuickActions';
import { OnboardingHost } from './features/guide';
import { PracticeHost } from './training/ui/PracticeHost';
import { ScreenHelpHost, ScreenHint } from './training/ui/ScreenHelp';
import { OPEN_ROUTES } from './nav';
import { setCurrentLang } from './lib/i18n';
import { useT } from './lib/useT';
import { VoicePlayer } from './components/VoicePlayer';

function useThemeSync() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
  }, [theme]);
}

class Boundary extends React.Component<{ children: React.ReactNode; k: string }, { err: any }> {
  state = { err: null as any };
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidUpdate(p: any) { if (p.k !== this.props.k && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) return <div className="card p-6"><div className="font-semibold text-bad">This screen hit an error</div><pre className="text-[12px] text-muted mt-2 whitespace-pre-wrap">{String(this.state.err?.message || this.state.err)}</pre><button className="btn-ghost mt-3" onClick={() => this.setState({ err: null })}>Retry</button></div>;
    return this.props.children;
  }
}

function Loading({ text }: { text: string }) {
  return (
    <div className="min-h-full grid place-items-center bg-bg p-6" role="status" aria-live="polite">
      <div className="text-center">
        <div className="bg-white rounded-xl px-4 py-3 w-fit mx-auto border border-line"><img src={LOGO} alt="S.K. Translines Pvt. Ltd." className="h-8" /></div>
        <div className="mt-6 h-1.5 w-56 mx-auto rounded-full bg-surface2 overflow-hidden"><div className="h-full w-1/3 bg-brand rounded-full animate-[loadbar_1.1s_ease-in-out_infinite]" /></div>
        <p className="text-[13px] text-muted mt-3">{text}</p>
      </div>
    </div>
  );
}

export function PrototypeERP() {
  useThemeSync();
  const lang = useUI((s) => s.lang);
  setCurrentLang(lang || 'en'); // before children render, so tNow() matches
  const t = useT();
  const ready = useStore((s) => s.ready);
  const loadingText = useStore((s) => s.loading);
  useEffect(() => { if (!useStore.getState().ready) useStore.getState().boot(); }, []);
  const route = useUI((s) => s.route);
  const signedIn = useUI((s) => s.signedIn);
  const { can } = useRole();
  // A temporary password from the administrator must be replaced before any other screen opens.
  const mustChange = usePrincipal((s) => !!s.principal?.must_change_password);
  if (!ready) return <Loading text={loadingText} />;
  if (!signedIn) return null;
  const key = mustChange ? 'access/password' : Object.keys(PAGES).filter((k) => route === k || route.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0] || 'dashboard';
  const Page = PAGES[key];
  const navKey = key.split('/').slice(0, 2).join('/');
  const allowed = can(key) || can(navKey) || OPEN_ROUTES.includes(key) || key.startsWith('dashboard') || (key === 'book' && (can('ops/lr-new') || can('ops/lr')));
  return (
    <>
      <AppShell>
        <Boundary k={route}>
          {allowed ? <div key={route} className="animate-in"><ScreenHint routeKey={key} /><Suspense fallback={<Loading text="Loading module…" />}><Page /></Suspense></div> : <EmptyState icon={ShieldAlert} title={t("You don't have access to this module")} body={t('Your role does not include this menu. Ask an administrator to grant access from Users & Access → Roles & Permissions.')} />}
        </Boundary>
      </AppShell>
      <RecordDrawer />
      <PrintHost />
      <CommandPalette />
      <QuickActionHost />
      {!mustChange && <OnboardingHost />}
      <ConfirmHost />
      <PracticeHost />
      <ScreenHelpHost />
      <VoicePlayer />
      <Toasts />
    </>
  );
}

export default PrototypeERP;
