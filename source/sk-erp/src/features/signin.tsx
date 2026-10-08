import React from 'react';
import { useUI, useDB, useStore } from '../store/store';
import { fmtDate } from '../lib/util';
import { LOGO } from '../assets';
import { Avatar } from '../components/ui';
import { useT } from '../lib/useT';
import { LangChooser } from '../components/LangSwitch';
import { ArrowRight, TrainFront, Truck, Warehouse } from 'lucide-react';

export function SignIn() {
  const db = useDB();
  const t = useT();
  const set = useUI((s) => s.set);
  const toast = useUI((s) => s.toast);
  const source = useStore((st) => st.source);
  const legacy = source === 'legacy';
  // one profile per role (the most active user of that role), ordered by role importance
  const ORDER = ['SA', 'AD', 'OP', 'BU', 'AC', 'CC', 'CO', 'SI', 'HR'];
  const users = (() => {
    const act = db.users.filter((u: any) => u.active);
    if (!legacy) return act;
    const best: Record<string, any> = {};
    for (const u of act) { const r = db.roles.find((x: any) => x.id === u.roleId); if (!r) continue; const k = r.id; if (!best[k] || (u.loginCount || 0) > (best[k].loginCount || 0)) best[k] = u; }
    return Object.values(best).sort((a: any, b: any) => ORDER.indexOf(db.roles.find((r: any) => r.id === a.roleId)?.code) - ORDER.indexOf(db.roles.find((r: any) => r.id === b.roleId)?.code));
  })();
  return (
    <div className="min-h-full grid lg:grid-cols-[1.05fr_1fr] bg-bg">
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-side text-white overflow-hidden" style={{ backgroundImage: 'radial-gradient(90% 70% at 10% 0%, rgb(var(--violet) / .45), transparent 60%), radial-gradient(60% 50% at 100% 100%, rgb(var(--brand) / .28), transparent 70%)' }}>
        <div className="bg-white rounded-xl px-4 py-3 w-fit"><img src={LOGO} alt="S.K. Translines Pvt. Ltd." className="h-9" /></div>
        <div className="max-w-md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-white/60 mb-3">{t('ROAD · RAIL · WAREHOUSE · WORKSHOP')}</div>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold">{t('One control tower for every consignment from Jalgaon to Guwahati.')}</h1>
          <p className="text-white/70 mt-4 text-[14px] leading-relaxed">{t('Orders, LRs, parcel rakes, delivery challans, fleet, billing and Tally – connected end to end.')}</p>
          <div className="flex gap-5 mt-8 text-[12.5px] text-white/75">
            <span className="inline-flex items-center gap-2"><Truck size={16} /> {t('{n} trucks', { n: db.trucks.length })}</span>
            <span className="inline-flex items-center gap-2"><TrainFront size={16} /> {t('{n} rakes', { n: db.schedules.length })}</span>
            <span className="inline-flex items-center gap-2"><Warehouse size={16} /> {t('{n} branches', { n: db.branches.length })}</span>
          </div>
        </div>
        <svg viewBox="0 0 400 120" className="w-full max-w-lg opacity-80" aria-hidden>
          <path d="M10 90 C 120 20, 260 120, 390 30" fill="none" stroke="rgb(255 255 255 / .35)" strokeWidth="2" className="route-dash" />
          {[[10, 90, 'Jalgaon'], [205, 72, 'Raipur'], [390, 30, 'Guwahati']].map(([x, y, n]: any) => <g key={n}><circle cx={x} cy={y} r="5" fill="rgb(var(--brand))" stroke="#fff" strokeWidth="2" /><text x={x} y={y + 20} fill="rgb(255 255 255 / .7)" fontSize="11" textAnchor={x > 300 ? 'end' : x < 50 ? 'start' : 'middle'}>{n}</text></g>)}
        </svg>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden bg-white rounded-xl px-3 py-2 w-fit mb-6 border border-line"><img src={LOGO} alt="S.K. Translines Pvt. Ltd." className="h-7" /></div>
          <h2 className="font-display text-[26px] font-semibold">{t('Sign in to SK Translines ERP')}</h2>
          <p className="text-muted text-[13px] mt-1">{legacy ? <>{t('Running on')} <b className="text-ink">{t('SK Logistics data')}</b> {t('converted from the live ERP backup (as of {date}).', { date: fmtDate((db as any).asOf) })} {t('Pick a user – each role sees the menus its permissions allow.')}</> : t('Prototype environment with sample data. Pick a profile – each role sees the menus its permissions allow.')}</p>
          <div className="mt-5">
            <div className="text-[12px] font-semibold text-muted mb-1.5">Language / भाषा</div>
            <LangChooser />
          </div>
          <ul className="mt-6 grid gap-2">
            {users.slice(0, 9).map((u: any) => {
              const r = db.roles.find((x: any) => x.id === u.roleId);
              return (
                <li key={u.id}>
                  <button onClick={() => { set({ userId: u.id, signedIn: true, route: 'dashboard' }); toast(`Welcome, ${u.firstName}`, 'ok', `${r?.name} · ${u.branchId} branch`); }} className="w-full card px-3.5 py-2.5 flex items-center gap-3 text-left hover:border-violet/50 hover:-translate-y-px transition group">
                    <Avatar name={`${u.firstName} ${u.lastName}`} size={34} />
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-[13.5px]">{u.firstName} {u.lastName}</span><span className="block text-[12px] text-muted truncate">{r?.name ? t(r.name) : ''}{r?.description && r.description !== r.name ? ` · ${r.description}` : ''}{legacy ? ` · ${db.branches.find((b: any) => b.id === u.branchId)?.name || ''}` : ''}</span></span>
                    <ArrowRight size={16} className="text-faint group-hover:text-brand transition" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[11.5px] text-faint mt-6">{t('Changes you make are kept in this browser so the demo survives a refresh. Restore the original data or switch between SK Logistics data and sample data from Administration → System Settings.')}</p>
        </div>
      </div>
    </div>
  );
}
