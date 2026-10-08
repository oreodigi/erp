// Truck journeys – where each of our trucks went, loaded or empty, what it earned and what it cost.
import React, { useMemo, useState } from 'react';
import { useDB, useUI, lookup, truckStatus } from '../store/store';
import { PERIODS, Period, fleetStats, emptyLanes, periodFrom, truckStat, TruckStat, Leg } from '../lib/journeys';
import { PageHeader, KPI, Card, Segmented, Input, StatusBadge, EmptyState } from '../components/ui';
import { ChartCard, Bars } from '../components/charts';
import { compactINR, inr, fmtDate, cls, num, addDays, now, ymd, daysBetween } from '../lib/util';
import { Route, Search, ArrowLeft, Fuel, IndianRupee, Gauge, Clock, Truck, ArrowRight, MoveRight, PackageOpen, ChevronDown } from 'lucide-react';
import { useT } from '../lib/useT';

const SORTS = [
  { key: 'tripProfit', label: 'Trip profit' }, { key: 'profit', label: 'Net profit' }, { key: 'perKm', label: '₹ per km' }, { key: 'emptyPct', label: 'Empty km %' }, { key: 'idleDays', label: 'Idle days' }, { key: 'km', label: 'Km run' },
] as const;

export function Journeys() {
  const params = useUI((s) => s.params);
  return params.truckId ? <TruckJourney truckId={params.truckId} /> : <FleetJourneys />;
}

function usePeriod() {
  const params = useUI((s) => s.params);
  const [p, setP] = useState<Period>((params.period as Period) || '90');
  return [p, setP] as const;
}

function FleetJourneys() {
  const t = useT();
  const db = useDB();
  const nav = useUI((s) => s.nav);
  const [period, setPeriod] = usePeriod();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<string>('tripProfit');
  const stats = useMemo(() => fleetStats(db, period), [db, period]);
  const tot = useMemo(() => stats.reduce((a, s) => ({ km: a.km + s.km, empty: a.empty + s.emptyKm, freight: a.freight + s.freight, cost: a.cost + s.diesel + s.other, fixed: a.fixed + s.fixed, trip: a.trip + s.tripProfit, profit: a.profit + s.profit, idle: a.idle + s.idleDays, days: a.days + s.days, trips: a.trips + s.trips }), { km: 0, empty: 0, freight: 0, cost: 0, fixed: 0, trip: 0, profit: 0, idle: 0, days: 0, trips: 0 }), [stats]);
  const lanes = useMemo(() => emptyLanes(stats).slice(0, 6), [stats]);
  const ownCount = db.trucks.filter((t: any) => t.type === 'Own' && t.isActive !== false).length;
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase().replace(/[\s.-]/g, '');
    const list = stats.filter((s) => !qq || s.truck.number.toLowerCase().replace(/[\s.-]/g, '').includes(qq) || lookup.driverName(db, s.truck.driverId).toLowerCase().includes(q.trim().toLowerCase()));
    const dir = sort === 'emptyPct' || sort === 'idleDays' ? -1 : -1;
    return [...list].sort((a: any, b: any) => dir * (a[sort] - b[sort]));
  }, [stats, q, sort, db]);
  const go = (id: string) => nav('fleet/journeys', { truckId: id, period });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow={t('Trucks')} title={t('Truck journeys')} subtitle={t('Every trip of our own trucks – loaded or empty, what it earned, what it cost. Tap a truck to see its full journey.')}
        actions={<Segmented options={PERIODS.map((p) => ({ ...p, label: t(p.label) }))} value={period} onChange={(v: any) => setPeriod(v)} />} />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-label={t('Fleet totals')}>
        <KPI label={t('Trucks that ran')} value={`${stats.length} / ${ownCount}`} sub={t('{n} trips', { n: num(tot.trips) })} icon={Truck} />
        <KPI label={t('Km run')} value={num(tot.km)} sub={t('{p}% empty', { p: tot.km ? Math.round((tot.empty / tot.km) * 100) : 0 })} icon={Route} tone={tot.km && tot.empty / tot.km > 0.3 ? 'warn' : 'violet'} />
        <KPI label={t('Freight earned')} value={compactINR(tot.freight)} sub={t('{amt} per km', { amt: tot.km ? inr(tot.freight / tot.km) : '—' })} icon={IndianRupee} tone="ok" />
        <KPI label={t('Trip profit')} value={<span className={tot.trip < 0 ? 'text-bad' : ''}>{compactINR(tot.trip)}</span>} sub={t('after diesel + trip costs {amt}', { amt: compactINR(tot.cost) })} icon={Fuel} tone={tot.trip < 0 ? 'bad' : 'ok'} />
        <KPI label={t('Net after monthly costs')} value={<span className={tot.profit < 0 ? 'text-bad' : ''}>{compactINR(tot.profit)}</span>} sub={t('EMI, tax, insurance {amt} · idle {p}%', { amt: compactINR(tot.fixed), p: tot.days ? Math.round((tot.idle / tot.days) * 100) : 0 })} icon={Gauge} tone={tot.profit < 0 ? 'bad' : 'violet'} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 items-start">
        <section className="card overflow-hidden min-w-0" aria-label={t('Trucks')}>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
            <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Truck number or driver')} className="pl-8 h-10" aria-label={t('Search trucks')} /></div>
            <div className="flex items-center gap-2 text-[12.5px] text-muted min-w-0" role="group" aria-label={t('Sort trucks by')}><span className="shrink-0">{t('Sort by')}</span><Segmented size="sm" options={SORTS.map((o) => ({ ...o, label: t(o.label) })) as any} value={sort} onChange={setSort} /></div>
          </div>
          {!rows.length ? <EmptyState title={t('No trips in this period')} body={t('Pick a longer period above.')} /> : <>
            {/* desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-[11.5px] text-muted border-b border-line">
                  {['Truck', 'Trips', 'Km run', 'Empty', 'Freight', 'Diesel + trip', 'Trip profit', 'Monthly costs', 'Net profit', 'Net ₹/km', 'km/l', 'Idle'].map((h, i) => <th key={h} className={cls('px-3 py-2 font-semibold whitespace-nowrap', i > 0 && 'text-right')}>{t(h)}</th>)}
                </tr></thead>
                <tbody>{rows.map((s) => (
                  <tr key={s.truck.id} className="border-b border-line/60 hover:bg-surface2 cursor-pointer" onClick={() => go(s.truck.id)}>
                    <td className="px-3 py-2.5"><div className="docno text-violet">{s.truck.number}</div><div className="text-[11.5px] text-muted truncate max-w-[180px]">{lookup.driverName(db, s.truck.driverId)}</div></td>
                    <td className="px-3 text-right tnum">{s.trips}</td>
                    <td className="px-3 text-right tnum">{num(s.km)}</td>
                    <td className="px-3 text-right"><EmptyBar pct={s.emptyPct} /></td>
                    <td className="px-3 text-right tnum whitespace-nowrap">{compactINR(s.freight)}</td>
                    <td className="px-3 text-right tnum text-muted whitespace-nowrap">{compactINR(s.diesel + s.other)}</td>
                    <td className={cls('px-3 text-right tnum font-semibold whitespace-nowrap', s.tripProfit < 0 ? 'text-bad' : 'text-ok')}>{compactINR(s.tripProfit)}</td>
                    <td className="px-3 text-right tnum text-muted whitespace-nowrap">{compactINR(s.fixed)}</td>
                    <td className={cls('px-3 text-right tnum font-semibold whitespace-nowrap', s.profit < 0 ? 'text-bad' : '')}>{compactINR(s.profit)}</td>
                    <td className="px-3 text-right tnum">{s.km ? inr(s.perKm) : '—'}</td>
                    <td className="px-3 text-right tnum">{s.kmpl ? s.kmpl.toFixed(1) : '—'}</td>
                    <td className={cls('px-3 text-right tnum', s.idleDays > s.days * 0.4 && 'text-warn font-semibold')}>{s.idleDays}d</td>
                  </tr>))}</tbody>
              </table>
            </div>
            {/* phone list */}
            <ul className="md:hidden divide-y divide-line">{rows.map((s) => (
              <li key={s.truck.id}><button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => go(s.truck.id)}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="docno text-violet">{s.truck.number}</span><span className="text-[11.5px] text-muted">{t('{n} trips', { n: s.trips })} · {num(s.km)} km</span></div>
                  <div className="text-[12px] text-muted mt-0.5">{t('Empty {p}% · idle {d}d', { p: s.emptyPct, d: s.idleDays })}{s.kmpl ? ` · ${s.kmpl.toFixed(1)} km/l` : ''}</div>
                </div>
                <div className="text-right shrink-0"><div className={cls('font-semibold tnum', s.tripProfit < 0 ? 'text-bad' : 'text-ok')}>{compactINR(s.tripProfit)}</div><div className="text-[11px] text-muted">{t('trip profit · net {amt}', { amt: compactINR(s.profit) })}</div></div>
              </button></li>))}
            </ul>
          </>}
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-5 items-start">
          <Card title={t('Lanes we run empty')} subtitle={t('Find a return load on these and the trip pays twice')} icon={PackageOpen}>
            {!lanes.length ? <p className="text-[13px] text-muted">{t('No empty running in this period.')}</p> :
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">{lanes.map((l) => (
                <li key={l.from + l.to} className="text-[13px]">
                  <div className="flex items-center gap-1.5 font-semibold min-w-0"><span className="truncate">{lookup.cityName(db, l.from)}</span><MoveRight size={14} className="text-faint shrink-0" /><span className="truncate">{lookup.cityName(db, l.to)}</span></div>
                  <div className="text-[12px] text-muted">{t('{n} empty trips', { n: l.trips })} · {num(l.km)} km · {l.trucks.size > 1 ? t('{n} trucks', { n: l.trucks.size }) : t('{n} truck', { n: l.trucks.size })}</div>
                </li>))}
              </ul>}
          </Card>
          <Card title={t('How to read this')}>
            <ul className="text-[12.5px] text-muted grid gap-1.5 list-disc pl-4">
              <li><b className="text-ink">{t('Empty')}</b> – {t('km run without a load (going to pick up, or coming back).')}</li>
              <li><b className="text-ink">{t('Trip profit')}</b> – {t('freight minus diesel and trip expenses (bhatta, toll, hamali).')}</li>
              <li><b className="text-ink">{t('Net profit')}</b> – {t('trip profit minus monthly truck costs (EMI, tax, permit, insurance, salary, repairs) for the days in the period. Monthly entries above ₹1 lakh in one head are treated as typing mistakes in the old data and left out.')}</li>
              <li><b className="text-ink">{t('Idle')}</b> – {t('days in the period the truck had no trip.')}</li>
              <li>{t('Km comes from the odometer readings on the trip. Where they are missing, road distance is used.')}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyBar({ pct }: { pct: number }) {
  return <span className="inline-flex items-center gap-2 justify-end"><span className="w-14 h-1.5 rounded-full bg-line overflow-hidden"><span className={cls('block h-full rounded-full', pct > 40 ? 'bg-bad' : pct > 25 ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.min(100, pct)}%` }} /></span><span className="tnum w-9 text-right">{pct}%</span></span>;
}

function TruckJourney({ truckId }: { truckId: string }) {
  const t = useT();
  const db = useDB();
  const { nav, openRecord } = useUI.getState();
  const [period, setPeriod] = usePeriod();
  const [show, setShow] = useState(30);
  const truck = lookup.truck(db, truckId);
  const s: TruckStat | null = useMemo(() => (truck ? truckStat(db, truck, periodFrom(period)) : null), [db, truck, period]);
  const weeks = useMemo(() => {
    if (!s) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const end = addDays(now(), -7 * (11 - i)), a = ymd(addDays(end, -6)), z = ymd(end);
      const w = s.legs.filter((l) => l.trip.startDate >= a && l.trip.startDate <= z);
      return { x: fmtDate(z).slice(0, 6), Loaded: w.filter((l) => l.loaded).reduce((t, l) => t + l.km, 0), Empty: w.filter((l) => !l.loaded).reduce((t, l) => t + l.km, 0) };
    });
  }, [s]);
  if (!truck || !s) return <EmptyState title={t('Truck not found')} action={<button className="btn-ghost" onClick={() => nav('fleet/journeys', {})}>{t('Back to all trucks')}</button>} />;
  const st = truckStatus(db, truck);
  const legs = s.legs.slice(0, show);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <button className="text-[12.5px] link inline-flex items-center gap-1 mb-1" onClick={() => nav('fleet/journeys', { period })}><ArrowLeft size={14} /> {t('All trucks')}</button>
          <h1 className="font-display text-[24px] sm:text-[26px] font-semibold leading-tight flex flex-wrap items-center gap-2"><span className="docno" style={{ fontSize: 22 }}>{truck.number}</span><StatusBadge s={st} /></h1>
          <p className="text-[13px] text-muted mt-0.5">{truck.capacity || t('Own truck')} · {t('Driver {name}', { name: lookup.driverName(db, truck.driverId) })}{s.last ? <> · {s.last.open ? t('last seen on the way to {city}', { city: lookup.cityName(db, s.last.trip.toCity) }) : t('last seen at {city}', { city: lookup.cityName(db, s.last.trip.toCity) })}</> : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Segmented options={PERIODS.map((p) => ({ ...p, label: t(p.label) }))} value={period} onChange={(v: any) => { setPeriod(v); setShow(30); }} />
          <button className="btn-ghost h-9" onClick={() => openRecord('truck', truck.id)}>{t('Truck details')}</button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3" aria-label={t('Truck totals')}>
        <KPI label={t('Trips')} value={s.trips} sub={t('{a} loaded · {b} empty', { a: s.loadedTrips, b: s.trips - s.loadedTrips })} icon={Route} />
        <KPI label={t('Km run')} value={num(s.km)} sub={t('{p}% empty ({km} km)', { p: s.emptyPct, km: num(s.emptyKm) })} icon={Route} tone={s.emptyPct > 35 ? 'warn' : 'violet'} />
        <KPI label={t('Freight earned')} value={compactINR(s.freight)} sub={s.km ? t('{amt} per km', { amt: inr(s.freight / s.km) }) : '—'} icon={IndianRupee} tone="ok" />
        <KPI label={t('Diesel')} value={compactINR(s.diesel)} sub={s.kmpl ? `${num(s.dieselQty)} L · ${s.kmpl.toFixed(1)} km/l` : `${num(s.dieselQty)} L`} icon={Fuel} tone="warn" />
        <KPI label={t('Other costs')} value={compactINR(s.other + s.fixed)} sub={t('Trip {a} · monthly {b}', { a: compactINR(s.other), b: compactINR(s.fixed) })} icon={IndianRupee} tone="bad" />
        <KPI label={t('Net profit')} value={<span className={s.profit < 0 ? 'text-bad' : ''}>{compactINR(s.profit)}</span>} sub={t('Trip profit {amt} · idle {a}/{b} days', { amt: compactINR(s.tripProfit), a: s.idleDays, b: s.days })} icon={Gauge} tone={s.profit < 0 ? 'bad' : 'ok'} />
      </section>

      <ChartCard title={t('Km per week – last 12 weeks')} subtitle={t('Loaded vs empty running')} height={200} legend={[{ label: t('Loaded'), color: 'var(--chart-1)' }, { label: t('Empty'), color: 'rgb(var(--faint))' }]}>
        <Bars data={weeks} stacked keys={[{ key: 'Loaded', label: t('Loaded km'), color: 'var(--chart-1)' }, { key: 'Empty', label: t('Empty km'), color: 'rgb(var(--faint))' }]} />
      </ChartCard>

      <section className="card p-4 sm:p-5" aria-label={t('Journey')}>
        <div className="flex items-center gap-2 mb-4"><h2 className="font-semibold text-[15px] flex-1">{t('Journey – newest first')}</h2><span className="text-[12px] text-muted">{t('{n} trips', { n: s.legs.length })}</span></div>
        {!legs.length ? <p className="text-[13px] text-muted">{t('No trips in this period.')}</p> :
          <ol className="relative grid grid-cols-[minmax(0,1fr)]">
            {legs.map((l, i) => {
              const prev = legs[i + 1]; // older trip
              const gap = prev && !prev.open && prev.trip.endDate && l.trip.startDate ? daysBetween(prev.trip.endDate, l.trip.startDate) : 0;
              const month = l.trip.startDate?.slice(0, 7), prevMonth = i > 0 ? legs[i - 1].trip.startDate?.slice(0, 7) : '';
              return (
                <React.Fragment key={l.trip.id}>
                  {month !== prevMonth && <li className="text-[11.5px] font-semibold text-muted uppercase tracking-wide pl-7 pb-2 pt-1">{fmtDate(month + '-01').slice(3)}</li>}
                  <LegRow l={l} db={db} openRecord={openRecord} />
                  {gap >= 2 && <li className="relative pl-7 py-1.5 text-[12px] text-warn flex items-center gap-1.5"><span className="absolute left-[9px] top-0 bottom-0 border-l-2 border-dashed border-warn/50" /><Clock size={13} /> {t('Stood {n} days at {city}', { n: gap, city: lookup.cityName(db, prev.trip.toCity) })}</li>}
                </React.Fragment>
              );
            })}
          </ol>}
        {s.legs.length > show && <button className="btn-ghost w-full mt-3" onClick={() => setShow(show + 30)}><ChevronDown size={15} /> {t('Show older trips ({n} more)', { n: s.legs.length - show })}</button>}
      </section>
    </div>
  );
}

function LegRow({ l, db, openRecord }: { l: Leg; db: any; openRecord: (t: string, id: string) => void }) {
  const t = useT();
  const trip = l.trip;
  return (
    <li className="relative pl-7 pb-4">
      <span className="absolute left-[9px] top-3 bottom-0 border-l-2 border-line" />
      <span className={cls('absolute left-[3px] top-1.5 w-[14px] h-[14px] rounded-full border-2', l.open ? 'bg-info border-info live-dot' : l.loaded ? 'bg-violet border-violet' : 'bg-surface border-faint')} />
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="flex flex-wrap items-center gap-x-1.5 font-semibold text-[14px]"><span>{lookup.cityName(db, trip.fromCity)}</span><ArrowRight size={14} className="text-faint" /><span>{lookup.cityName(db, trip.toCity)}</span>
            <span className={cls('chip ml-1', l.open ? 'bg-info/10 text-info' : l.loaded ? 'bg-violet/10 text-violet' : 'bg-surface2 text-muted')}>{l.open ? t('On the way') : l.loaded ? t('Loaded') : t('Empty')}</span></div>
          <div className="text-[12px] text-muted mt-0.5">{fmtDate(trip.startDate)}{trip.startTime ? ' ' + trip.startTime : ''}{trip.completed && trip.endDate ? ` → ${fmtDate(trip.endDate)}` : ''} · {l.km ? `${num(l.km)} km${l.kmEst ? ` ${t('(est.)')}` : ''}` : t('km not recorded')}{trip.clientId ? ` · ${lookup.custName(db, trip.clientId)}` : ''}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[12px]">
            {l.lr && <button className="docno text-violet hover:underline" onClick={() => openRecord('lr', l.lr.id)}>{l.lr.lrNo}</button>}
            <button className="text-muted hover:text-ink underline-offset-2 hover:underline" onClick={() => openRecord('trip', trip.id)}>{t('Trip details')}</button>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-x-4 text-right text-[12px] shrink-0">
          <div><dt className="text-faint">{t('Freight')}</dt><dd className="tnum font-semibold">{l.freight ? inr(l.freight) : '—'}</dd></div>
          <div><dt className="text-faint">{t('Diesel')}</dt><dd className="tnum">{l.diesel ? inr(l.diesel) : '—'}{l.dieselQty ? <span className="block text-faint text-[11px]">{num(l.dieselQty)} L</span> : null}</dd></div>
          <div><dt className="text-faint">{t('Other')}</dt><dd className="tnum">{l.other ? inr(l.other) : '—'}</dd></div>
        </dl>
      </div>
    </li>
  );
}
