#!/usr/bin/env node
// Local full stack for development and browser QA – never used in production.
//   node scripts/dev-stack.mjs            → throwaway PostgreSQL 16 + the real API (api/server.mjs) + vite preview
// It applies every migration in sql/, creates sample login accounts (dev-only passwords below), loads the sample ERP
// dataset (src/store/seed.ts) as the shared ERP state, and serves the built frontend with /auth and /api proxied to
// the API. Everything lives in a temp directory and is deleted on exit (Ctrl+C).
// Env: SK_DEV_API_PORT (3107), SK_DEV_WEB_PORT (4173), SK_DEV_PREVIEW=1 to serve a production build (vite preview)
// instead of the vite dev server, SK_DEV_NO_BUILD=1 to reuse dist/ with preview, PG_BIN.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '..'), repo = path.resolve(web, '../..'), apiDir = path.join(repo, 'api');
const pg = (await import(path.join(apiDir, 'node_modules/pg/lib/index.js'))).default;
const { hashPassword } = await import(path.join(apiDir, 'auth.mjs'));
const PGBIN = process.env.PG_BIN || '/usr/lib/postgresql/16/bin';
const API_PORT = Number(process.env.SK_DEV_API_PORT || 3107), WEB_PORT = Number(process.env.SK_DEV_WEB_PORT || 4173);
// Dev-only accounts for the throwaway local database. Not used anywhere else.
export const DEV_USERS = [
  { username: 'demo.superadmin', password: 'DevOnly-Super-2026', role: 'superadmin', full_name: 'Demo Super Admin', branch_code: 'JL' },
  { username: 'demo.admin', password: 'DevOnly-Admin-2026', role: 'admin', full_name: 'Demo Admin', branch_code: 'JL' },
  { username: 'demo.ops', password: 'DevOnly-Ops-2026', role: 'operator', full_name: 'Ravi Patil', branch_code: 'JL', department: 'Operations', designation: 'Booking Executive' },
  { username: 'demo.accounts', password: 'DevOnly-Acc-2026', role: 'accountant', full_name: 'Sneha Kulkarni', branch_code: 'JL', department: 'Accounts', designation: 'Accounts Executive' },
];
const isRoot = process.getuid?.() === 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-erp-dev-'));
const dataDir = path.join(tmp, 'data'), sockDir = path.join(tmp, 'sock');
const procs = [];
let pgStarted = false;
const asPg = (bin, args) => isRoot ? execFileSync('runuser', ['-u', 'postgres', '--', path.join(PGBIN, bin), ...args], { stdio: 'pipe' }) : execFileSync(path.join(PGBIN, bin), args, { stdio: 'pipe' });
function teardown() {
  for (const p of procs) { try { p.kill('SIGKILL'); } catch { /* */ } }
  if (pgStarted) { try { asPg('pg_ctl', ['-D', dataDir, '-m', 'immediate', '-w', 'stop']); } catch { /* */ } pgStarted = false; }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { teardown(); process.exit(0); });
process.on('exit', teardown);

fs.mkdirSync(sockDir);
if (isRoot) { const uid = Number(execFileSync('id', ['-u', 'postgres']).toString()), gid = Number(execFileSync('id', ['-g', 'postgres']).toString()); fs.chownSync(tmp, uid, gid); fs.chownSync(sockDir, uid, gid); }
asPg('initdb', ['-D', dataDir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-instructions']);
const pgPort = 54000 + Math.floor(Math.random() * 900);
asPg('pg_ctl', ['-D', dataDir, '-l', path.join(tmp, 'pg.log'), '-w', '-o', `-p ${pgPort} -k ${sockDir} -c listen_addresses=''`, 'start']);
pgStarted = true;
const client = async (db) => { const c = new pg.Client({ host: sockDir, port: pgPort, user: 'postgres', database: db }); await c.connect(); return c; };
const c0 = await client('postgres');
await c0.query('CREATE DATABASE sk_translines');
for (const r of ['sk_erp_reader', 'sk_erp_writer', 'sk_erp_api']) await c0.query(`CREATE ROLE ${r} NOLOGIN`);
await c0.query("CREATE ROLE sk_dev_reader LOGIN PASSWORD 'dev-only-reader' IN ROLE sk_erp_reader");
await c0.query("CREATE ROLE sk_dev_writer LOGIN PASSWORD 'dev-only-writer' IN ROLE sk_erp_writer");
await c0.end();
const db = await client('sk_translines');
await db.query(`CREATE SCHEMA app; CREATE SCHEMA legacy;
  CREATE TABLE app.users(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,username text NOT NULL UNIQUE,password_hash text NOT NULL,role text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
  GRANT USAGE ON SCHEMA app TO sk_erp_reader; GRANT SELECT ON app.users TO sk_erp_reader;
  -- tiny stand-ins for the historical tables read by /api/dashboard and /api/analytics
  CREATE TABLE legacy.lr_detail(lr_detail_id bigint, lr_number text, created_date timestamptz, lr_date date, branch_id bigint, total_weight numeric, total_freight numeric);
  CREATE TABLE legacy.customer(id bigint); CREATE TABLE legacy.branch(id bigint); CREATE TABLE legacy.account_ledger(id bigint);
  CREATE TABLE legacy.bill_detail(bill_id bigint, bill_number text, bill_date date, net_amt numeric, pending_amt numeric);
  INSERT INTO legacy.lr_detail VALUES (1,'SKT/JAL/0001',now(),current_date,14,1200,18000);
  INSERT INTO legacy.bill_detail VALUES (1,'B-0001',current_date,21000,21000);
  GRANT USAGE ON SCHEMA legacy TO sk_erp_reader; GRANT SELECT ON ALL TABLES IN SCHEMA legacy TO sk_erp_reader;`);
for (const f of fs.readdirSync(path.join(repo, 'sql')).filter((f) => /^\d+_.*\.sql$/.test(f) && !f.startsWith('01_') && !f.startsWith('02_')).sort()) await db.query(fs.readFileSync(path.join(repo, 'sql', f), 'utf8'));
for (const u of DEV_USERS) await db.query("INSERT INTO app.users(username,password_hash,role,active,full_name,branch_code,department,designation) VALUES($1,$2,$3,true,$4,$5,$6,$7)", [u.username, hashPassword(u.password), u.role, u.full_name, u.branch_code || '', u.department || '', u.designation || '']);
// Sample ERP dataset as the shared state document.
const seedOut = path.join(tmp, 'seed.mjs');
await build({ stdin: { contents: "import { buildSeed } from './src/store/seed'; export default buildSeed;", resolveDir: web, loader: 'ts' }, outfile: seedOut, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' });
const buildSeed = (await import('file://' + seedOut)).default;
const seed = buildSeed();
await db.query('INSERT INTO app.erp_state(id,data,version) VALUES(1,$1,1)', [{ ...seed, source: 'legacy' }]);
await db.end();

const api = spawn(process.execPath, [path.join(apiDir, 'server.mjs')], { cwd: apiDir, env: { PATH: process.env.PATH, SK_API_PORT: String(API_PORT), SK_API_HOST: '127.0.0.1', SK_DB_HOST: sockDir, SK_DB_PORT: String(pgPort), SK_DB_NAME: 'sk_translines', SK_DB_USER: 'sk_dev_reader', SK_DB_PASSWORD: 'dev-only-reader', SK_DB_WRITE_USER: 'sk_dev_writer', SK_DB_WRITE_PASSWORD: 'dev-only-writer' }, stdio: ['ignore', 'inherit', 'inherit'] });
procs.push(api);
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${API_PORT}/health`)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 100)); }
const usePreview = !!process.env.SK_DEV_PREVIEW;
if (usePreview && !process.env.SK_DEV_NO_BUILD) execFileSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: web, stdio: 'inherit' });
const preview = spawn('npx', usePreview ? ['vite', 'preview', '--port', String(WEB_PORT), '--strictPort', '--host', '127.0.0.1'] : ['vite', '--port', String(WEB_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: web, env: { ...process.env, SK_API_PROXY: `http://127.0.0.1:${API_PORT}` }, stdio: ['ignore', 'inherit', 'inherit'] });
procs.push(preview);
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${WEB_PORT}/`)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 100)); }
console.log(`\nSK ERP dev stack ready\n  web  http://127.0.0.1:${WEB_PORT}/\n  api  http://127.0.0.1:${API_PORT}/ (PostgreSQL on socket ${sockDir}:${pgPort})\n  dev-only logins:`);
for (const u of DEV_USERS) console.log(`    ${u.username.padEnd(16)} ${u.password.padEnd(20)} ${u.role}`);
console.log('READY');
await new Promise(() => {});
