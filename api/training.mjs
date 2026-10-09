const ADMIN=new Set(['admin','superadmin','manager']);const idOk=v=>/^[1-9]\d{0,15}$/.test(String(v));const fail=(status,message)=>Object.assign(new Error(message),{status});
const TEAM=new Set(['admin','superadmin','manager','hr']);const SETTINGS_ADMIN=new Set(['admin','superadmin']);
const KINDS=new Set(['onboarding','lesson','tour','hint','exercise','workflow','audio','screen']);
const STATUSES=new Set(['started','completed','dismissed','understood','passed','failed','skipped','heard']);
const DONE=['completed','passed','understood','heard','dismissed','skipped'];
const RESET_KINDS=new Set(['onboarding','tour','hint']);
const ITEM=/^[a-z0-9][a-z0-9:\/._-]{0,119}$/;
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const REC='kind,item_id,status,score::float8 score,detail,started_at,completed_at,updated_at';
const ATTEMPT='id,quiz_id,score::float8 score,correct,total,passed,wrong,duration_seconds,created_at';
const PROFILE='id,username,full_name,role,branch_code,department,designation,active,email,phone,last_login_at,created_at,deleted_at';
const DEFAULT_READINESS={weights:{lessons:25,tours:10,practice:30,quiz:25,workflow:10},thresholds:{learning:1,practising:35,assessment:60,ready:85},passPct:70,minPracticePct:60};
// Quiz summaries per (user, quiz): attempts, best, last score, any pass, latest time and wrong ids of the latest attempt.
const SUMMARY_SQL=`SELECT a.user_id,a.quiz_id,a.attempts,a.best,l.score last,a.passed,l.created_at last_at,l.wrong
 FROM (SELECT user_id,quiz_id,count(*)::int attempts,max(score)::float8 best,bool_or(passed) passed FROM app.training_quiz_attempts WHERE ($1::bigint IS NULL OR user_id=$1) AND ($2::text IS NULL OR quiz_id=$2) GROUP BY user_id,quiz_id) a
 JOIN (SELECT DISTINCT ON (user_id,quiz_id) user_id,quiz_id,score::float8 score,created_at,wrong FROM app.training_quiz_attempts WHERE ($1::bigint IS NULL OR user_id=$1) AND ($2::text IS NULL OR quiz_id=$2) ORDER BY user_id,quiz_id,created_at DESC,id DESC) l USING(user_id,quiz_id)
 ORDER BY a.user_id,a.quiz_id`;
const summaries=async(pool,userId,quizId=null)=>(await pool.query(SUMMARY_SQL,[userId,quizId])).rows;
const strip=({user_id,...q})=>q;
async function readiness(pool){const r=await pool.query("SELECT value FROM app.training_settings WHERE key='readiness'");return r.rowCount?r.rows[0].value:DEFAULT_READINESS;}
const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const exactKeys=(o,keys)=>isObj(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
function validReadiness(x){
 if(!exactKeys(x,['weights','thresholds','passPct','minPracticePct']))return false;
 const w=x.weights,t=x.thresholds,wk=['lessons','tours','practice','quiz','workflow'],tk=['learning','practising','assessment','ready'];
 if(!exactKeys(w,wk)||!wk.every(k=>int(w[k],0,100))||wk.reduce((a,k)=>a+w[k],0)!==100)return false;
 if(!exactKeys(t,tk)||!tk.every(k=>int(t[k],0,100))||!(t.learning<t.practising&&t.practising<t.assessment&&t.assessment<t.ready))return false;
 return int(x.passPct,40,100)&&int(x.minPracticePct,0,100);
}
async function handleAcademy({path,method,user,readBody,pool,writePool,json,res}){
 const role=String(user.role).toLowerCase();
 if(path==='/api/training/me'){
  if(method!=='GET')throw fail(405,'Method not allowed');
  const [records,quizzes,settings]=await Promise.all([pool.query(`SELECT ${REC} FROM app.training_records WHERE user_id=$1 ORDER BY updated_at DESC`,[user.id]),summaries(pool,user.id),readiness(pool)]);
  json(res,200,{user_id:String(user.id),records:records.rows,quizzes:quizzes.map(strip),settings:{readiness:settings}});return true;
 }
 if(path==='/api/training/records'){
  if(method!=='POST')throw fail(405,'Method not allowed');
  if(!writePool)throw fail(503,'Write database unavailable');
  const d=await readBody();
  if(!isObj(d)||!KINDS.has(d.kind)||typeof d.item_id!=='string'||!ITEM.test(d.item_id)||!STATUSES.has(d.status))throw fail(400,'Invalid training record');
  if(d.score!==undefined&&d.score!==null&&(typeof d.score!=='number'||!Number.isFinite(d.score)||d.score<0||d.score>100))throw fail(400,'Invalid score');
  if(d.detail!==undefined&&(!isObj(d.detail)||Buffer.byteLength(JSON.stringify(d.detail))>3000))throw fail(400,'Invalid detail');
  const r=await writePool.query(`INSERT INTO app.training_records(user_id,kind,item_id,status,score,detail,completed_at) VALUES($1,$2,$3,$4,$5,COALESCE($6::jsonb,'{}'::jsonb),CASE WHEN $4=ANY($7::text[]) THEN now() END)
   ON CONFLICT(user_id,kind,item_id) DO UPDATE SET status=EXCLUDED.status,score=COALESCE($5,app.training_records.score),detail=COALESCE($6::jsonb,app.training_records.detail),
   completed_at=CASE WHEN EXCLUDED.status=ANY($7::text[]) THEN now() WHEN EXCLUDED.status='started' THEN app.training_records.completed_at ELSE NULL END,updated_at=now()
   RETURNING ${REC}`,[user.id,d.kind,d.item_id,d.status,d.score??null,d.detail===undefined?null:JSON.stringify(d.detail),DONE]);
  json(res,200,{record:r.rows[0]});return true;
 }
 if(path==='/api/training/reset'){
  if(method!=='POST')throw fail(405,'Method not allowed');
  if(!writePool)throw fail(503,'Write database unavailable');
  const d=await readBody();if(!isObj(d)||!RESET_KINDS.has(d.kind))throw fail(400,'Invalid reset kind');
  const r=await writePool.query('DELETE FROM app.training_records WHERE user_id=$1 AND kind=$2',[user.id,d.kind]);
  json(res,200,{deleted:r.rowCount});return true;
 }
 if(path==='/api/training/quiz-attempts'){
  if(method!=='POST')throw fail(405,'Method not allowed');
  if(!writePool)throw fail(503,'Write database unavailable');
  const d=await readBody();
  if(!isObj(d)||typeof d.quiz_id!=='string'||!ITEM.test(d.quiz_id))throw fail(400,'Invalid quiz id');
  if(!int(d.total,1,200)||!int(d.correct,0,d.total))throw fail(400,'Invalid correct/total counts');
  if(typeof d.score!=='number'||!Number.isFinite(d.score)||d.score<0||d.score>100||Math.abs(d.score-d.correct/d.total*100)>1)throw fail(400,'Score does not match correct/total');
  if(typeof d.passed!=='boolean')throw fail(400,'Invalid passed flag');
  const wrong=d.wrong??[];
  if(!Array.isArray(wrong)||wrong.length>d.total||wrong.some(x=>typeof x!=='string'||!ITEM.test(x)))throw fail(400,'Invalid wrong answers');
  if(d.duration_seconds!==undefined&&d.duration_seconds!==null&&!int(d.duration_seconds,0,2147483647))throw fail(400,'Invalid duration');
  const r=await writePool.query(`INSERT INTO app.training_quiz_attempts(user_id,quiz_id,score,correct,total,passed,wrong,duration_seconds) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${ATTEMPT}`,[user.id,d.quiz_id,d.score,d.correct,d.total,d.passed,wrong,d.duration_seconds??null]);
  const [summary]=await summaries(writePool,user.id,d.quiz_id);
  json(res,201,{attempt:r.rows[0],summary:strip(summary)});return true;
 }
 if(path==='/api/training/settings'){
  if(method==='GET'){json(res,200,{readiness:await readiness(pool)});return true;}
  if(method!=='PUT')throw fail(405,'Method not allowed');
  if(!SETTINGS_ADMIN.has(role))throw fail(403,'Administrator permission required');
  if(!writePool)throw fail(503,'Write database unavailable');
  const d=await readBody();if(!isObj(d)||!validReadiness(d.readiness))throw fail(400,'Invalid readiness settings');
  const v=d.readiness,value={weights:{...v.weights},thresholds:{...v.thresholds},passPct:v.passPct,minPracticePct:v.minPracticePct};
  const c=await writePool.connect();try{await c.query('BEGIN');
   const prior=await c.query("SELECT value FROM app.training_settings WHERE key='readiness'");
   const r=await c.query("INSERT INTO app.training_settings(key,value,updated_by,updated_at) VALUES('readiness',$1::jsonb,$2,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING value,updated_at",[JSON.stringify(value),user.id]);
   await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)',[user.id,'training_settings','readiness','update',prior.rows[0]?.value??null,value]);
   await c.query('COMMIT');json(res,200,{readiness:r.rows[0].value,updated_at:r.rows[0].updated_at});return true;
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }
 if(path==='/api/training/team'){
  if(method!=='GET')throw fail(405,'Method not allowed');
  if(!TEAM.has(role))throw fail(403,'Insufficient permissions');
  const [users,records,quizzes]=await Promise.all([
   pool.query(`SELECT u.id,u.username,u.full_name,u.role,u.branch_code,u.department,u.designation,u.active,u.last_login_at,GREATEST((SELECT max(updated_at) FROM app.training_records r WHERE r.user_id=u.id),(SELECT max(created_at) FROM app.training_quiz_attempts a WHERE a.user_id=u.id)) last_activity_at FROM app.users u WHERE u.deleted_at IS NULL ORDER BY u.username`),
   pool.query('SELECT r.user_id,r.kind,r.item_id,r.status,r.score::float8 score FROM app.training_records r JOIN app.users u ON u.id=r.user_id WHERE u.deleted_at IS NULL ORDER BY r.user_id,r.kind,r.item_id'),
   summaries(pool,null)]);
  const byUser=new Map(users.rows.map(u=>[String(u.id),{...u,records:[],quizzes:[]}]));
  for(const {user_id,...r} of records.rows)byUser.get(String(user_id))?.records.push(r);
  for(const q of quizzes)byUser.get(String(q.user_id))?.quizzes.push({quiz_id:q.quiz_id,attempts:q.attempts,best:q.best,last:q.last,passed:q.passed});
  json(res,200,{users:[...byUser.values()]});return true;
 }
 const m=path.match(/^\/api\/training\/users\/([^/]+)$/);
 if(m){
  if(method!=='GET')throw fail(405,'Method not allowed');
  if(!TEAM.has(role))throw fail(403,'Insufficient permissions');
  if(!idOk(m[1]))throw fail(404,'Not found');
  const u=await pool.query(`SELECT ${PROFILE} FROM app.users WHERE id=$1`,[m[1]]);
  if(!u.rowCount)throw fail(404,'User not found');
  const [records,attempts]=await Promise.all([pool.query(`SELECT ${REC} FROM app.training_records WHERE user_id=$1 ORDER BY updated_at DESC`,[m[1]]),pool.query(`SELECT ${ATTEMPT} FROM app.training_quiz_attempts WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,[m[1]])]);
  json(res,200,{user:u.rows[0],records:records.rows,attempts:attempts.rows});return true;
 }
 return false;
}
export async function handleTraining({path,method,user,readBody,pool,writePool,json,res}){
 if(!/^\/api\/training(?:\/|$)/.test(path))return false;
 const admin=ADMIN.has(String(user.role).toLowerCase());
 try{
  if(await handleAcademy({path,method,user,readBody,pool,writePool,json,res}))return true;
  if(method==='GET'&&path==='/api/training'){
   const [courses,lessons,progress]=await Promise.all([
    pool.query('SELECT * FROM app.training_courses WHERE active=true ORDER BY id'),
    pool.query('SELECT l.* FROM app.training_lessons l JOIN app.training_courses c ON c.id=l.course_id WHERE c.active=true ORDER BY l.course_id,l.sort_order,l.id'),
    pool.query('SELECT lesson_id,completed_at FROM app.training_progress WHERE user_id=$1',[user.id])]);
   json(res,200,{courses:courses.rows,lessons:lessons.rows,progress:progress.rows});return true;
  }
  if(!admin&&method==='POST'&&path!=='/api/training/progress'){json(res,403,{error:'Insufficient permissions'});return true;}
  if(method==='POST'&&path==='/api/training/progress'){
   const data=await readBody();if(!idOk(data?.lesson_id)||typeof data.completed!=='boolean')throw fail(400,'Invalid progress input');
   if(!writePool)throw fail(503,'Write database unavailable');
   const c=await writePool.connect();try{await c.query('BEGIN');
    const lesson=await c.query('SELECT id FROM app.training_lessons WHERE id=$1',[data.lesson_id]);
    if(!lesson.rowCount)throw fail(404,'Lesson not found');
    if(data.completed)await c.query('INSERT INTO app.training_progress(user_id,lesson_id) VALUES($1,$2) ON CONFLICT(user_id,lesson_id) DO NOTHING',[user.id,data.lesson_id]);
    else await c.query('DELETE FROM app.training_progress WHERE user_id=$1 AND lesson_id=$2',[user.id,data.lesson_id]);
    await c.query('INSERT INTO app.audit_events(actor_id,entity_type,entity_id,action,after_state) VALUES($1,$2,$3,$4,$5)',[user.id,'training_progress',String(data.lesson_id),data.completed?'complete':'reopen',{completed:data.completed}]);
    await c.query('COMMIT');json(res,200,{ok:true});return true;
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  if(method==='POST'&&path==='/api/training/courses'){
   if(!admin){json(res,403,{error:'Insufficient permissions'});return true;}
   const data=await readBody();if(typeof data?.title!=='string'||!data.title.trim()||data.title.length>240||typeof(data.description??'')!=='string')throw fail(400,'Invalid course');
   const r=await writePool.query('INSERT INTO app.training_courses(title,description,created_by) VALUES($1,$2,$3) RETURNING *',[data.title.trim(),data.description??'',user.id]);json(res,201,r.rows[0]);return true;
  }
  if(method==='POST'&&path==='/api/training/lessons'){
   if(!admin){json(res,403,{error:'Insufficient permissions'});return true;}
   const data=await readBody();if(!idOk(data?.course_id)||typeof data.title!=='string'||!data.title.trim()||data.title.length>240||typeof(data.body??'')!=='string'||String(data.body??'').length>30000||!Number.isSafeInteger(data.sort_order??0))throw fail(400,'Invalid lesson');
   const r=await writePool.query('INSERT INTO app.training_lessons(course_id,title,body,sort_order) VALUES($1,$2,$3,$4) RETURNING *',[data.course_id,data.title.trim(),data.body??'',data.sort_order??0]);json(res,201,r.rows[0]);return true;
  }
  json(res,405,{error:'Method not allowed'});return true;
 }catch(e){console.error('Training API error',e.code||e.message);json(res,e.status||(e.code==='23503'?422:e.code==='23514'||e.code==='22P02'?400:503),{error:e.status?e.message:e.code==='23503'?'Referenced record not found':e.code==='23514'||e.code==='22P02'?'Invalid training input':'Training service unavailable'});return true;}
}
