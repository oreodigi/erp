const ADMIN_ROLES=new Set(['admin','superadmin','manager']);
const KINDS=new Set(['direct','group','enquiry']);
const STATUSES=new Set(['todo','in_progress','blocked','done','cancelled']);
const PRIORITIES=new Set(['low','normal','high','urgent']);
const idOk=v=>/^[1-9]\d{0,15}$/.test(String(v));
const fail=(status,message)=>Object.assign(new Error(message),{status});
const clean=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max?v.trim():null;
async function isMember(pool,userId,conversationId,admin){
 if(admin)return true;
 const r=await pool.query('SELECT 1 FROM app.communication_members WHERE conversation_id=$1 AND user_id=$2',[conversationId,userId]);
 return !!r.rowCount;
}
async function audit(writePool,user,entity,id,action,state){await writePool.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,entity,id,action,state]);}
export async function handleCommunication({path,method,url,user,readBody,pool,writePool,json,res}){
 if(!/^\/api\/communication(?:\/|$)/.test(path))return false;
 const admin=ADMIN_ROLES.has(String(user.role).toLowerCase());
 try{
  if(path==='/api/communication/overview'&&method==='GET'){
   const [convos,users,tasks]=await Promise.all([
    pool.query(`SELECT c.id,c.kind,c.subject,c.closed,c.created_by,c.created_at,c.updated_at,
      COALESCE((SELECT json_agg(json_build_object('id',m.user_id,'username',u.username,'role',u.role,'member_role',m.member_role)) FROM app.communication_members m JOIN app.users u ON u.id=m.user_id WHERE m.conversation_id=c.id),'[]') members,
      (SELECT json_build_object('id',x.id,'body',x.body,'sender_id',x.sender_id,'sender',su.username,'created_at',x.created_at,'reference_type',x.reference_type,'reference_id',x.reference_id) FROM app.communication_messages x JOIN app.users su ON su.id=x.sender_id WHERE x.conversation_id=c.id ORDER BY x.id DESC LIMIT 1) last_message
      FROM app.communication_conversations c WHERE $1::boolean OR EXISTS(SELECT 1 FROM app.communication_members cm WHERE cm.conversation_id=c.id AND cm.user_id=$2) ORDER BY c.updated_at DESC LIMIT 200`,[admin,user.id]),
    pool.query('SELECT id,username,role,active FROM app.users WHERE active=true ORDER BY username'),
    pool.query(`SELECT t.*,c.subject,c.kind,u.username assigned_username,cu.username creator_username FROM app.communication_tasks t JOIN app.communication_conversations c ON c.id=t.conversation_id LEFT JOIN app.users u ON u.id=t.assigned_to JOIN app.users cu ON cu.id=t.created_by WHERE $1::boolean OR EXISTS(SELECT 1 FROM app.communication_members cm WHERE cm.conversation_id=t.conversation_id AND cm.user_id=$2) ORDER BY t.updated_at DESC LIMIT 300`,[admin,user.id])
   ]);
   return json(res,200,{conversations:convos.rows,users:users.rows,tasks:tasks.rows,admin});
  }
  if(path==='/api/communication/conversations'&&method==='POST'){
   const input=await readBody(),kind=input?.kind||'group',subject=clean(input?.subject,240),members=Array.isArray(input?.member_ids)?[...new Set(input.member_ids.map(String))]:[];
   if(!KINDS.has(kind)||!subject||members.length>100||members.some(x=>!idOk(x)))throw fail(400,'Invalid conversation');
   const c=await writePool.connect();try{await c.query('BEGIN');
    const r=await c.query('INSERT INTO app.communication_conversations(kind,subject,created_by) VALUES($1,$2,$3) RETURNING *',[kind,subject,user.id]);
    const all=[String(user.id),...members];
    for(const member of [...new Set(all)])await c.query('INSERT INTO app.communication_members(conversation_id,user_id,member_role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[r.rows[0].id,member,String(member)===String(user.id)?'owner':'member']);
    await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'communication_conversation',String(r.rows[0].id),'create',r.rows[0]]);
    await c.query('COMMIT');return json(res,201,r.rows[0]);
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  const conversationMatch=path.match(/^\/api\/communication\/conversations\/([1-9]\d{0,15})(?:\/(messages|read))?$/);
  if(conversationMatch){
   const conversationId=conversationMatch[1],sub=conversationMatch[2];
   if(!(await isMember(pool,user.id,conversationId,admin)))return json(res,403,{error:'Conversation access denied'});
   if(sub==='messages'&&method==='GET'){
    const after=url.searchParams.get('after');
    const r=await pool.query(`SELECT m.id,m.conversation_id,m.sender_id,u.username sender,m.body,m.reference_type,m.reference_id,m.created_at,m.edited_at FROM app.communication_messages m JOIN app.users u ON u.id=m.sender_id WHERE m.conversation_id=$1 AND ($2::bigint IS NULL OR m.id>$2) ORDER BY m.id ASC LIMIT 500`,[conversationId,after&&idOk(after)?after:null]);
    return json(res,200,{messages:r.rows});
   }
   if(sub==='messages'&&method==='POST'){
    const input=await readBody(),message=clean(input?.body,12000),referenceType=input?.reference_type?clean(input.reference_type,40):null,referenceId=input?.reference_id?clean(String(input.reference_id),120):null;
    if(!message)throw fail(400,'Message is required');
    const c=await writePool.connect();try{await c.query('BEGIN');const r=await c.query('INSERT INTO app.communication_messages(conversation_id,sender_id,body,reference_type,reference_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[conversationId,user.id,message,referenceType,referenceId]);await c.query('UPDATE app.communication_conversations SET updated_at=now() WHERE id=$1',[conversationId]);await audit(writePool,user,'communication_message',String(r.rows[0].id),'send',{conversation_id:conversationId,reference_type:referenceType,reference_id:referenceId});await c.query('COMMIT');return json(res,201,r.rows[0]);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
   }
   if(sub==='read'&&method==='POST'){await writePool.query('UPDATE app.communication_members SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2',[conversationId,user.id]);return json(res,200,{ok:true});}
  }
  if(path==='/api/communication/tasks'&&method==='POST'){
   const input=await readBody(),conversationId=idOk(input?.conversation_id)&&String(input.conversation_id),title=clean(input?.title,240),description=typeof input?.description==='string'?input.description.slice(0,12000):'',assignedTo=input?.assigned_to==null?null:(idOk(input.assigned_to)&&String(input.assigned_to)),priority=input?.priority||'normal',dueAt=input?.due_at||null;
   if(!conversationId||!(await isMember(pool,user.id,conversationId,admin))||!title||!PRIORITIES.has(priority)||(input?.assigned_to!=null&&!assignedTo))throw fail(400,'Invalid task');
   if(assignedTo){const ar=await pool.query('SELECT 1 FROM app.users WHERE id=$1 AND active=true',[assignedTo]);if(!ar.rowCount)throw fail(400,'Invalid assignee');}
   const r=await writePool.query('INSERT INTO app.communication_tasks(conversation_id,title,description,assigned_to,created_by,priority,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[conversationId,title,description,assignedTo,user.id,priority,dueAt]);await writePool.query('UPDATE app.communication_conversations SET updated_at=now() WHERE id=$1',[conversationId]);await audit(writePool,user,'communication_task',String(r.rows[0].id),'create',r.rows[0]);return json(res,201,r.rows[0]);
  }
  const taskMatch=path.match(/^\/api\/communication\/tasks\/([1-9]\d{0,15})$/);
  if(taskMatch&&method==='PATCH'){
   const id=taskMatch[1],input=await readBody(),prior=await pool.query('SELECT * FROM app.communication_tasks WHERE id=$1',[id]);if(!prior.rowCount||!(await isMember(pool,user.id,prior.rows[0].conversation_id,admin)))return json(res,404,{error:'Task not found'});
   if(input?.status!==undefined&&!STATUSES.has(input.status))throw fail(400,'Invalid status');
   const fields=[],values=[];for(const [column,value] of [['status',input?.status],['assigned_to',input?.assigned_to],['priority',input?.priority],['due_at',input?.due_at]])if(value!==undefined){if(column==='priority'&&!PRIORITIES.has(value))throw fail(400,'Invalid priority');if(column==='assigned_to'&&value!==null&&!idOk(value))throw fail(400,'Invalid assignee');fields.push(`${column}=$${values.length+1}`);values.push(value);}if(!fields.length)return json(res,400,{error:'No changes supplied'});fields.push('version=version+1','updated_at=now()');values.push(id, input?.version);const r=await writePool.query('UPDATE app.communication_tasks SET '+fields.join(',')+' WHERE id=$'+(values.length-1)+' AND version=$'+values.length+' RETURNING *',values);if(!r.rowCount)return json(res,409,{error:'Task changed by another user'});await audit(writePool,user,'communication_task',id,'update',r.rows[0]);return json(res,200,r.rows[0]);
  }
  if(path==='/api/communication/audit'&&method==='GET'){
   if(!admin)return json(res,403,{error:'Administrator permission required'});
   const r=await writePool.query(`SELECT a.id,a.action,a.entity_type,a.entity_id,a.after_state,a.created_at,u.username actor FROM app.audit_events a LEFT JOIN app.users u ON u.id=a.actor_id WHERE a.entity_type LIKE 'communication_%' ORDER BY a.created_at DESC LIMIT 500`);return json(res,200,{events:r.rows});
  }
  return json(res,404,{error:'Not found'});
 }catch(e){console.error('Communication request failed',e.code||e.message);return json(res,e.status||503,{error:e.status?e.message:'Communication service unavailable'});}
}
