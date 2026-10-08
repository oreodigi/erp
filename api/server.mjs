import http from 'node:http';
import crypto from 'node:crypto';
import {Pool} from 'pg';
import {verifyPassword,hashPassword,createSession,readSession,revokeSession} from './auth.mjs';
import {handleWorkItems} from './work-items.mjs';
import {handleTraining} from './training.mjs';
import {handleCommunication} from './communication.mjs';
const poolConfig={host:'127.0.0.1',port:5432,database:'sk_translines',max:3,connectionTimeoutMillis:3000,idleTimeoutMillis:15000};
const pool=new Pool({...poolConfig,user:process.env.SK_DB_USER,password:process.env.SK_DB_PASSWORD});
const writePool=process.env.SK_DB_WRITE_USER?new Pool({...poolConfig,user:process.env.SK_DB_WRITE_USER,password:process.env.SK_DB_WRITE_PASSWORD,max:2}):null;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});res.end(JSON.stringify(data));return true;};
const queries={
 counts:'SELECT (SELECT count(*) FROM legacy.lr_detail) AS lrs,(SELECT count(*) FROM legacy.customer) AS customers,(SELECT count(*) FROM legacy.branch) AS branches,(SELECT count(*) FROM legacy.bill_detail) AS bills,(SELECT count(*) FROM legacy.account_ledger) AS ledger_entries',
 lrs:'SELECT lr_detail_id,lr_number,created_date,branch_id,total_weight,total_freight FROM legacy.lr_detail ORDER BY lr_detail_id DESC LIMIT 12',
 bills:'SELECT bill_id,bill_number,bill_date,net_amt,pending_amt FROM legacy.bill_detail ORDER BY bill_id DESC LIMIT 12'
};
const attempts=new Map();
async function body(req,max=4096){let s='';for await(const part of req){s+=part;if(s.length>max)throw Error('Too large');}return JSON.parse(s);}
const tokenFrom=req=>{const h=req.headers.authorization||'';return h.startsWith('Bearer ')?h.slice(7):null;};
const stateWriteRoles=new Set(['admin','superadmin','manager','operator']);
const superAdminRoles=new Set(['superadmin']);
const accountRoles=new Set(['superadmin','admin','manager','operator','operations','dispatcher','accounts','accountant','finance_approver','customer_care','customerrelations','branch_admin','branch_user','container','hr','onboarding','storeincharge','storedirector','fleetmanager','warehousemanager','workshopmanager']);
const accountId=s=>/^[1-9]\d{0,15}$/.test(String(s))?String(s):null;
const accountPassword=s=>typeof s==='string'&&s.length>=12&&s.length<=256&&/[A-Za-z]/.test(s)&&/[0-9]/.test(s);
const generatedPassword=()=>crypto.randomBytes(18).toString('base64url');
const layoutIds=new Set(['today','pipeline','operations','management','trend','cleanup']);
function requireSuperAdmin(user,res){if(!superAdminRoles.has(String(user.role).toLowerCase())){json(res,403,{error:'Super Admin permission required'});return false;}return true;}
async function adminUsers(req,res,user,path){
 if(!path.startsWith('/api/admin/users'))return false;
 if(!requireSuperAdmin(user,res))return true;
 try{
  if(path==='/api/admin/users'&&req.method==='GET'){
   const r=await pool.query('SELECT id,username,role,active,created_at FROM app.users ORDER BY username');
   json(res,200,{users:r.rows});return true;
  }
  if(req.method==='POST'&&path.endsWith('/reset-password')){
   const target=accountId(path.slice('/api/admin/users/'.length,-'/reset-password'.length));
   if(!target){json(res,404,{error:'Not found'});return true;}
   const input=await body(req),password=input?.password||generatedPassword();
   if(!accountPassword(password))return json(res,400,{error:'Password must be 12-256 characters and include letters and numbers'});
   const r=await writePool.query('UPDATE app.users SET password_hash=$1 WHERE id=$2 AND active=true RETURNING id,username,role',[hashPassword(password),target]);
   if(!r.rowCount)return json(res,404,{error:'Active user not found'});
   await writePool.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'auth_user',target,'password_reset',{username:r.rows[0].username,role:r.rows[0].role}]);
   return json(res,200,{user:r.rows[0],temporaryPassword:password});
  }
  const id=accountId(path.slice('/api/admin/users/'.length));
  if(!id){json(res,404,{error:'Not found'});return true;}
  if(req.method==='PATCH'){
   const input=await body(req);
   if(input?.role!==undefined&&(!accountRoles.has(String(input.role))||typeof input.role!=='string'))return json(res,400,{error:'Invalid role'});
   if(input?.active===false&&String(id)===String(user.id))return json(res,400,{error:'You cannot deactivate your own account'});
   const fields=[],values=[];
   if(input?.role!==undefined){fields.push('role=$'+(values.length+1));values.push(input.role);}
   if(input?.active!==undefined){if(typeof input.active!=='boolean')return json(res,400,{error:'Invalid active flag'});fields.push('active=$'+(values.length+1));values.push(input.active);}
   if(!fields.length)return json(res,400,{error:'No changes supplied'});
   values.push(id);
   const r=await writePool.query('UPDATE app.users SET '+fields.join(',')+' WHERE id=$'+values.length+' RETURNING id,username,role,active,created_at',values);
   if(!r.rowCount)return json(res,404,{error:'User not found'});
   await writePool.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'auth_user',id,'account_update',r.rows[0]]);
   return json(res,200,{user:r.rows[0]});
  }
  return json(res,405,{error:'Method not allowed'});
 }catch(e){console.error('Admin users request failed',e.code||e.message);return json(res,503,{error:'User administration unavailable'});}
}
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
  const input=await body(req,12000000),version=input?.version,data=input?.data;
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
   const found=await pool.query('SELECT id,username,password_hash,role FROM app.users WHERE username=$1 AND active=true LIMIT 1',[input.username]);
   const user=found.rows[0];
   if(!user||!verifyPassword(input.password,user.password_hash)){
    const count=current.count+1;attempts.set(key,{count,until:count>=5?Date.now()+15*60000:0});
    return json(res,401,{error:'Invalid credentials'});
   }
   attempts.delete(key);
   const token=createSession({id:user.id,username:user.username,role:user.role});
   return json(res,200,{token,user:{id:user.id,username:user.username,role:user.role}});
  }catch(e){console.error('Login error',e.code||e.message);return json(res,400,{error:'Login unavailable'});}
 }
 if(path==='/internal/dashboard'&&req.method==='GET'){
  const supplied=req.headers['x-internal-token'];
  const expected=process.env.SK_INTERNAL_TOKEN;
  if(typeof supplied!=='string'||!expected||supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return json(res,401,{error:'Unauthorized'});
  return dashboard(res);
 }
 const token=tokenFrom(req),user=readSession(token);
 if(!user)return json(res,401,{error:'Unauthorized'});
 if(path==='/auth/me'&&req.method==='GET')return json(res,200,{user});
 if(path==='/auth/logout'&&req.method==='POST'){revokeSession(token);return json(res,200,{ok:true});}
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
 if(await adminUsers(req,res,user,path))return;
 if(await handleWorkItems({path,method:req.method,url,user,readBody:()=>body(req),pool,writePool,json,res}))return;
 if(await handleTraining({path,method:req.method,user,readBody:()=>body(req),pool,writePool,json,res}))return;
 if(await handleCommunication({path,method:req.method,url,user,readBody:()=>body(req,20000),pool,writePool,json,res}))return;
 return json(res,404,{error:'Not found'});
});
server.listen(3107,'127.0.0.1',()=>console.log('SK ERP API listening on localhost:3107'));
