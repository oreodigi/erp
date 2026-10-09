import http from 'node:http';
import crypto from 'node:crypto';
import {Pool} from 'pg';
import {verifyPassword,hashPassword,createSession,readSession,revokeSession} from './auth.mjs';
import {handleAdminUsers,loadProfile,accountPassword,PROFILE_COLUMNS} from './users.mjs';
import {handleWorkItems} from './work-items.mjs';
import {handleTraining} from './training.mjs';
import {handleCommunication} from './communication.mjs';
const env=process.env;
const poolConfig={host:env.SK_DB_HOST||'127.0.0.1',port:Number(env.SK_DB_PORT||5432),database:env.SK_DB_NAME||'sk_translines',max:3,connectionTimeoutMillis:3000,idleTimeoutMillis:15000};
const pool=new Pool({...poolConfig,user:process.env.SK_DB_USER,password:process.env.SK_DB_PASSWORD});
const writePool=process.env.SK_DB_WRITE_USER?new Pool({...poolConfig,user:process.env.SK_DB_WRITE_USER,password:process.env.SK_DB_WRITE_PASSWORD,max:2}):null;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});res.end(JSON.stringify(data));return true;};
const queries={
 counts:'SELECT (SELECT count(*) FROM legacy.lr_detail) AS lrs,(SELECT count(*) FROM legacy.customer) AS customers,(SELECT count(*) FROM legacy.branch) AS branches,(SELECT count(*) FROM legacy.bill_detail) AS bills,(SELECT count(*) FROM legacy.account_ledger) AS ledger_entries',
 lrs:'SELECT lr_detail_id,lr_number,created_date,branch_id,total_weight,total_freight FROM legacy.lr_detail ORDER BY lr_detail_id DESC LIMIT 12',
 bills:'SELECT bill_id,bill_number,bill_date,net_amt,pending_amt FROM legacy.bill_detail ORDER BY bill_id DESC LIMIT 12'
};
const attempts=new Map();
const httpError=(status,message)=>Object.assign(new Error(message),{status});
async function body(req,max=4096){const parts=[];let n=0;for await(const part of req){n+=part.length;if(n>max)throw httpError(413,'Request too large');parts.push(part);}const s=Buffer.concat(parts).toString('utf8');if(!s.trim())return {};try{return JSON.parse(s);}catch{throw httpError(400,'Invalid JSON');}}
const tokenFrom=req=>{const h=req.headers.authorization||'';return h.startsWith('Bearer ')?h.slice(7):null;};
const stateWriteRoles=new Set(['admin','superadmin','manager','operator']);
const layoutIds=new Set(['today','pipeline','operations','management','trend','cleanup']);
async function dashboardLayout(req,res,user){
 try{
  if(req.method==='GET'){
   const r=await pool.query('SELECT layout,updated_at FROM app.dashboard_layouts WHERE user_id=$1',[user.id]);
   return json(res,200,{layout:r.rowCount?r.rows[0].layout:null,updated_at:r.rowCount?r.rows[0].updated_at:null});
  }
  if(req.method!=='PUT')return json(res,405,{error:'Method not allowed'});
  const input=await body(req),layout=input?.layout;
  if(!Array.isArray(layout)||layout.length!==layoutIds.size||layout.some(x=>!x||typeof x.id!=='string'||!layoutIds.has(x.id)||!Number.isInteger(x.span)||x.span<1||x.span>4)||new Set(layout.map(x=>x.id)).size!==layoutIds.size)return json(res,400,{error:'Invalid dashboard layout'});
  const r=await writePool.query('INSERT INTO app.dashboard_layouts(user_id,layout,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET layout=EXCLUDED.layout,updated_at=now() RETURNING layout,updated_at',[user.id,JSON.stringify(layout)]);
  await writePool.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'dashboard_layout',String(user.id),'update',{layout}]);
  return json(res,200,r.rows[0]);
 }catch(e){console.error('Dashboard layout request failed',e.code||e.message);return json(res,503,{error:'Dashboard layout unavailable'});}
}
async function erpState(req,res,user){
 try{
  if(req.method==='GET'){
   const r=await pool.query('SELECT data,version,updated_at FROM app.erp_state WHERE id=1');
   return json(res,r.rowCount?200:503,r.rowCount?{...r.rows[0],source:'postgresql'}:{error:'ERP state is not initialized'});
  }
  if(req.method!=='PUT')return json(res,405,{error:'Method not allowed'});
  if(!stateWriteRoles.has(String(user.role).toLowerCase()))return json(res,403,{error:'Insufficient permissions'});
  // The shared legacy dataset is intentionally retained in PostgreSQL and is
  // ~36 MB as JSON. Keep a bounded parser limit above that real payload so
  // legitimate concurrent ERP saves are not truncated at 12 MB.
  const input=await body(req,50000000),version=input?.version,data=input?.data;
  if(!Number.isSafeInteger(version)||version<1||!data||typeof data!=='object'||Array.isArray(data))return json(res,400,{error:'Invalid ERP state'});
  const c=await writePool.connect();
  try{
   await c.query('BEGIN');
   const r=await c.query('UPDATE app.erp_state SET data=$1,version=version+1,updated_by=$2,updated_at=now() WHERE id=1 AND version=$3 RETURNING data,version,updated_at',[data,user.id,version]);
   if(!r.rowCount){await c.query('ROLLBACK');const current=await pool.query('SELECT data,version,updated_at FROM app.erp_state WHERE id=1');return json(res,409,{error:'ERP state changed by another user',current:current.rows[0]||null});}
   await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'erp_state','1','update',{version:r.rows[0].version}]);
   await c.query('COMMIT');return json(res,200,{...r.rows[0],source:'postgresql'});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }catch(e){console.error('ERP state request failed',e.code||e.message);return json(res,e.status||503,{error:e.status?e.message:'ERP state unavailable'});}
}
async function dashboard(res){try{const [counts,lrs,bills]=await Promise.all([pool.query(queries.counts),pool.query(queries.lrs),pool.query(queries.bills)]);return json(res,200,{source:'postgresql',historicalAsOf:'2025-06-08',counts:counts.rows[0],recentLrs:lrs.rows,recentBills:bills.rows});}catch(e){console.error('Dashboard database error',e.code||e.message);return json(res,503,{error:'Database unavailable'});}}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const path=url.pathname;
 if(path==='/health'&&req.method==='GET')return json(res,200,{ok:true,service:'sk-erp-api'});
 if(path==='/auth/login'&&req.method==='POST'){
  try{
   const input=await body(req);
   if(typeof input.username!=='string'||typeof input.password!=='string'||input.username.length>100||input.password.length>256)return json(res,400,{error:'Invalid request'});
   const key=String(input.username).trim().toLowerCase();
   const current=attempts.get(key)||{count:0,until:0};
   if(current.until>Date.now())return json(res,429,{error:'Try again later'});
   const found=await pool.query(`SELECT ${PROFILE_COLUMNS},password_hash FROM app.users WHERE username=$1 AND active=true AND deleted_at IS NULL LIMIT 1`,[input.username]);
   const user=found.rows[0];
   if(!user||!verifyPassword(input.password,user.password_hash)){
    const count=current.count+1;attempts.set(key,{count,until:count>=5?Date.now()+15*60000:0});
    return json(res,401,{error:'Invalid credentials'});
   }
   attempts.delete(key);
   if(writePool)await writePool.query('UPDATE app.users SET last_login_at=now() WHERE id=$1',[user.id]).catch(e=>console.error('Last login update failed',e.code||e.message));
   const token=createSession({id:user.id,username:user.username,role:user.role});
   const {password_hash:_hash,...profile}=user;
   return json(res,200,{token,user:profile});
  }catch(e){console.error('Login error',e.code||e.message);return json(res,e.status===413?413:400,{error:e.status===413?e.message:'Login unavailable'});}
 }
 if(path==='/internal/dashboard'&&req.method==='GET'){
  const supplied=req.headers['x-internal-token'];
  const expected=process.env.SK_INTERNAL_TOKEN;
  if(typeof supplied!=='string'||!expected||supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return json(res,401,{error:'Unauthorized'});
  return dashboard(res);
 }
 const token=tokenFrom(req),user=readSession(token);
 if(!user)return json(res,401,{error:'Unauthorized'});
 if(path==='/auth/me'&&req.method==='GET'){
  try{
   const profile=await loadProfile(pool,user.id);
   if(!profile){revokeSession(token);return json(res,401,{error:'Unauthorized'});}
   return json(res,200,{user:profile});
  }catch(e){console.error('Profile lookup failed',e.code||e.message);return json(res,503,{error:'Profile unavailable'});}
 }
 if(path==='/auth/logout'&&req.method==='POST'){revokeSession(token);return json(res,200,{ok:true});}
 if(path==='/auth/change-password'&&req.method==='POST'){
  try{
   if(!writePool)return json(res,503,{error:'Password changes unavailable'});
   const input=await body(req,4096),current=String(input?.current_password||''),next=String(input?.new_password||'');
   if(!current||!accountPassword(next))return json(res,400,{error:'New password must be 12-256 characters and include letters and numbers'});
   const found=await pool.query('SELECT password_hash FROM app.users WHERE id=$1 AND active=true AND deleted_at IS NULL',[user.id]);
   if(!found.rowCount||!verifyPassword(current,found.rows[0].password_hash))return json(res,401,{error:'Current password is incorrect'});
   await writePool.query('UPDATE app.users SET password_hash=$1,password_changed_at=now(),must_change_password=false,updated_at=now() WHERE id=$2 AND active=true AND deleted_at IS NULL',[hashPassword(next),user.id]);
   await writePool.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'auth_user',user.id,'password_changed',{username:user.username}]);
   return json(res,200,{ok:true});
  }catch(e){console.error('Password change failed',e.code||e.message);return json(res,e.status||503,{error:e.status?e.message:'Password change unavailable'});}
 }
 if(path==='/api/dashboard'&&req.method==='GET')return dashboard(res);
 if(path==='/api/analytics'&&req.method==='GET'){
  try{
   const [monthly,branches,ageing]=await Promise.all([
    pool.query("SELECT to_char(date_trunc('month',lr_date),'YYYY-MM') AS month,count(*)::int AS lrs,coalesce(sum(total_freight),0)::float8 AS freight FROM legacy.lr_detail WHERE lr_date IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12"),
    pool.query('SELECT branch_id,count(*)::int AS lrs,coalesce(sum(total_freight),0)::float8 AS freight FROM legacy.lr_detail GROUP BY branch_id ORDER BY lrs DESC LIMIT 8'),
    pool.query("SELECT CASE WHEN bill_date >= DATE '2025-06-08' - INTERVAL '30 days' THEN '0-30' WHEN bill_date >= DATE '2025-06-08' - INTERVAL '60 days' THEN '31-60' WHEN bill_date >= DATE '2025-06-08' - INTERVAL '90 days' THEN '61-90' ELSE '90+' END AS bucket,coalesce(sum(pending_amt),0)::float8 AS outstanding FROM legacy.bill_detail WHERE pending_amt > 0 AND bill_date IS NOT NULL GROUP BY 1")
   ]);
   return json(res,200,{monthly:monthly.rows.reverse(),branches:branches.rows,ageing:ageing.rows,historicalAsOf:'2025-06-08'});
 }catch(e){console.error('Analytics query failed',e.code||e.message);return json(res,503,{error:'Analytics unavailable'});}
 }
 if(path==='/api/erp/state')return erpState(req,res,user);
 if(path==='/api/dashboard-layout')return dashboardLayout(req,res,user);
 if(await handleAdminUsers({req,res,path,method:req.method,url,user,readBody:()=>body(req),pool,writePool,json}))return;
 if(await handleWorkItems({path,method:req.method,url,user,readBody:()=>body(req),pool,writePool,json,res}))return;
 if(await handleTraining({path,method:req.method,user,readBody:()=>body(req),pool,writePool,json,res}))return;
 if(await handleCommunication({path,method:req.method,url,user,readBody:()=>body(req,20000),pool,writePool,json,res}))return;
 return json(res,404,{error:'Not found'});
});
const apiPort=Number(env.SK_API_PORT||3107),apiHost=env.SK_API_HOST||'127.0.0.1';
server.listen(apiPort,apiHost,()=>console.log(`SK ERP API listening on ${apiHost}:${apiPort}`));
