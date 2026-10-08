// Screen language: English, Hindi, Marathi. English text is the key; dictionaries map it to the translation.
// Keys may hold {placeholders}: t('You have {n} things to do', { n: 5 }). Untranslated text falls back to English.
// Dynamic messages (toasts like "SKT/JAL/14732 finalised") are matched against pattern keys ("{no} finalised").
import HI from './i18n-hi';
import MR from './i18n-mr';

export type Lang = 'en' | 'hi' | 'mr';
export const LANGS: { key: Lang; label: string; short: string; english: string }[] = [
  { key: 'en', label: 'English', short: 'EN', english: 'English' },
  { key: 'hi', label: 'हिन्दी', short: 'हि', english: 'Hindi' },
  { key: 'mr', label: 'मराठी', short: 'म', english: 'Marathi' },
];
const DICTS: Record<string, Record<string, string>> = { hi: HI, mr: MR };

let current: Lang = 'en';
export const setCurrentLang = (l: Lang) => { current = l; try { document.documentElement.lang = l === 'en' ? 'en-IN' : l; } catch { /* */ } };
export const getLang = () => current;

// Keys seen on screen without a translation – read by the test crawler to build the dictionaries.
const missing: Record<string, Set<string>> = { hi: new Set(), mr: new Set() };
try { (globalThis as any).__i18nMissing = missing; } catch { /* */ }

type Pat = { re: RegExp; names: string[]; key: string };
const patCache: Record<string, Pat[]> = {};
function patterns(lang: string): Pat[] {
  if (patCache[lang]) return patCache[lang];
  const out: Pat[] = [];
  for (const key of Object.keys(DICTS[lang] || {})) {
    if (!key.includes('{')) continue;
    const names: string[] = [];
    const src = key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\w+)\\?\}/g, (_m, n) => { names.push(n); return '(.+?)'; });
    out.push({ re: new RegExp('^' + src + '$'), names, key });
  }
  return (patCache[lang] = out);
}

const fill = (s: string, vars?: Record<string, any>) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m)) : s);

export function tr(lang: Lang, s: string, vars?: Record<string, any>): string {
  if (!s || typeof s !== 'string') return s;
  if (lang === 'en') return fill(s, vars);
  const d = DICTS[lang];
  const hit = d[s];
  if (hit !== undefined) return fill(hit, vars);
  if (!vars) {
    for (const p of patterns(lang)) {
      const m = s.match(p.re);
      if (m) { const v: Record<string, string> = {}; p.names.forEach((n, i) => (v[n] = d[m[i + 1]] ?? m[i + 1])); return fill(d[p.key], v); }
    }
  }
  if (/[A-Za-z]{2}/.test(s)) missing[lang]?.add(s);
  return fill(s, vars);
}

/** translate with the current screen language (for code outside React render, e.g. toasts) */
export const tNow = (s: string, vars?: Record<string, any>) => tr(current, s, vars);
