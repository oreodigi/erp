// Stage time limits – how long a consignment may sit in each stage before the Order Board marks it late.
import React, { useMemo, useState } from 'react';
import { useDB, useUI, useStore } from '../store/store';
import { STAGES, DEFAULT_SLA, DefaultSLA, StageKey, allCards } from '../lib/stages';
import { PageHeader, Card, Input, Toggle } from '../components/ui';
import { cls, num } from '../lib/util';
import { Save, RotateCcw, Columns3, Clock } from 'lucide-react';
import { useT } from '../lib/useT';

type Def = { key: StageKey; unit: 'hours' | 'days'; label: string; hint: string };
const DEFS: Def[] = [
  { key: 'booked', unit: 'hours', label: 'Confirm a new order within', hint: 'From the time the order is entered.' },
  { key: 'vehicle', unit: 'hours', label: 'Assign a truck / make the LR within', hint: 'From order confirmation or LR creation.' },
  { key: 'transit', unit: 'days', label: 'Extra days allowed on the road', hint: 'Added to the route’s standard transit time.' },
  { key: 'delivered', unit: 'days', label: 'Get the signed POD back within', hint: 'From the delivery date.' },
  { key: 'pod', unit: 'days', label: 'Make the bill within', hint: 'From the date the POD is received.' },
  { key: 'billed', unit: 'days', label: 'Collect payment within', hint: 'From the bill date.' },
];

const toShow = (d: Def, v: number) => (d.unit === 'hours' ? Math.round(v * 24) : d.key === 'transit' ? v + 1 : v);
const toStore = (d: Def, v: number) => (d.unit === 'hours' ? v / 24 : d.key === 'transit' ? v - 1 : v);

export function TimeLimits() {
  const t = useT();
  const db = useDB();
  const { nav, toast } = useUI.getState();
  const saved: DefaultSLA = { ...DEFAULT_SLA, ...((db as any).slaDays || {}) };
  const [draft, setDraft] = useState<DefaultSLA>(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const lateNow = useMemo(() => count(allCards(db)), [db]);
  const lateNew = useMemo(() => count(allCards({ ...db, slaDays: draft })), [db, draft]);
  const save = () => { useStore.getState().mutate((d: any) => { d.slaDays = draft; }); toast('Time limits saved', 'ok', 'Order Board, Home and My Work now use the new limits'); };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 max-w-[920px]">
      <PageHeader eyebrow={t('Settings')} title={t('Stage time limits')} subtitle={t('How long a consignment may wait in each stage. After that it turns red (late) on the Order Board, Home and My Work. Amber means it is close (80% of the time used).')}
        actions={<button className="btn-ghost h-9" onClick={() => nav('board')}><Columns3 size={15} /> {t('Open Order Board')}</button>} />
      <Card pad={false}>
        <ul className="divide-y divide-line">
          {DEFS.map((d) => {
            const st = STAGES.find((s) => s.key === d.key)!;
            const useCredit = d.key === 'billed' && !draft.billed;
            return (
              <li key={d.key} className="p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px_150px] gap-3 sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="chip bg-violet/10 text-violet">{t(st.short)}</span><span className="font-semibold text-[14px]">{t(d.label)}</span></div>
                  <div className="text-[12.5px] text-muted mt-1">{t(d.hint)} {t('Waiting on: {owner}.', { owner: t(st.owner) })}</div>
                </div>
                <div className="flex items-center gap-2">
                  {d.key === 'billed' && <Toggle checked={useCredit} onChange={(v) => setDraft({ ...draft, billed: v ? 0 : 30 })} label={t('Customer’s credit days')} />}
                  {!useCredit && <label className="flex items-center gap-2"><Input type="number" min={d.unit === 'hours' ? 1 : d.key === 'transit' ? 0 : 1} className="w-20 text-center font-semibold" aria-label={t(d.label)} value={toShow(d, draft[d.key])} onChange={(e) => setDraft({ ...draft, [d.key]: Math.max(d.key === 'transit' ? -1 : 0.04, toStore(d, Number(e.target.value) || 0)) })} /><span className="text-[13px] text-muted">{t(d.unit)}</span></label>}
                </div>
                <div className="text-[12.5px] sm:text-right">
                  <span className="text-muted">{t('Late now')} </span><b className="tnum">{num(lateNow[d.key] || 0)}</b>
                  {lateNew[d.key] !== lateNow[d.key] && <span className={cls('ml-1 font-semibold tnum', (lateNew[d.key] || 0) > (lateNow[d.key] || 0) ? 'text-bad' : 'text-ok')}>→ {num(lateNew[d.key] || 0)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={!dirty} onClick={save}><Save size={15} /> {t('Save time limits')}</button>
        <button className="btn-ghost" onClick={() => setDraft({ ...DEFAULT_SLA })}><RotateCcw size={15} /> {t('Back to default')}</button>
        <span className="text-[12.5px] text-muted inline-flex items-center gap-1"><Clock size={13} /> {t('Late in total:')} {num(lateNow.all)}{lateNew.all !== lateNow.all ? ` → ${num(lateNew.all)}` : ''}</span>
      </div>
    </div>
  );
}

function count(cards: any[]) {
  const m: Record<string, number> = { all: 0 };
  for (const c of cards) if (c.health === 'stuck') { m[c.stage] = (m[c.stage] || 0) + 1; m.all++; }
  return m;
}
