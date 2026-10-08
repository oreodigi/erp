// Data sources for the ERP prototype:
//  - 'legacy': SK Logistics production data converted from the SQL Server backup (embedded, gzip + base64)
//  - 'sample': generated sample data (buildSeed)
// The working copy is kept in IndexedDB so edits survive a refresh; large datasets do not fit localStorage.
// Sensitive legacy records must never be bundled into browser JavaScript.
const LEGACY_GZ_B64 = ''; // Historical records are available only through the private PostgreSQL API.
import { NAV, ROLE_GROUPS } from '../nav';

export type Source = 'legacy' | 'sample';
export const hasLegacy = () => typeof LEGACY_GZ_B64 === 'string' && LEGACY_GZ_B64.length > 100;
export const LEGACY_VERSION = 101; // bump when the embedded dataset or its mapping changes

async function gunzipJSON(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const DS: any = (globalThis as any).DecompressionStream;
  if (!DS) throw new Error('This browser cannot decompress the dataset (DecompressionStream missing).');
  const stream = new Blob([bytes]).stream().pipeThrough(new DS('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

export async function loadLegacy(): Promise<any> {
  const db = await gunzipJSON(LEGACY_GZ_B64);
  db.version = LEGACY_VERSION;
  db.roles = db.roles.map((r: any) => ({ ...r, menus: NAV.filter((g) => (ROLE_GROUPS[r.code] || []).includes(g.key)).flatMap((g) => g.items.map((i) => i.key)) }));
  return db;
}

// ---------------- IndexedDB key/value ----------------
const DB_NAME = 'skt-erp';
const STORE = 'kv';
function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { try { req.result.createObjectStore(STORE); } catch { /* exists */ } };
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
    } catch { res(null); }
  });
}
let idbP: Promise<IDBDatabase | null> | null = null;
const idb = () => (idbP ||= openIDB());

export async function idbGet<T = any>(key: string): Promise<T | null> {
  const db = await idb();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res((r.result as T) ?? null);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
export async function idbSet(key: string, val: any): Promise<boolean> {
  const db = await idb();
  if (!db) return false;
  return new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
      tx.onabort = () => res(false);
    } catch { res(false); }
  });
}
export async function idbDel(key: string) {
  const db = await idb();
  if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); } catch { /* */ }
}

const PREF = 'skt-source';
export const getSourcePref = (): Source => {
  let v: string | null = null;
  try { v = localStorage.getItem(PREF); } catch { /* */ }
  if (v === 'sample' || v === 'legacy') return v === 'legacy' && !hasLegacy() ? 'sample' : (v as Source);
  return hasLegacy() ? 'legacy' : 'sample';
};
export const setSourcePref = (s: Source) => { try { localStorage.setItem(PREF, s); } catch { /* */ } };
