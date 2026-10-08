const ADMIN=new Set(['admin','superadmin','manager']);const idOk=v=>/^[1-9]\d{0,15}$/.test(String(v));const fail=(status,message)=>Object.assign(new Error(message),{status});
export async function handleTraining({path,method,user,readBody,pool,writePool,json,res}){
 if(!/^\/api\/training(?:\/|$)/.test(path))return false;
 const admin=ADMIN.has(String(user.role).toLowerCase());
 try{
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
 }catch(e){console.error('Training API error',e.code||e.message);json(res,e.status||(e.code==='23503'?422:503),{error:e.status?e.message:e.code==='23503'?'Referenced record not found':'Training service unavailable'});return true;}
}
