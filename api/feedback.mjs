import fs from 'node:fs/promises';
import pathMod from 'node:path';
import crypto from 'node:crypto';
const ADMIN=new Set(['admin','superadmin','manager']);
const TYPES=new Set(['Bug','Improvement','Missing Feature','Confusing','Data Issue','Training/Help Issue','Other']);
const IMPACT=new Set(['Low','Medium','High','Blocking']);
const STATUSES=new Set(['New','Reviewing','Accepted','Planned','In Development','Ready for Testing','Fixed','Verified','Closed','Duplicate','Not Planned','Need More Information']);
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fail=(status,message)=>Object.assign(new Error(message),{status});
const clean=(x,n=500)=>String(x??'').trim().slice(0,n);
const ROOT=process.env.SK_FEEDBACK_DIR||'/home/tejum/sk-erp-data/feedback';
const MIME=new Map([['image/png','png'],['image/jpeg','jpg'],['image/webp','webp'],['image/gif','gif'],['application/pdf','pdf'],['application/msword','doc'],['application/vnd.openxmlformats-officedocument.wordprocessingml.document','docx'],['application/vnd.ms-excel','xls'],['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx'],['text/plain','txt'],['text/csv','csv'],['audio/webm','webm'],['audio/ogg','ogg'],['audio/mp4','m4a'],['audio/mpeg','mp3'],['audio/wav','wav']]);
const kind=m=>m.startsWith('image/')?'image':m.startsWith('audio/')?'audio':'document';
const select=(admin)=>`SELECT f.*,u.username,u.full_name,u.role,au.full_name assigned_name,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'body',p.body,'position',p.position) ORDER BY p.position) FROM app.feedback_points p WHERE p.feedback_id=f.id),'[]'::jsonb) points,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'name',a.original_name,'mime_type',a.mime_type,'size_bytes',a.size_bytes) ORDER BY a.id) FROM app.feedback_attachments a WHERE a.feedback_id=f.id),'[]'::jsonb) attachments,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'internal',c.internal,'created_at',c.created_at,'user_id',c.user_id,'full_name',cu.full_name,'username',cu.username) ORDER BY c.created_at) FROM app.feedback_comments c JOIN app.users cu ON cu.id=c.user_id WHERE c.feedback_id=f.id AND (${admin?'TRUE':'NOT c.internal'})),'[]'::jsonb) comments
 FROM app.feedback f JOIN app.users u ON u.id=f.user_id LEFT JOIN app.users au ON au.id=f.assigned_to`;

export async function handleFeedback({path,method,url,user,readBody,pool,writePool,json,res}){
 if(!path.startsWith('/api/feedback'))return false;
 const admin=ADMIN.has(String(user.role).toLowerCase());
 try{
  if(path==='/api/feedback'&&method==='GET'){
   const where=admin?'TRUE':'f.user_id=$1',args=admin?[]:[user.id];
   const r=await pool.query(select(admin)+` WHERE ${where} ORDER BY f.created_at DESC LIMIT 300`,args);
   json(res,200,{items:r.rows,admin});return true;
  }
  if(path==='/api/feedback'&&method==='POST'){
   if(!writePool)throw fail(503,'Feedback write service unavailable');
   const d=await readBody();if(!obj(d)||!TYPES.has(d.feedback_type)||!IMPACT.has(d.impact))throw fail(400,'Invalid feedback');
   const description=clean(d.description,10000),title=clean(d.title,240);
   const points=Array.isArray(d.points)?d.points.map(x=>clean(x,2000)).filter(Boolean).slice(0,20):[];
   if(!description&&!title&&!points.length)throw fail(400,'Add feedback text or points');
   const route=clean(d.route,160),screen=clean(d.screen_id,160),mode=d.mode==='Practice'?'Practice':'Company';
   const params=obj(d.route_params)?d.route_params:{},ctx=obj(d.client_context)?d.client_context:{};
   const c=await writePool.connect();try{await c.query('BEGIN');
    const r=await c.query(`INSERT INTO app.feedback(user_id,feedback_type,impact,title,description,module,screen_id,route,route_params,record_type,record_id,record_no,section,mode,client_context)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[user.id,d.feedback_type,d.impact,title,description,clean(d.module,120),screen,route,params,clean(d.record_type,120)||null,clean(d.record_id,160)||null,clean(d.record_no,160)||null,clean(d.section,160)||null,mode,ctx]);
    for(let i=0;i<points.length;i++)await c.query('INSERT INTO app.feedback_points(feedback_id,position,body) VALUES($1,$2,$3)',[r.rows[0].id,i,points[i]]);
    await c.query('INSERT INTO app.feedback_history(feedback_id,actor_id,action,after_state) VALUES($1,$2,$3,$4)',[r.rows[0].id,user.id,'created',{status:'New',screen_id:screen,route}]);
    await c.query('COMMIT');json(res,201,{item:r.rows[0]});return true;
   }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  }
  const upload=path.match(/^\/api\/feedback\/(\d+)\/attachments$/);
  if(upload&&method==='POST'){
   if(!writePool)throw fail(503,'Feedback upload unavailable');
   const own=await pool.query('SELECT user_id FROM app.feedback WHERE id=$1',[upload[1]]);
   if(!own.rowCount||(!admin&&String(own.rows[0].user_id)!==String(user.id)))throw fail(404,'Feedback not found');
   const d=await readBody(),mime=clean(d?.mime_type,160).split(';')[0],name=clean(d?.name,240),encoded=String(d?.data||'');
   if(!name||!MIME.has(mime)||!encoded)throw fail(400,'Unsupported attachment');
   const raw=Buffer.from(encoded,'base64');if(!raw.length||raw.length>12582912)throw fail(413,'Attachment must be 12 MB or smaller');
   const stored=crypto.randomUUID()+'.'+MIME.get(mime);await fs.mkdir(ROOT,{recursive:true,mode:0o750});await fs.writeFile(pathMod.join(ROOT,stored),raw,{mode:0o640});
   const r=await writePool.query('INSERT INTO app.feedback_attachments(feedback_id,user_id,kind,original_name,stored_name,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,kind,original_name name,mime_type,size_bytes,created_at',[upload[1],user.id,kind(mime),name,stored,mime,raw.length]);
   await writePool.query('INSERT INTO app.feedback_history(feedback_id,actor_id,action,after_state) VALUES($1,$2,$3,$4)',[upload[1],user.id,'attachment_added',{attachment_id:r.rows[0].id,kind:r.rows[0].kind,name}]);
   json(res,201,{attachment:r.rows[0]});return true;
  }
  const file=path.match(/^\/api\/feedback\/attachments\/(\d+)$/);
  if(file&&method==='GET'){
   const r=await pool.query('SELECT a.*,f.user_id owner_id FROM app.feedback_attachments a JOIN app.feedback f ON f.id=a.feedback_id WHERE a.id=$1',[file[1]]);
   if(!r.rowCount||(!admin&&String(r.rows[0].owner_id)!==String(user.id)))throw fail(404,'Attachment not found');
   const raw=await fs.readFile(pathMod.join(ROOT,r.rows[0].stored_name));json(res,200,{name:r.rows[0].original_name,mime_type:r.rows[0].mime_type,data:raw.toString('base64')});return true;
  }
  const comments=path.match(/^\/api\/feedback\/(\d+)\/comments$/);
  if(comments&&method==='POST'){
   if(!writePool)throw fail(503,'Feedback comments unavailable');
   const own=await pool.query('SELECT user_id FROM app.feedback WHERE id=$1',[comments[1]]);
   if(!own.rowCount||(!admin&&String(own.rows[0].user_id)!==String(user.id)))throw fail(404,'Feedback not found');
   const d=await readBody(),body=clean(d?.body,5000),internal=admin&&d?.internal===true;
   if(!body)throw fail(400,'Comment is required');
   const r=await writePool.query('INSERT INTO app.feedback_comments(feedback_id,user_id,body,internal) VALUES($1,$2,$3,$4) RETURNING *',[comments[1],user.id,body,internal]);
   await writePool.query('INSERT INTO app.feedback_history(feedback_id,actor_id,action,after_state) VALUES($1,$2,$3,$4)',[comments[1],user.id,internal?'internal_note':'comment_added',{comment_id:r.rows[0].id}]);
   json(res,201,{comment:r.rows[0]});return true;
  }
  const m=path.match(/^\/api\/feedback\/(\d+)$/);
  if(m&&method==='GET'){
   const r=await pool.query(select(admin)+' WHERE f.id=$1'+(admin?'':' AND f.user_id=$2'),admin?[m[1]]:[m[1],user.id]);
   if(!r.rowCount)throw fail(404,'Feedback not found');json(res,200,{item:r.rows[0]});return true;
  }
  if(m&&method==='PATCH'){
   if(!admin)throw fail(403,'Admin permission required');if(!writePool)throw fail(503,'Feedback write service unavailable');
   const d=await readBody();if(!obj(d))throw fail(400,'Invalid feedback update');
   const prior=await pool.query('SELECT * FROM app.feedback WHERE id=$1',[m[1]]);if(!prior.rowCount)throw fail(404,'Feedback not found');
   const status=d.status===undefined?prior.rows[0].status:d.status;if(!STATUSES.has(status))throw fail(400,'Invalid status');
   const impact=d.impact===undefined?prior.rows[0].impact:d.impact;if(!IMPACT.has(impact))throw fail(400,'Invalid impact');
   const assigned=d.assigned_to===undefined?prior.rows[0].assigned_to:(d.assigned_to||null);
   const resolution=d.resolution===undefined?prior.rows[0].resolution:clean(d.resolution,10000);
   const duplicate=d.duplicate_of===undefined?prior.rows[0].duplicate_of:(d.duplicate_of||null);
   if(status==='Duplicate'&&!duplicate)throw fail(400,'Select the original feedback for a duplicate');
   if(duplicate&&String(duplicate)===String(m[1]))throw fail(400,'Feedback cannot duplicate itself');
   const r=await writePool.query(`UPDATE app.feedback SET status=$1,impact=$2,assigned_to=$3,resolution=$4,duplicate_of=$5,updated_at=now(),resolved_at=CASE WHEN $1=ANY($6::text[]) THEN COALESCE(resolved_at,now()) ELSE NULL END WHERE id=$7 RETURNING *`,[status,impact,assigned,resolution,duplicate,['Fixed','Verified','Closed','Duplicate','Not Planned'],m[1]]);
   await writePool.query('INSERT INTO app.feedback_history(feedback_id,actor_id,action,before_state,after_state) VALUES($1,$2,$3,$4,$5)',[m[1],user.id,'updated',prior.rows[0],r.rows[0]]);
   json(res,200,{item:r.rows[0]});return true;
  }
  json(res,405,{error:'Method not allowed'});return true;
 }catch(e){console.error('Feedback API error',e.code||e.message);json(res,e.status||503,{error:e.status?e.message:'Feedback service unavailable'});return true}
}
