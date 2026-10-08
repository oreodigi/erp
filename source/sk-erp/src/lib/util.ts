// Formatting, dates, ids, export helpers shared across the ERP.
export const inr = (n: number | undefined | null, dp = 0) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const num = (n: number | undefined | null, dp = 0) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const compactINR = (n: number): string => {
  if (n < 0) return '-' + compactINR(-n);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + Math.round(n);
};
export const pct = (n: number, dp = 0) => `${(n || 0).toFixed(dp)}%`;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(+x)) return d;
  return `${String(x.getDate()).padStart(2, '0')} ${MON[x.getMonth()]} ${x.getFullYear()}`;
};
export const fmtDT = (d?: string | null) => {
  if (!d) return '—';
  const x = new Date(d);
  return `${fmtDate(d)}, ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
// Business clock: when a dataset carries an "as of" date (e.g. a legacy backup), the app treats that day as today
// (keeping the real time of day) so ageing, dashboards and default date ranges line up with the data.
let AS_OF: string | null = null;
export const setAsOf = (d: string | null | undefined) => { AS_OF = d || null; };
export const getAsOf = () => AS_OF;
export const now = (): Date => { const r = new Date(); if (!AS_OF) return r; const [y, m, dd] = AS_OF.split('-').map(Number); r.setFullYear(y, m - 1, dd); return r; };
export const iso = (d: Date = now()) => d.toISOString();
export const ymd = (d: Date | string = now()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const hm = (d: Date | string = now()) => { const x = new Date(d); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
export const addDays = (d: Date | string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const daysBetween = (a: string | Date, b: string | Date = now()) => Math.floor((+new Date(b) - +new Date(a)) / 864e5);
export const ago = (d: string) => {
  const s = (+now() - +new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const groupBy = <T,>(arr: T[], f: (x: T) => string) => arr.reduce((m, x) => { const k = f(x); (m[k] ||= []).push(x); return m; }, {} as Record<string, T[]>);
export const cls = (...a: any[]) => a.filter(Boolean).join(' ');
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const fy = (d: Date = now()) => { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${String(y).slice(2)}-${String(y + 1).slice(2)}`; };

export function toWords(n: number): string {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''));
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x));
  let out = '';
  const cr = Math.floor(n / 1e7); n %= 1e7;
  const lk = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) out += three(cr) + ' Crore ';
  if (lk) out += two(lk) + ' Lakh ';
  if (th) out += two(th) + ' Thousand ';
  if (n) out += three(n);
  return out.trim();
}

const ALLOWED_EXT = /\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i;
let dlNs: Promise<any> | null = null;
function downloadsNs() {
  if (!dlNs) {
    const c = (window as any).claude;
    dlNs = c && typeof c.use === 'function' ? Promise.resolve(c.use('downloads')).catch(() => null) : Promise.resolve(null);
  }
  return dlNs;
}
export type SaveOutcome = 'saved' | 'declined' | 'unavailable' | 'empty';
/** Offer a generated file to the viewer: artifact downloads capability first, browser blob link as fallback. */
export async function saveFile(filename: string, data: string, type = 'text/plain'): Promise<SaveOutcome> {
  if (!data) return 'empty';
  const fname = ALLOWED_EXT.test(filename) ? filename : filename + '.txt';
  const ns = await downloadsNs();
  if (ns && typeof ns.save === 'function') {
    try { await ns.save({ filename: fname, data }); return 'saved'; }
    catch (e: any) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return 'declined'; }
  }
  try {
    const blob = new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    return 'saved';
  } catch { return 'unavailable'; }
}
export function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
export function downloadCSV(name: string, rows: Record<string, any>[]) {
  return saveFile(name.replace(/[^\w.-]+/g, '_') + '.csv', toCSV(rows), 'text/csv');
}
export function downloadText(name: string, text: string, type = 'text/plain') {
  return saveFile(name, text, type);
}
/** Toast text for a save outcome. */
export function saveMsg(o: SaveOutcome, ok: string): [string, 'ok' | 'warn' | 'bad'] {
  if (o === 'saved') return [ok, 'ok'];
  if (o === 'declined') return ['Download cancelled', 'warn'];
  if (o === 'empty') return ['Nothing to export', 'warn'];
  return ['Downloads are not available in this view', 'bad'];
}

export const safeStorage = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// Seeded PRNG for reproducible demo data
export function rng(seed = 42) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    r,
    int: (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a,
    pick: <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)],
    chance: (p: number) => r() < p,
  };
}
