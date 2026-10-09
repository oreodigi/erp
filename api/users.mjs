import crypto from 'node:crypto';
import {hashPassword,revokeUserSessions} from './auth.mjs';
export const accountRoles=new Set(['superadmin','admin','manager','operator','operations','dispatcher','accounts','accountant','finance_approver','customer_care','customerrelations','branch_admin','branch_user','container','hr','onboarding','storeincharge','storedirector','fleetmanager','warehousemanager','workshopmanager']);
export const userManagerRoles=new Set(['superadmin','admin']);
export const accountPassword=s=>typeof s==='string'&&s.length>=12&&s.length<=256&&/[A-Za-z]/.test(s)&&/[0-9]/.test(s);
export function generatedPassword(){for(;;){const p=crypto.randomBytes(18).toString('base64url');if(accountPassword(p))return p;}}
export const PROFILE_COLUMNS='id,username,role,full_name,branch_code,department,designation,extra_permissions,denied_permissions,must_change_password';
export const ADMIN_COLUMNS='id,username,role,active,created_at,full_name,email,phone,branch_code,department,designation,extra_permissions,denied_permissions,last_login_at,must_change_password,deleted_at,updated_at';
const accountId=s=>/^[1-9]\d{0,15}$/.test(String(s))?String(s):null;
const lower=v=>String(v??'').toLowerCase();
const fail=(status,message)=>Object.assign(new Error(message),{status});
const LOCK=7310421; // advisory lock serialising account mutations (last-superadmin checks)
const PERM=/^[a-z0-9][a-z0-9/_-]{0,79}$/;
const text=(v,max,re)=>typeof v==='string'&&v.trim().length<=max&&(!re||re.test(v.trim()));
const FIELDS={
 full_name:v=>typeof v==='string'&&v.trim().length>=1&&v.trim().length<=120,
 email:v=>typeof v==='string'&&(v.trim()===''||(v.trim().length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))),
 phone:v=>text(v,20,/^[0-9+ -]*$/),
 branch_code:v=>text(v,12,/^[A-Za-z0-9_-]{0,12}$/),
 department:v=>text(v,80),
 designation:v=>text(v,80),
 role:v=>typeof v==='string'&&accountRoles.has(v),
 active:v=>typeof v==='boolean',
 extra_permissions:v=>Array.isArray(v)&&v.length<=200&&v.every(x=>typeof x==='string'&&PERM.test(x))&&new Set(v).size===v.length,
 denied_permissions:v=>Array.isArray(v)&&v.length<=200&&v.every(x=>typeof x==='string'&&PERM.test(x))&&new Set(v).size===v.length
};
const MESSAGES={full_name:'Full name must be 1-120 characters',email:'Invalid email',phone:'Invalid phone',branch_code:'Invalid branch code',department:'Department must be at most 80 characters',designation:'Designation must be at most 80 characters',role:'Invalid role',active:'Invalid active flag',extra_permissions:'Invalid extra permissions',denied_permissions:'Invalid denied permissions'};
function clean(input,keys){
 const out={};
 for(const k of keys){if(input[k]===undefined)continue;if(!FIELDS[k](input[k]))throw fail(400,MESSAGES[k]);out[k]=typeof input[k]==='string'?input[k].trim():input[k];}
 return out;
}
const audit=(c,actor,id,action,before,after)=>c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)',[actor,'auth_user',String(id),action,before,after]);
const sameArr=(a,b)=>JSON.stringify([...(a||[])].sort())===JSON.stringify([...(b||[])].sort());
const LIST_SQL=`SELECT ${ADMIN_COLUMNS.split(',').map(c=>'u.'+c).join(',')},
 json_build_object('lessons_completed',COALESCE(r.lessons_completed,0),'records',COALESCE(r.records,0),'last_activity_at',GREATEST(r.last_record_at,q.last_attempt_at),'quizzes_passed',COALESCE(q.quizzes_passed,0),'best_quiz_avg',q.best_quiz_avg) training
 FROM app.users u
 LEFT JOIN (SELECT user_id,count(*) FILTER (WHERE kind='lesson' AND completed_at IS NOT NULL)::int lessons_completed,count(*)::int records,max(updated_at) last_record_at FROM app.training_records GROUP BY user_id) r ON r.user_id=u.id
 LEFT JOIN (SELECT user_id,count(*) FILTER (WHERE passed)::int quizzes_passed,round(avg(best),2)::float8 best_quiz_avg,max(last_at) last_attempt_at FROM (SELECT user_id,quiz_id,max(score) best,bool_or(passed) passed,max(created_at) last_at FROM app.training_quiz_attempts GROUP BY user_id,quiz_id) b GROUP BY user_id) q ON q.user_id=u.id
 WHERE ($1::boolean OR u.deleted_at IS NULL) ORDER BY u.username`;

// Returns {user} for an active, non-deleted account or null.
export async function loadProfile(pool,id){
 const r=await pool.query(`SELECT ${PROFILE_COLUMNS} FROM app.users WHERE id=$1 AND active=true AND deleted_at IS NULL`,[id]);
 return r.rows[0]||null;
}

export async function handleAdminUsers({req,res,path,method,url,user,readBody,pool,writePool,json}){
 if(!/^\/api\/admin\/users(?:\/|$)/.test(path))return false;
 try{
  // Authorise against the current database row, not only the session snapshot.
  const actor=await loadProfile(pool,user.id);
  if(!actor){revokeUserSessions(user.id);return json(res,401,{error:'Unauthorized'});}
  const actorRole=lower(actor.role);
  if(!userManagerRoles.has(actorRole))return json(res,403,{error:'Administrator permission required'});
  const isSuper=actorRole==='superadmin';
  const m=path.match(/^\/api\/admin\/users(?:\/([^/]+)(\/reset-password)?)?$/);
  if(!m)return json(res,404,{error:'Not found'});
  if(!m[1]){
   if(method==='GET'){
    const r=await pool.query(LIST_SQL,[url.searchParams.get('include_deleted')==='1']);
    return json(res,200,{users:r.rows});
   }
   if(method!=='POST')return json(res,405,{error:'Method not allowed'});
   if(!writePool)return json(res,503,{error:'User administration unavailable'});
   const input=await readBody();
   if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Invalid JSON object');
   if(typeof input.username!=='string'||!/^[a-zA-Z0-9_.-]{3,64}$/.test(input.username)||/\.deleted\.\d+$/i.test(input.username))throw fail(400,'Username must be 3-64 characters: letters, numbers, dot, dash or underscore');
   if(input.full_name===undefined)throw fail(400,MESSAGES.full_name);
   if(input.role===undefined)throw fail(400,'Invalid role');
   const data=clean(input,['full_name','role','email','phone','branch_code','department','designation','extra_permissions','denied_permissions']);
   if(input.password!==undefined&&input.password!==null&&input.password!==''&&!accountPassword(input.password))throw fail(400,'Password must be 12-256 characters and include letters and numbers');
   if(data.role==='superadmin'&&!isSuper)throw fail(403,'Only a Super Admin can assign the Super Admin role');
   const password=input.password||generatedPassword();
   const c=await writePool.connect();
   try{
    await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[LOCK]);
    const dup=await c.query('SELECT 1 FROM app.users WHERE lower(username)=lower($1)',[input.username]);
    if(dup.rowCount){await c.query('ROLLBACK');return json(res,409,{error:'Username already exists'});}
    const cols=['username','password_hash','role','active','must_change_password','created_by',...Object.keys(data).filter(k=>k!=='role')];
    const vals=[input.username,hashPassword(password),data.role,true,true,actor.id,...Object.keys(data).filter(k=>k!=='role').map(k=>data[k])];
    const r=await c.query(`INSERT INTO app.users(${cols.join(',')}) VALUES(${vals.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING ${ADMIN_COLUMNS}`,vals);
    await audit(c,actor.id,r.rows[0].id,'account_create',null,r.rows[0]);
    await c.query('COMMIT');
    return json(res,201,{user:r.rows[0],temporaryPassword:password});
   }catch(e){await c.query('ROLLBACK').catch(()=>{});if(e.code==='23505')return json(res,409,{error:'Username already exists'});throw e;}finally{c.release();}
  }
  const id=accountId(m[1]);
  if(!id)return json(res,404,{error:'Not found'});
  const reset=!!m[2];
  if(reset&&method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!reset&&method!=='PATCH'&&method!=='DELETE')return json(res,405,{error:'Method not allowed'});
  if(!writePool)return json(res,503,{error:'User administration unavailable'});
  const input=method==='DELETE'?{}:await readBody();
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Invalid JSON object');
  let data={},password=null;
  if(reset){
   password=input.password||generatedPassword();
   if(!accountPassword(password))throw fail(400,'Password must be 12-256 characters and include letters and numbers');
  }else if(method==='PATCH'){
   if(input.password!==undefined||input.password_hash!==undefined)throw fail(400,'Use reset-password to change passwords');
   data=clean(input,Object.keys(FIELDS));
   if(!Object.keys(data).length)throw fail(400,'No changes supplied');
   if(data.role==='superadmin'&&!isSuper)throw fail(403,'Only a Super Admin can assign the Super Admin role');
  }
  const c=await writePool.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[LOCK]);
   const prior=await c.query(`SELECT ${ADMIN_COLUMNS} FROM app.users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[id]);
   const before=prior.rows[0];
   if(!before||(reset&&!before.active)){await c.query('ROLLBACK');return json(res,404,{error:reset?'Active user not found':'User not found'});}
   const targetSuper=lower(before.role)==='superadmin';
   if(targetSuper&&!isSuper){await c.query('ROLLBACK');return json(res,403,{error:'Only a Super Admin can modify a Super Admin account'});}
   const self=String(id)===String(actor.id);
   const deactivating=method==='DELETE'||(data.active===false&&before.active);
   const demoting=data.role!==undefined&&lower(data.role)!==lower(before.role);
   if(targetSuper&&before.active&&(deactivating||(demoting&&lower(data.role)!=='superadmin'))){
    const others=await c.query("SELECT count(*)::int n FROM app.users WHERE lower(role)='superadmin' AND active=true AND deleted_at IS NULL AND id<>$1",[id]);
    if(!others.rows[0].n){await c.query('ROLLBACK');return json(res,409,{error:'The last active Super Admin cannot be deactivated, deleted or demoted'});}
   }
   if(self&&method==='DELETE'){await c.query('ROLLBACK');return json(res,400,{error:'You cannot delete your own account'});}
   if(self&&data.active===false){await c.query('ROLLBACK');return json(res,400,{error:'You cannot deactivate your own account'});}
   if(self&&demoting){await c.query('ROLLBACK');return json(res,400,{error:'You cannot change your own role'});}
   let r,action,revoke=false;
   if(reset){
    r=await c.query(`UPDATE app.users SET password_hash=$1,must_change_password=true,password_changed_at=now(),updated_at=now() WHERE id=$2 RETURNING ${ADMIN_COLUMNS}`,[hashPassword(password),id]);
    action='password_reset';revoke=true;
   }else if(method==='DELETE'){
    r=await c.query(`UPDATE app.users SET active=false,deleted_at=now(),username=username||'.deleted.'||id::text,updated_at=now() WHERE id=$1 RETURNING ${ADMIN_COLUMNS}`,[id]);
    action='account_delete';revoke=true;
   }else{
    const keys=Object.keys(data),vals=keys.map(k=>data[k]);
    r=await c.query(`UPDATE app.users SET ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')},updated_at=now() WHERE id=$${keys.length+1} RETURNING ${ADMIN_COLUMNS}`,[...vals,id]);
    action='account_update';
    revoke=deactivating||demoting||(data.extra_permissions!==undefined&&!sameArr(data.extra_permissions,before.extra_permissions))||(data.denied_permissions!==undefined&&!sameArr(data.denied_permissions,before.denied_permissions));
   }
   await audit(c,actor.id,id,action,before,r.rows[0]);
   await c.query('COMMIT');
   if(revoke)revokeUserSessions(id);
   if(reset)return json(res,200,{user:r.rows[0],temporaryPassword:password});
   if(method==='DELETE')return json(res,200,{ok:true});
   return json(res,200,{user:r.rows[0]});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }catch(e){
  console.error('Admin users request failed',e.code||e.message);
  return json(res,e.status||(e.code==='23505'?409:503),{error:e.status?e.message:e.code==='23505'?'Username already exists':'User administration unavailable'});
 }
}
