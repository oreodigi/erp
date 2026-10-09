// Integration tests for the SK ERP API: user management + Training Academy.
// Spins up a throwaway PostgreSQL 16 cluster in a temp dir, applies the repo
// migrations, starts server.mjs against it and exercises the HTTP endpoints.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {hashPassword} from '../auth.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const apiDir=path.resolve(here,'..'),repo=path.resolve(apiDir,'..');
const PGBIN=process.env.PG_BIN||(()=>{try{return execFileSync('pg_config',['--bindir'],{encoding:'utf8'}).trim();}catch{return '/usr/bin';}})();
const ROOT_USER='root.admin',ROOT_PASS='TestOnly-Root-Passw0rd';
const isRoot=process.getuid?.()===0;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sk-erp-test-'));
const dataDir=path.join(tmp,'data'),sockDir=path.join(tmp,'sock');
let pgStarted=false,apiProc=null,apiLog='',failures=0,passes=0;

const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.unref();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});
const asPg=(bin,args)=>isRoot?execFileSync('runuser',['-u','postgres','--',path.join(PGBIN,bin),...args],{stdio:'pipe'}):execFileSync(path.join(PGBIN,bin),args,{stdio:'pipe'});
function teardown(){
 if(apiProc&&apiProc.exitCode===null){try{apiProc.kill('SIGKILL');}catch{}}
 if(pgStarted){try{asPg('pg_ctl',['-D',dataDir,'-m','immediate','-w','stop']);}catch{}pgStarted=false;}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{teardown();process.exit(130);});

async function step(name,fn){
 try{await fn();passes++;console.log('PASS',name);}
 catch(e){failures++;console.log('FAIL',name,'\n  ',e?.stack||e);}
}

let pgPort,apiPort,admin;
async function startPostgres(){
 fs.mkdirSync(sockDir);
 if(isRoot){const uid=Number(execFileSync('id',['-u','postgres']).toString().trim()),gid=Number(execFileSync('id',['-g','postgres']).toString().trim());fs.chownSync(tmp,uid,gid);fs.chownSync(sockDir,uid,gid);}
 asPg('initdb',['-D',dataDir,'-U','postgres','-A','trust','-E','UTF8','--no-instructions']);
 pgPort=await freePort();
 asPg('pg_ctl',['-D',dataDir,'-l',path.join(tmp,'pg.log'),'-w','-o',`-p ${pgPort} -k ${sockDir} -c listen_addresses=''`,'start']);
 pgStarted=true;
}
const superClient=async db=>{const c=new pg.Client({host:sockDir,port:pgPort,user:'postgres',database:db});await c.connect();return c;};
async function applyFile(c,file){await c.query(fs.readFileSync(path.join(repo,'sql',file),'utf8'));}
async function bootstrap(){
 const c0=await superClient('postgres');
 await c0.query('CREATE DATABASE sk_translines');
 for(const r of ['sk_erp_reader','sk_erp_writer','sk_erp_api'])await c0.query(`CREATE ROLE ${r} NOLOGIN`);
 await c0.query("CREATE ROLE sk_test_reader LOGIN PASSWORD 'test-only-reader' IN ROLE sk_erp_reader");
 await c0.query("CREATE ROLE sk_test_writer LOGIN PASSWORD 'test-only-writer' IN ROLE sk_erp_writer");
 await c0.end();
 admin=await superClient('sk_translines');
 // Minimal production-like app.users (production creates it out-of-band).
 await admin.query(`CREATE SCHEMA app;
  CREATE TABLE app.users(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,username text NOT NULL UNIQUE,password_hash text NOT NULL,role text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
  GRANT USAGE ON SCHEMA app TO sk_erp_reader;GRANT SELECT ON app.users TO sk_erp_reader;`);
 for(const f of ['03_operational_foundation.sql','04_api_writer.sql','05_writer_access.sql','06_erp_state.sql','07_dashboard_layouts.sql','08_communication.sql','09_communication_audit_grant.sql','10_users_training_academy.sql','11_feedback_system.sql'])await applyFile(admin,f);
 await applyFile(admin,'10_users_training_academy.sql'); // idempotent re-run
 await admin.query("INSERT INTO app.users(username,password_hash,role,active,full_name) VALUES($1,$2,'superadmin',true,'Root Admin')",[ROOT_USER,hashPassword(ROOT_PASS)]);
}
async function startApi(){
 apiPort=await freePort();
 apiProc=spawn(process.execPath,[path.join(apiDir,'server.mjs')],{cwd:apiDir,env:{PATH:process.env.PATH,SK_API_PORT:String(apiPort),SK_API_HOST:'127.0.0.1',SK_DB_HOST:sockDir,SK_DB_PORT:String(pgPort),SK_DB_NAME:'sk_translines',SK_DB_USER:'sk_test_reader',SK_DB_PASSWORD:'test-only-reader',SK_DB_WRITE_USER:'sk_test_writer',SK_DB_WRITE_PASSWORD:'test-only-writer',SK_FEEDBACK_DIR:path.join(tmp,'feedback')},stdio:['ignore','pipe','pipe']});
 apiProc.stdout.on('data',d=>apiLog+=d);apiProc.stderr.on('data',d=>apiLog+=d);
 for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${apiPort}/health`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}
 throw Error('API did not start:\n'+apiLog);
}
async function api(method,p,{token,body,raw}={}){
 const headers={};if(token)headers.Authorization='Bearer '+token;if(body!==undefined||raw!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(`http://127.0.0.1:${apiPort}${p}`,{method,headers,body:raw??(body===undefined?undefined:JSON.stringify(body))});
 const text=await r.text();let json=null;try{json=JSON.parse(text);}catch{}
 return {status:r.status,json};
}
async function login(username,password){const r=await api('POST','/auth/login',{body:{username,password}});assert.equal(r.status,200,`login ${username}: ${JSON.stringify(r.json)}`);return r.json;}
const expectStatus=(r,s,msg)=>assert.equal(r.status,s,(msg||'')+' -> '+JSON.stringify(r.json));

async function run(){
 await startPostgres();await bootstrap();await startApi();
 let root,rootId,alice,aliceId,alicePass,bob,bobId,erin,erinId,erinPass,carolId,carolTemp,daveId;
 const tempPasswords=[];

 // ---------- auth ----------
 await step('login succeeds for seeded superadmin and returns profile',async()=>{
  const r=await login(ROOT_USER,ROOT_PASS);root=r.token;rootId=r.user.id;
  assert.match(root,/^[a-f0-9]{64}$/);
  for(const k of ['id','username','role','full_name','branch_code','department','designation','extra_permissions','denied_permissions','must_change_password'])assert.ok(k in r.user,k);
  assert.equal(r.user.role,'superadmin');assert.equal(r.user.full_name,'Root Admin');assert.ok(!('password_hash' in r.user));
  const db=await admin.query('SELECT last_login_at FROM app.users WHERE id=$1',[rootId]);assert.ok(db.rows[0].last_login_at,'last_login_at set');
 });
 await step('login fails with wrong password / unknown user',async()=>{
  expectStatus(await api('POST','/auth/login',{body:{username:ROOT_USER,password:'wrong-password-123'}}),401);
  expectStatus(await api('POST','/auth/login',{body:{username:'nobody.here',password:'wrong-password-123'}}),401);
 });
 await step('unauthenticated requests get 401',async()=>{
  for(const [m,p] of [['GET','/auth/me'],['GET','/api/admin/users'],['GET','/api/training/me'],['POST','/api/training/records'],['GET','/api/training/team']])expectStatus(await api(m,p),401,p);
  expectStatus(await api('GET','/auth/me',{token:'a'.repeat(64)}),401);
 });
 await step('/auth/me returns full profile shape',async()=>{
  const r=await api('GET','/auth/me',{token:root});expectStatus(r,200);
  assert.equal(r.json.user.username,ROOT_USER);assert.deepEqual(r.json.user.extra_permissions,[]);assert.equal(r.json.user.must_change_password,false);
 });

 // ---------- create user ----------
 await step('create user validation errors return 400',async()=>{
  const base={username:'valid.user',full_name:'Valid User',role:'operator'};
  const bad=[{username:'ab'},{username:'bad name!'},{username:'x.deleted.12'},{full_name:''},{full_name:'x'.repeat(121)},{full_name:undefined},{role:'emperor'},{role:undefined},{email:'not-an-email'},{phone:'12ab'},{phone:'1'.repeat(21)},{branch_code:'TOO-LONG-CODE-1'},{department:'d'.repeat(81)},{extra_permissions:['Bad Perm']},{extra_permissions:['a','a']},{denied_permissions:'fleet/view'},{extra_permissions:Array.from({length:201},(_,i)=>'p'+i)},{password:'short1'},{password:'onlyletterspassword'}];
  for(const b of bad){const body={...base,...b};for(const k of Object.keys(body))if(body[k]===undefined)delete body[k];expectStatus(await api('POST','/api/admin/users',{token:root,body}),400,JSON.stringify(b));}
  const n=await admin.query("SELECT count(*)::int n FROM app.users WHERE username ILIKE 'valid.user%' OR username ILIKE 'x.deleted%'");assert.equal(n.rows[0].n,0);
 });
 await step('create user returns 201 with one-time temporaryPassword and must_change_password',async()=>{
  const r=await api('POST','/api/admin/users',{token:root,body:{username:'alice',full_name:'Alice Kumar',role:'operator',branch_code:'DEL',email:'alice@example.test',phone:'+91 98765-43210',department:'Ops',designation:'Executive'}});
  expectStatus(r,201);aliceId=r.json.user.id;alicePass=r.json.temporaryPassword;tempPasswords.push(alicePass);
  assert.ok(alicePass.length>=12&&/[A-Za-z]/.test(alicePass)&&/[0-9]/.test(alicePass));
  assert.equal(r.json.user.must_change_password,true);assert.equal(r.json.user.branch_code,'DEL');assert.ok(!('password_hash' in r.json.user));
  const db=await admin.query('SELECT created_by,must_change_password FROM app.users WHERE id=$1',[aliceId]);assert.equal(String(db.rows[0].created_by),String(rootId));
  const list=await api('GET','/api/admin/users',{token:root});expectStatus(list,200);
  assert.ok(!JSON.stringify(list.json).includes(alicePass),'temporary password never listed');
  const a=list.json.users.find(u=>u.username==='alice');assert.ok(a);assert.deepEqual(a.training,{lessons_completed:0,records:0,last_activity_at:null,quizzes_passed:0,best_quiz_avg:null});
  for(const k of ['id','username','role','active','created_at','full_name','email','phone','branch_code','department','designation','extra_permissions','denied_permissions','last_login_at','must_change_password','deleted_at','updated_at','training'])assert.ok(k in a,k);
 });
 await step('duplicate username (case-insensitive) returns 409',async()=>{
  const r=await api('POST','/api/admin/users',{token:root,body:{username:'ALICE',full_name:'Dup',role:'operator'}});expectStatus(r,409);assert.equal(r.json.error,'Username already exists');
 });
 await step('create user with explicit valid password',async()=>{
  const r=await api('POST','/api/admin/users',{token:root,body:{username:'erin',full_name:'Erin Operator',role:'operator',password:'Explicit-Passw0rd-1'}});
  expectStatus(r,201);assert.equal(r.json.temporaryPassword,'Explicit-Passw0rd-1');erinId=r.json.user.id;erinPass='Explicit-Passw0rd-1';
 });
 await step('new user can log in; must_change_password clears after change-password',async()=>{
  const r=await login('alice',alicePass);alice=r.token;assert.equal(r.user.must_change_password,true);assert.equal(r.user.full_name,'Alice Kumar');
  const ch=await api('POST','/auth/change-password',{token:alice,body:{current_password:alicePass,new_password:'Alice-New-Passw0rd'}});expectStatus(ch,200);alicePass='Alice-New-Passw0rd';
  const me=await api('GET','/auth/me',{token:alice});assert.equal(me.json.user.must_change_password,false);
  const db=await admin.query('SELECT password_changed_at FROM app.users WHERE id=$1',[aliceId]);assert.ok(db.rows[0].password_changed_at);
  erin=(await login('erin',erinPass)).token;
 });
 await step('non-admin gets 403 on admin user endpoints',async()=>{
  expectStatus(await api('GET','/api/admin/users',{token:alice}),403);
  expectStatus(await api('POST','/api/admin/users',{token:alice,body:{username:'zed',full_name:'Z',role:'operator'}}),403);
  expectStatus(await api('PATCH',`/api/admin/users/${erinId}`,{token:alice,body:{full_name:'Hacked'}}),403);
  expectStatus(await api('DELETE',`/api/admin/users/${erinId}`,{token:alice}),403);
  expectStatus(await api('POST',`/api/admin/users/${erinId}/reset-password`,{token:alice,body:{}}),403);
 });
 await step('wrong methods and bad ids are rejected',async()=>{
  expectStatus(await api('PUT',`/api/admin/users/${aliceId}`,{token:root,body:{}}),405);
  expectStatus(await api('GET',`/api/admin/users/${aliceId}/reset-password`,{token:root}),405);
  expectStatus(await api('PATCH','/api/admin/users/abc',{token:root,body:{full_name:'x'}}),404);
  expectStatus(await api('PATCH','/api/admin/users/999999',{token:root,body:{full_name:'x'}}),404);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{password:'Whatever-Passw0rd'}}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{}}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,raw:'{not json'}),400);
 });

 // ---------- edit / role / permissions ----------
 await step('profile edit applies to /auth/me without re-login (no session revocation)',async()=>{
  const r=await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{full_name:'Alice K. Sharma',designation:'Senior Executive'}});expectStatus(r,200);
  assert.equal(r.json.user.full_name,'Alice K. Sharma');
  const me=await api('GET','/auth/me',{token:alice});expectStatus(me,200);assert.equal(me.json.user.full_name,'Alice K. Sharma');assert.equal(me.json.user.designation,'Senior Executive');
 });
 await step('role assignment revokes sessions and applies on next login',async()=>{
  const r=await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{role:'manager'}});expectStatus(r,200);assert.equal(r.json.user.role,'manager');
  expectStatus(await api('GET','/auth/me',{token:alice}),401,'old session revoked');
  const l=await login('alice',alicePass);alice=l.token;assert.equal(l.user.role,'manager');
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{role:'emperor'}}),400);
 });
 await step('permission arrays update, revoke sessions and show in /auth/me',async()=>{
  const r=await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{extra_permissions:['fleet/view','reports/export'],denied_permissions:['finance/approve']}});expectStatus(r,200);
  expectStatus(await api('GET','/auth/me',{token:alice}),401);
  alice=(await login('alice',alicePass)).token;
  const me=await api('GET','/auth/me',{token:alice});assert.deepEqual(me.json.user.extra_permissions,['fleet/view','reports/export']);assert.deepEqual(me.json.user.denied_permissions,['finance/approve']);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{extra_permissions:['UPPER']}}),400);
  // Re-sending identical permissions does not revoke.
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{extra_permissions:['reports/export','fleet/view']}}),200);
  expectStatus(await api('GET','/auth/me',{token:alice}),200);
 });
 await step('deactivate revokes session and blocks login; reactivate restores',async()=>{
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{active:false}}),200);
  expectStatus(await api('GET','/auth/me',{token:alice}),401);
  expectStatus(await api('POST','/auth/login',{body:{username:'alice',password:alicePass}}),401);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{active:'no'}}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:root,body:{active:true}}),200);
  alice=(await login('alice',alicePass)).token;
 });
 await step('/auth/me returns 401 when account is deactivated out-of-band',async()=>{
  const t=(await login('erin',erinPass)).token;
  await admin.query('UPDATE app.users SET active=false WHERE id=$1',[erinId]);
  expectStatus(await api('GET','/auth/me',{token:t}),401);
  await admin.query('UPDATE app.users SET active=true WHERE id=$1',[erinId]);
  expectStatus(await api('GET','/auth/me',{token:t}),401,'session stays revoked');
  erin=(await login('erin',erinPass)).token;
 });
 await step('reset password revokes sessions, sets must_change_password, old password fails',async()=>{
  const r=await api('POST',`/api/admin/users/${aliceId}/reset-password`,{token:root,body:{}});expectStatus(r,200);
  const temp=r.json.temporaryPassword;tempPasswords.push(temp);assert.ok(temp.length>=12&&/[0-9]/.test(temp)&&/[A-Za-z]/.test(temp));
  expectStatus(await api('GET','/auth/me',{token:alice}),401);
  expectStatus(await api('POST','/auth/login',{body:{username:'alice',password:alicePass}}),401);
  const l=await login('alice',temp);alice=l.token;assert.equal(l.user.must_change_password,true);alicePass=temp;
  const empty=await api('POST',`/api/admin/users/${aliceId}/reset-password`,{token:root});expectStatus(empty,200,'no body accepted');
  tempPasswords.push(empty.json.temporaryPassword);alicePass=empty.json.temporaryPassword;alice=(await login('alice',alicePass)).token;
  expectStatus(await api('POST',`/api/admin/users/${aliceId}/reset-password`,{token:root,body:{password:'weak'}}),400);
 });

 // ---------- admin vs superadmin, self rules, last superadmin ----------
 await step('last active superadmin cannot be deactivated, deleted or demoted (409)',async()=>{
  for(const [m,b] of [['PATCH',{active:false}],['DELETE',undefined],['PATCH',{role:'admin'}]]){
   const r=await api(m,`/api/admin/users/${rootId}`,{token:root,body:b});expectStatus(r,409,m);assert.match(r.json.error,/last active Super Admin/);
  }
  const db=await admin.query('SELECT active,role,deleted_at FROM app.users WHERE id=$1',[rootId]);assert.deepEqual(db.rows[0],{active:true,role:'superadmin',deleted_at:null});
 });
 await step('admin can manage users but not superadmins, and cannot grant superadmin',async()=>{
  const c=await api('POST','/api/admin/users',{token:root,body:{username:'bob',full_name:'Bob Admin',role:'admin'}});expectStatus(c,201);bobId=c.json.user.id;tempPasswords.push(c.json.temporaryPassword);
  bob=(await login('bob',c.json.temporaryPassword)).token;
  expectStatus(await api('GET','/api/admin/users',{token:bob}),200);
  expectStatus(await api('PATCH',`/api/admin/users/${rootId}`,{token:bob,body:{full_name:'Owned'}}),403);
  expectStatus(await api('POST',`/api/admin/users/${rootId}/reset-password`,{token:bob,body:{}}),403);
  expectStatus(await api('DELETE',`/api/admin/users/${rootId}`,{token:bob}),403);
  expectStatus(await api('PATCH',`/api/admin/users/${rootId}`,{token:bob,body:{active:false}}),403);
  expectStatus(await api('POST','/api/admin/users',{token:bob,body:{username:'evil',full_name:'Evil',role:'superadmin'}}),403);
  expectStatus(await api('PATCH',`/api/admin/users/${aliceId}`,{token:bob,body:{role:'superadmin'}}),403);
  const cc=await api('POST','/api/admin/users',{token:bob,body:{username:'carol',full_name:'Carol Clerk',role:'accounts'}});expectStatus(cc,201);carolId=cc.json.user.id;carolTemp=cc.json.temporaryPassword;tempPasswords.push(carolTemp);
  expectStatus(await api('PATCH',`/api/admin/users/${carolId}`,{token:bob,body:{department:'Finance'}}),200);
  const root2=await admin.query('SELECT full_name,active FROM app.users WHERE id=$1',[rootId]);assert.deepEqual(root2.rows[0],{full_name:'Root Admin',active:true});
 });
 await step('nobody may deactivate, delete or demote their own account',async()=>{
  const d=await api('POST','/api/admin/users',{token:root,body:{username:'dave',full_name:'Dave Super',role:'superadmin'}});expectStatus(d,201);daveId=d.json.user.id;tempPasswords.push(d.json.temporaryPassword);
  expectStatus(await api('PATCH',`/api/admin/users/${rootId}`,{token:root,body:{active:false}}),400);
  expectStatus(await api('DELETE',`/api/admin/users/${rootId}`,{token:root}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${rootId}`,{token:root,body:{role:'admin'}}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${bobId}`,{token:bob,body:{active:false}}),400);
  expectStatus(await api('DELETE',`/api/admin/users/${bobId}`,{token:bob}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${bobId}`,{token:bob,body:{role:'operator'}}),400);
  expectStatus(await api('PATCH',`/api/admin/users/${rootId}`,{token:root,body:{full_name:'Root Administrator'}}),200,'self profile edit allowed');
  // With two superadmins one may demote the other.
  expectStatus(await api('PATCH',`/api/admin/users/${daveId}`,{token:root,body:{role:'admin'}}),200);
  expectStatus(await api('PATCH',`/api/admin/users/${daveId}`,{token:root,body:{active:false}}),200);
 });

 // ---------- soft delete ----------
 await step('soft delete frees username, hides from list, include_deleted shows it',async()=>{
  const carol=(await login('carol',carolTemp)).token;
  const r=await api('DELETE',`/api/admin/users/${carolId}`,{token:bob});expectStatus(r,200);assert.deepEqual(r.json,{ok:true});
  expectStatus(await api('GET','/auth/me',{token:carol}),401,'deleted user session revoked');
  expectStatus(await api('POST','/auth/login',{body:{username:'carol',password:carolTemp}}),401);
  const list=await api('GET','/api/admin/users',{token:root});assert.ok(!list.json.users.some(u=>String(u.id)===String(carolId)));
  const all=await api('GET','/api/admin/users?include_deleted=1',{token:root});const del=all.json.users.find(u=>String(u.id)===String(carolId));
  assert.ok(del);assert.equal(del.username,`carol.deleted.${carolId}`);assert.ok(del.deleted_at);assert.equal(del.active,false);
  expectStatus(await api('PATCH',`/api/admin/users/${carolId}`,{token:root,body:{active:true}}),404);
  expectStatus(await api('DELETE',`/api/admin/users/${carolId}`,{token:root}),404);
  const again=await api('POST','/api/admin/users',{token:root,body:{username:'carol',full_name:'Carol Two',role:'accounts'}});expectStatus(again,201,'username reusable');tempPasswords.push(again.json.temporaryPassword);
 });

 // ---------- training ----------
 const rec=(token,body)=>api('POST','/api/training/records',{token,body});
 await step('training record upsert and completed_at semantics',async()=>{
  let r=await rec(erin,{kind:'lesson',item_id:'ops/lr-basics',status:'started'});expectStatus(r,200);
  const started=r.json.record.started_at;assert.equal(r.json.record.completed_at,null);
  r=await rec(erin,{kind:'lesson',item_id:'ops/lr-basics',status:'completed',score:88.5,detail:{steps:3}});expectStatus(r,200);
  const done=r.json.record.completed_at;assert.ok(done);assert.equal(r.json.record.score,88.5);assert.equal(r.json.record.started_at,started,'started_at kept');
  r=await rec(erin,{kind:'lesson',item_id:'ops/lr-basics',status:'started'});
  assert.equal(r.json.record.status,'started');assert.equal(r.json.record.completed_at,done,'completed_at kept on restart');assert.equal(r.json.record.score,88.5,'score kept when omitted');assert.deepEqual(r.json.record.detail,{steps:3});
  r=await rec(erin,{kind:'exercise',item_id:'ex:lr.create',status:'failed',score:40});assert.equal(r.json.record.completed_at,null);
  r=await rec(erin,{kind:'exercise',item_id:'ex:lr.create',status:'passed',score:90});assert.ok(r.json.record.completed_at);
  for(const s of ['understood','heard','dismissed','skipped']){r=await rec(erin,{kind:'hint',item_id:'hint-'+s,status:s});assert.ok(r.json.record.completed_at,s);}
  r=await rec(erin,{kind:'tour',item_id:'tour.dashboard',status:'completed'});expectStatus(r,200);
  r=await rec(erin,{kind:'lesson',item_id:'ops/billing',status:'completed'});expectStatus(r,200);
 });
 await step('training record validation (400) and body cap (413)',async()=>{
  const bad=[{kind:'video',item_id:'a',status:'started'},{kind:'lesson',item_id:'Upper',status:'started'},{kind:'lesson',item_id:'-x',status:'started'},{kind:'lesson',item_id:'a'.repeat(121),status:'started'},{kind:'lesson',item_id:'a b',status:'started'},{kind:'lesson',item_id:'ok',status:'done'},{kind:'lesson',item_id:'ok',status:'started',score:101},{kind:'lesson',item_id:'ok',status:'started',score:'50'},{kind:'lesson',item_id:'ok',status:'started',detail:[1]},{kind:'lesson',item_id:'ok',status:'started',detail:{x:'y'.repeat(3001)}}];
  for(const b of bad)expectStatus(await rec(erin,b),400,JSON.stringify(b).slice(0,80));
  expectStatus(await rec(erin,{kind:'lesson',item_id:'ok',status:'started',detail:{x:'y'.repeat(2992)}}),400,'detail > 3000 bytes as jsonb text');
  expectStatus(await api('POST','/api/training/records',{token:erin,raw:JSON.stringify({kind:'lesson',item_id:'ok',status:'started',pad:'z'.repeat(5000)})}),413);
  const n=await admin.query("SELECT count(*)::int n FROM app.training_records WHERE item_id='ok'");assert.equal(n.rows[0].n,0);
 });
 await step('training records persist across a new login session',async()=>{
  expectStatus(await api('POST','/auth/logout',{token:erin}),200);
  erin=(await login('erin',erinPass)).token;
  const r=await api('GET','/api/training/me',{token:erin});expectStatus(r,200);
  assert.equal(String(r.json.user_id),String(erinId));
  const l=r.json.records.find(x=>x.kind==='lesson'&&x.item_id==='ops/lr-basics');assert.ok(l);assert.equal(l.status,'started');assert.ok(l.completed_at);
  for(const k of ['kind','item_id','status','score','detail','started_at','completed_at','updated_at'])assert.ok(k in l,k);
  assert.deepEqual(r.json.settings.readiness.weights,{lessons:25,tours:10,practice:30,quiz:25,workflow:10});
  const other=await api('GET','/api/training/me',{token:alice});assert.equal(other.json.records.length,0,'records are per-user');
 });
 await step('training reset deletes only the caller\'s records of that kind',async()=>{
  await rec(alice,{kind:'tour',item_id:'tour.dashboard',status:'completed'});
  await rec(erin,{kind:'tour',item_id:'tour.fleet',status:'dismissed'});
  const r=await api('POST','/api/training/reset',{token:erin,body:{kind:'tour'}});expectStatus(r,200);assert.deepEqual(r.json,{deleted:2});
  const me=await api('GET','/api/training/me',{token:erin});assert.ok(!me.json.records.some(x=>x.kind==='tour'));assert.ok(me.json.records.some(x=>x.kind==='lesson'));
  const a=await api('GET','/api/training/me',{token:alice});assert.equal(a.json.records.filter(x=>x.kind==='tour').length,1);
  expectStatus(await api('POST','/api/training/reset',{token:erin,body:{kind:'lesson'}}),400);
  const h=await api('POST','/api/training/reset',{token:erin,body:{kind:'hint'}});assert.equal(h.json.deleted,4);
  const o=await api('POST','/api/training/reset',{token:erin,body:{kind:'onboarding'}});assert.equal(o.json.deleted,0);
 });
 await step('quiz attempts: summary best/last/passed/wrong',async()=>{
  const post=b=>api('POST','/api/training/quiz-attempts',{token:erin,body:{quiz_id:'quiz.lr-basics',...b}});
  let r=await post({score:50,correct:5,total:10,passed:false,wrong:['q1','q2','q3','q4','q5'],duration_seconds:120});expectStatus(r,201);
  assert.equal(r.json.attempt.score,50);assert.deepEqual(r.json.summary,{quiz_id:'quiz.lr-basics',attempts:1,best:50,last:50,passed:false,last_at:r.json.attempt.created_at,wrong:['q1','q2','q3','q4','q5']});
  r=await post({score:90,correct:9,total:10,passed:true,wrong:['q3']});expectStatus(r,201);
  r=await post({score:66.67,correct:2,total:3,passed:false,wrong:['q1']});expectStatus(r,201);
  const s=r.json.summary;assert.equal(s.attempts,3);assert.equal(s.best,90);assert.equal(s.last,66.67);assert.equal(s.passed,true,'any attempt passed');assert.deepEqual(s.wrong,['q1']);
  const me=await api('GET','/api/training/me',{token:erin});const q=me.json.quizzes.find(x=>x.quiz_id==='quiz.lr-basics');
  assert.deepEqual({attempts:q.attempts,best:q.best,last:q.last,passed:q.passed,wrong:q.wrong},{attempts:3,best:90,last:66.67,passed:true,wrong:['q1']});
 });
 await step('quiz attempt validation rejects inconsistent input',async()=>{
  const ok={quiz_id:'quiz.x',score:50,correct:5,total:10,passed:false,wrong:[]};
  const bad=[{score:80},{score:51.5},{correct:11},{correct:-1},{total:0},{total:201,correct:0,score:0},{score:-1,correct:0},{score:101},{passed:'yes'},{quiz_id:'Bad Id'},{wrong:Array.from({length:11},(_,i)=>'w'+i)},{wrong:['BAD']},{wrong:'q1'},{duration_seconds:-5},{duration_seconds:1.5},{correct:2.5,score:25}];
  for(const b of bad)expectStatus(await api('POST','/api/training/quiz-attempts',{token:erin,body:{...ok,...b}}),400,JSON.stringify(b));
  expectStatus(await api('POST','/api/training/quiz-attempts',{token:erin,body:{...ok,score:50.9}}),201,'within ±1 accepted');
  const n=await admin.query("SELECT count(*)::int n FROM app.training_quiz_attempts WHERE quiz_id='quiz.x'");assert.equal(n.rows[0].n,1);
 });
 await step('team view restricted to admin/superadmin/manager/hr',async()=>{
  expectStatus(await api('GET','/api/training/team',{token:erin}),403);
  const h=await api('POST','/api/admin/users',{token:root,body:{username:'hank',full_name:'Hank HR',role:'hr'}});expectStatus(h,201);tempPasswords.push(h.json.temporaryPassword);
  const hank=(await login('hank',h.json.temporaryPassword)).token;
  for(const t of [root,bob,alice,hank]){
   const r=await api('GET','/api/training/team',{token:t});expectStatus(r,200);
   const e=r.json.users.find(u=>String(u.id)===String(erinId));assert.ok(e);
   assert.ok(e.records.some(x=>x.kind==='lesson'&&x.item_id==='ops/lr-basics'&&x.status==='started'));
   assert.deepEqual(e.quizzes.find(q=>q.quiz_id==='quiz.lr-basics'),{quiz_id:'quiz.lr-basics',attempts:3,best:90,last:66.67,passed:true});
   assert.ok(e.last_activity_at);
   assert.ok(!r.json.users.some(u=>String(u.id)===String(carolId)),'deleted users excluded');
   for(const k of ['id','username','full_name','role','branch_code','department','designation','active','last_login_at','last_activity_at','records','quizzes'])assert.ok(k in e,k);
  }
 });
 await step('per-user training view restricted and returns history',async()=>{
  expectStatus(await api('GET',`/api/training/users/${aliceId}`,{token:erin}),403);
  const r=await api('GET',`/api/training/users/${erinId}`,{token:alice});expectStatus(r,200);
  assert.equal(r.json.user.username,'erin');assert.ok(r.json.records.length>=3);assert.equal(r.json.attempts.length,4);
  assert.equal(r.json.attempts[0].quiz_id,'quiz.x','newest first');assert.ok(!('password_hash' in r.json.user));
  expectStatus(await api('GET','/api/training/users/999999',{token:alice}),404);
  expectStatus(await api('GET','/api/training/users/abc',{token:alice}),404);
 });
 await step('admin user list includes training aggregates',async()=>{
  const r=await api('GET','/api/admin/users',{token:root});const e=r.json.users.find(u=>u.username==='erin');
  assert.equal(e.training.lessons_completed,2);assert.equal(e.training.quizzes_passed,1);assert.equal(e.training.best_quiz_avg,70.45);assert.ok(e.training.records>=3);assert.ok(e.training.last_activity_at);
 });
 await step('training settings: validation, role restriction, update and audit',async()=>{
  const g=await api('GET','/api/training/settings',{token:erin});expectStatus(g,200);assert.equal(g.json.readiness.passPct,70);
  const good={weights:{lessons:20,tours:10,practice:30,quiz:30,workflow:10},thresholds:{learning:5,practising:30,assessment:65,ready:90},passPct:75,minPracticePct:50};
  expectStatus(await api('PUT','/api/training/settings',{token:erin,body:{readiness:good}}),403);
  expectStatus(await api('PUT','/api/training/settings',{token:alice,body:{readiness:good}}),403,'manager cannot change settings');
  const bad=[{weights:{...good.weights,lessons:21}},{weights:{...good.weights,lessons:20.5,tours:9.5}},{weights:{lessons:20,tours:10,practice:30,quiz:40}},{thresholds:{...good.thresholds,assessment:30}},{thresholds:{...good.thresholds,ready:101}},{passPct:39},{passPct:101},{minPracticePct:-1},{extra:1}];
  for(const b of bad)expectStatus(await api('PUT','/api/training/settings',{token:root,body:{readiness:{...good,...b}}}),400,JSON.stringify(b));
  const u=await api('PUT','/api/training/settings',{token:bob,body:{readiness:good}});expectStatus(u,200);assert.deepEqual(u.json.readiness,good);
  const g2=await api('GET','/api/training/settings',{token:erin});assert.deepEqual(g2.json.readiness,good);
  const me=await api('GET','/api/training/me',{token:erin});assert.deepEqual(me.json.settings.readiness,good);
  const a=await admin.query("SELECT actor_id,after_state FROM app.audit_events WHERE entity_type='training_settings' ORDER BY id DESC LIMIT 1");assert.equal(String(a.rows[0].actor_id),String(bobId));assert.deepEqual(a.rows[0].after_state,good);
  expectStatus(await api('DELETE','/api/training/settings',{token:root}),405);
 });
 await step('legacy training endpoints still work',async()=>{
  const r=await api('GET','/api/training',{token:erin});expectStatus(r,200);assert.ok(Array.isArray(r.json.courses));
  expectStatus(await api('POST','/api/training/courses',{token:erin,body:{title:'X'}}),403);
  const c=await api('POST','/api/training/courses',{token:root,body:{title:'Induction'}});expectStatus(c,201);
  const l=await api('POST','/api/training/lessons',{token:root,body:{course_id:Number(c.json.id),title:'Welcome'}});expectStatus(l,201);
  expectStatus(await api('POST','/api/training/progress',{token:erin,body:{lesson_id:Number(l.json.id),completed:true}}),200);
 });

 // ---------- feedback ----------
 await step('feedback capture ownership and admin review',async()=>{
  const created=await api('POST','/api/feedback',{token:erin,body:{feedback_type:'Improvement',impact:'High',description:'Make this clearer',points:['First point'],module:'Operations',screen_id:'ops/lr',route:'ops/lr',mode:'Practice',route_params:{lrNo:'LR-1'},client_context:{viewport:[390,844]}}});expectStatus(created,201);
  const fid=created.json.item.id;
  const mine=await api('GET','/api/feedback',{token:erin});expectStatus(mine,200);assert.equal(mine.json.admin,false);assert.ok(mine.json.items.some(x=>String(x.id)===String(fid)));
  const adminList=await api('GET','/api/feedback',{token:alice});expectStatus(adminList,200);assert.equal(adminList.json.admin,true);assert.ok(adminList.json.items.some(x=>String(x.id)===String(fid)));
  expectStatus(await api('PATCH',`/api/feedback/${fid}`,{token:erin,body:{status:'Reviewing'}}),403);
  const upd=await api('PATCH',`/api/feedback/${fid}`,{token:alice,body:{status:'Reviewing'}});expectStatus(upd,200);assert.equal(upd.json.item.status,'Reviewing');
 });
 await step('feedback attachment upload is protected and retrievable',async()=>{
  const c=await api('POST','/api/feedback',{token:erin,body:{feedback_type:'Bug',impact:'Medium',description:'See attachment',screen_id:'dashboard',route:'dashboard',mode:'Company'}});const fid=c.json.item.id;
  const up=await api('POST',`/api/feedback/${fid}/attachments`,{token:erin,body:{name:'note.txt',mime_type:'text/plain',data:Buffer.from('feedback evidence').toString('base64')}});expectStatus(up,201);
  const aid=up.json.attachment.id;const got=await api('GET',`/api/feedback/attachments/${aid}`,{token:erin});expectStatus(got,200);assert.equal(Buffer.from(got.json.data,'base64').toString(),'feedback evidence');
  const other=await api('POST','/api/admin/users',{token:root,body:{username:'viewer',full_name:'Viewer',role:'operator'}});tempPasswords.push(other.json.temporaryPassword);const viewer=(await login('viewer',other.json.temporaryPassword)).token;
  expectStatus(await api('GET',`/api/feedback/attachments/${aid}`,{token:viewer}),404);
  expectStatus(await api('GET',`/api/feedback/attachments/${aid}`,{token:alice}),200);
  expectStatus(await api('POST',`/api/feedback/${fid}/attachments`,{token:erin,body:{name:'bad.exe',mime_type:'application/x-msdownload',data:'YQ=='}}),400);
 });

 await step('feedback discussion separates internal admin notes',async()=>{
  const c=await api('POST','/api/feedback',{token:erin,body:{feedback_type:'Confusing',impact:'Low',description:'Discussion test',screen_id:'dashboard',route:'dashboard',mode:'Company'}});const fid=c.json.item.id;
  expectStatus(await api('POST',`/api/feedback/${fid}/comments`,{token:erin,body:{body:'User clarification',internal:true}}),201);
  expectStatus(await api('POST',`/api/feedback/${fid}/comments`,{token:alice,body:{body:'Private triage note',internal:true}}),201);
  const own=await api('GET',`/api/feedback/${fid}`,{token:erin});expectStatus(own,200);assert.equal(own.json.item.comments.length,1);assert.equal(own.json.item.comments[0].body,'User clarification');assert.equal(own.json.item.comments[0].internal,false);
  const adm=await api('GET',`/api/feedback/${fid}`,{token:alice});expectStatus(adm,200);assert.equal(adm.json.item.comments.length,2);assert.ok(adm.json.item.comments.some(x=>x.internal&&x.body==='Private triage note'));
 });
 await step('feedback duplicate requires original reference',async()=>{
  const a=await api('POST','/api/feedback',{token:erin,body:{feedback_type:'Bug',impact:'Medium',description:'Original',screen_id:'dashboard',route:'dashboard',mode:'Company'}});
  const b=await api('POST','/api/feedback',{token:erin,body:{feedback_type:'Bug',impact:'Medium',description:'Duplicate',screen_id:'dashboard',route:'dashboard',mode:'Company'}});
  expectStatus(await api('PATCH',`/api/feedback/${b.json.item.id}`,{token:alice,body:{status:'Duplicate'}}),400);
  const ok=await api('PATCH',`/api/feedback/${b.json.item.id}`,{token:alice,body:{status:'Duplicate',duplicate_of:a.json.item.id}});expectStatus(ok,200);assert.equal(String(ok.json.item.duplicate_of),String(a.json.item.id));
 });

 // ---------- audit ----------
 await step('audit events are written for user changes without password data',async()=>{
  const r=await admin.query("SELECT action,before_state::text b,after_state::text a FROM app.audit_events WHERE entity_type='auth_user' ORDER BY id");
  const actions=new Set(r.rows.map(x=>x.action));
  for(const a of ['account_create','account_update','account_delete','password_reset','password_changed'])assert.ok(actions.has(a),a);
  const blob=r.rows.map(x=>(x.b||'')+(x.a||'')).join('\n');
  assert.ok(!/password_hash/.test(blob),'no password_hash');assert.ok(!/[a-f0-9]{32}:[a-f0-9]{128}/.test(blob),'no scrypt hash');
  for(const p of [...tempPasswords,ROOT_PASS,erinPass,'Alice-New-Passw0rd'])assert.ok(!blob.includes(p),'no plaintext password');
  const del=r.rows.find(x=>x.action==='account_delete');assert.match(del.a,/carol\.deleted\./);
 });
}

try{await run();}
catch(e){failures++;console.log('FAIL setup\n  ',e?.stack||e);}
finally{
 if(failures&&apiLog)console.log('--- API log ---\n'+apiLog.slice(-4000));
 try{await admin?.end();}catch{}
 teardown();
}
console.log(`\n${passes} passed, ${failures} failed`);
process.exitCode=failures?1:0;
