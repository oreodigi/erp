const MODULES=new Set(['onboarding','training','kanban','operations','fleet','warehouse','finance','workshop','customers']);
const STATUSES=new Set(['todo','in_progress','blocked','review','done','cancelled']);
const PRIORITIES=new Set(['low','normal','high','urgent']);
const WRITE_ROLES=new Set(['admin','superadmin','manager']);
const FIELDS=new Set(['title','description','module','status','priority','assigned_to','due_at']);
const fail=(status,message)=>Object.assign(new Error(message),{status});
const validId=s=>/^[1-9]\d{0,15}$/.test(String(s))?String(s):null;
function validate(data,partial=false){
 if(!data||typeof data!=='object'||Array.isArray(data))throw fail(400,'Invalid JSON object');
 const keys=Object.keys(data);
 if(!keys.length||keys.some(k=>!FIELDS.has(k)))throw fail(400,'Unsupported field');
 if(!partial&&(!data.title||!data.module))throw fail(400,'Title and module required');
 if(data.title!==undefined&&(typeof data.title!=='string'||!data.title.trim()||data.title.length>240))throw fail(400,'Invalid title');
 if(data.description!==undefined&&(typeof data.description!=='string'||data.description.length>10000))throw fail(400,'Invalid description');
 if(data.module!==undefined&&!MODULES.has(data.module))throw fail(400,'Invalid module');
 if(data.status!==undefined&&!STATUSES.has(data.status))throw fail(400,'Invalid status');
 if(data.priority!==undefined&&!PRIORITIES.has(data.priority))throw fail(400,'Invalid priority');
 if(data.assigned_to!==undefined&&data.assigned_to!==null&&!validId(data.assigned_to))throw fail(400,'Invalid assignee');
 if(data.due_at!==undefined&&data.due_at!==null&&(typeof data.due_at!=='string'||!Number.isFinite(Date.parse(data.due_at))))throw fail(400,'Invalid due date');
 return Object.fromEntries(keys.map(k=>[k,k==='title'?data[k].trim():data[k]]));
}
export async function handleWorkItems({path,method,url,user,readBody,pool,writePool,json,res}){
 if(!/^\/api\/work-items(?:\/|$)/.test(path))return false;
 const suffix=path.slice('/api/work-items'.length).replace(/^\//,'');
 const id=suffix?validId(suffix):null;
 if(suffix&&!id){json(res,404,{error:'Not found'});return true;}
 const admin=WRITE_ROLES.has(String(user.role).toLowerCase());
 try{
  if(method==='GET'){
   if(id){const r=await pool.query('SELECT * FROM app.work_items WHERE id=$1 AND ($2::boolean OR assigned_to=$3)',[id,admin,user.id]);json(res,r.rowCount?200:404,r.rowCount?r.rows[0]:{error:'Not found'});return true;}
   const module=url.searchParams.get('module'),status=url.searchParams.get('status');
   if(module&&!MODULES.has(module))throw fail(400,'Invalid module');
   if(status&&!STATUSES.has(status))throw fail(400,'Invalid status');
   const r=await pool.query('SELECT * FROM app.work_items WHERE ($1::text IS NULL OR module=$1) AND ($2::text IS NULL OR status=$2) AND ($3::boolean OR assigned_to=$4) ORDER BY updated_at DESC,id DESC LIMIT 200',[module,status,admin,user.id]);
   json(res,200,{items:r.rows});return true;
  }
  if(!admin){json(res,403,{error:'Insufficient permissions'});return true;}
  if(method==='POST'&&!id){
   if(!writePool)throw fail(503,'Write database unavailable');
   const data=validate(await readBody());
   const columns=Object.keys(data),values=Object.values(data),c=await writePool.connect();
   try{
    await c.query('BEGIN');
    const r=await c.query('INSERT INTO app.work_items ('+columns.map(k=>'"'+k+'"').join(',')+',created_by) VALUES ('+values.map((_,i)=>'$'+(i+1)).join(',')+',$'+(values.length+1)+') RETURNING *',[...values,user.id]);
    await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES ($1,$2,$3,$4,$5)',[user.id,'work_item',String(r.rows[0].id),'create',r.rows[0]]);
    await c.query('COMMIT');json(res,201,r.rows[0]);return true;
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  if(method==='PATCH'&&id){
   if(!writePool)throw fail(503,'Write database unavailable');
   const input=await readBody(),version=input?.version;
   if(!Number.isSafeInteger(version)||version<1)throw fail(400,'Valid version required');
   const data=validate(Object.fromEntries(Object.entries(input).filter(([k])=>k!=='version')),true);
   const columns=Object.keys(data),values=Object.values(data),c=await writePool.connect();
   try{
    await c.query('BEGIN');
    const prior=await c.query('SELECT * FROM app.work_items WHERE id=$1 FOR UPDATE',[id]);
    if(!prior.rowCount){await c.query('ROLLBACK');json(res,404,{error:'Not found'});return true;}
    if(Number(prior.rows[0].version)!==version){await c.query('ROLLBACK');json(res,409,{error:'Record changed by another user',current:prior.rows[0]});return true;}
    const r=await c.query('UPDATE app.work_items SET '+columns.map((k,i)=>'"'+k+'"=$'+(i+1)).join(',')+',version=version+1,updated_at=now() WHERE id=$'+(values.length+1)+' RETURNING *',[...values,id]);
    await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)',[user.id,'work_item',id,'update',prior.rows[0],r.rows[0]]);
    await c.query('COMMIT');json(res,200,r.rows[0]);return true;
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  json(res,405,{error:'Method not allowed'});return true;
 }catch(e){
  console.error('Work-item request failed',e.code||e.message);
  json(res,e.status||(e.code==='23503'?422:503),{error:e.status?e.message:e.code==='23503'?'Referenced user does not exist':'Work-item service unavailable'});return true;
 }
}
