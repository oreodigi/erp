// Authentication is enforced by the server; never put internal API tokens in browser code.
export type ERPUser={id:string;username:string;role:string;full_name?:string;branch_code?:string;department?:string;designation?:string;extra_permissions?:string[];denied_permissions?:string[];must_change_password?:boolean};
export type ERPCounts={lrs:string;customers:string;branches:string;bills:string;ledger_entries:string};
export type ERPDashboard={source:string;historicalAsOf:string;counts:ERPCounts;recentLrs:unknown[];recentBills:unknown[]};
let accessToken:string|null=null;
let activeUser:ERPUser|null=null;
const TOKEN_KEY='skt-erp-session-token';
export function getERPUser(){return activeUser;}
export function isERPAuthenticated(){return !!accessToken&&!!activeUser;}
export async function loginERP(username:string,password:string):Promise<ERPUser>{
 const res=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),cache:'no-store'});
 if(!res.ok)throw new Error(res.status===401?'Invalid username or password':res.status===429?'Too many attempts. Try later.':'ERP authentication service unavailable');
 const data=await res.json();
 if(!data.token||!data.user)throw new Error('Invalid login response');
 accessToken=data.token;activeUser=data.user;try{sessionStorage.setItem(TOKEN_KEY,accessToken);}catch{}
 return data.user;
}
export async function restoreERP():Promise<ERPUser|null>{
 if(!accessToken){try{accessToken=sessionStorage.getItem(TOKEN_KEY);}catch{accessToken=null;}}
 if(!accessToken)return null;
 const res=await fetch('/auth/me',{headers:{Authorization:'Bearer '+accessToken},cache:'no-store'});
 if(!res.ok){accessToken=null;activeUser=null;try{sessionStorage.removeItem(TOKEN_KEY);}catch{};return null;}
 const data=await res.json();activeUser=data.user;return activeUser;
}
export async function fetchERPDashboard():Promise<ERPDashboard>{
 if(!accessToken)throw new Error('Sign in required');
 const res=await fetch('/api/dashboard',{headers:{Authorization:'Bearer '+accessToken},cache:'no-store'});
 if(!res.ok)throw new Error(res.status===401?'Session expired':'Dashboard API unavailable');
 return res.json();
}
export type ERPAnalytics={monthly:{month:string;lrs:number;freight:number}[];branches:{branch_id:number|null;lrs:number;freight:number}[];ageing:{bucket:string;outstanding:number}[];historicalAsOf:string};
export async function fetchERPAnalytics():Promise<ERPAnalytics>{
 if(!accessToken)throw new Error('Sign in required');
 const res=await fetch('/api/analytics',{headers:{Authorization:'Bearer '+accessToken},cache:'no-store'});
 if(!res.ok)throw new Error('Analytics API unavailable');
 return res.json();
}
export async function logoutERP(){
 const token=accessToken;accessToken=null;activeUser=null;
 try{sessionStorage.removeItem(TOKEN_KEY);}catch{}
 if(token)await fetch('/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store'}).catch(()=>{});
}
export const changeOwnPassword=(current_password:string,new_password:string)=>apiJSON<{ok:boolean}>('/auth/change-password',{method:'POST',body:JSON.stringify({current_password,new_password})});

async function apiJSON<T>(path:string,init:RequestInit={}):Promise<T>{
 if(!accessToken)throw new Error('Sign in required');
 const res=await fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken,...(init.headers||{})},cache:'no-store'});
 if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(res.status===401?'Session expired':data.error||'ERP API request failed');}
 return res.json();
}
export type WorkItem={id:string;title:string;description:string;module:string;status:string;priority:string;assigned_to:string|null;version:string;updated_at:string};
export const listWorkItems=(params='')=>apiJSON<{items:WorkItem[]}>(`/api/work-items${params?`?${params}`:''}`);
export const createWorkItem=(data:Record<string,unknown>)=>apiJSON<WorkItem>('/api/work-items',{method:'POST',body:JSON.stringify(data)});
export const updateWorkItem=(id:string,data:Record<string,unknown>&{version:number})=>apiJSON<WorkItem>(`/api/work-items/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});
export type TrainingCourse={id:string;title:string;description:string};
export type TrainingLesson={id:string;course_id:string;title:string;body:string;sort_order:number};
export const fetchTraining=()=>apiJSON<{courses:TrainingCourse[];lessons:TrainingLesson[];progress:{lesson_id:string;completed_at:string}[]}>('/api/training');
export const setTrainingProgress=(lesson_id:string,completed:boolean)=>apiJSON<{ok:boolean}>('/api/training/progress',{method:'POST',body:JSON.stringify({lesson_id,completed})});
export type ERPState={data:any;version:number;updated_at:string;source:string};
export const fetchERPState=()=>apiJSON<ERPState>('/api/erp/state');
export const saveERPState=(data:any,version:number)=>apiJSON<ERPState>('/api/erp/state',{method:'PUT',body:JSON.stringify({data,version})});
export type AdminTrainingSummary={lessons_completed:number;records:number;last_activity_at:string|null;quizzes_passed:number;best_quiz_avg:number|null};
export type AdminAuthUser={id:string;username:string;role:string;active:boolean;created_at:string;full_name?:string;email?:string;phone?:string;branch_code?:string;department?:string;designation?:string;extra_permissions?:string[];denied_permissions?:string[];last_login_at?:string|null;must_change_password?:boolean;deleted_at?:string|null;updated_at?:string;training?:AdminTrainingSummary};
export type AdminUserInput={username?:string;full_name?:string;role?:string;active?:boolean;branch_code?:string;email?:string;phone?:string;department?:string;designation?:string;extra_permissions?:string[];denied_permissions?:string[];password?:string};
export const fetchAdminUsers=(includeDeleted=false)=>apiJSON<{users:AdminAuthUser[]}>('/api/admin/users'+(includeDeleted?'?include_deleted=1':''));
export const createAdminUser=(data:AdminUserInput)=>apiJSON<{user:AdminAuthUser;temporaryPassword:string}>('/api/admin/users',{method:'POST',body:JSON.stringify(data)});
export const updateAdminUser=(id:string,data:AdminUserInput)=>apiJSON<{user:AdminAuthUser}>(`/api/admin/users/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});
export const deleteAdminUser=(id:string)=>apiJSON<{ok:boolean}>(`/api/admin/users/${encodeURIComponent(id)}`,{method:'DELETE'});
export const resetAdminUserPassword=(id:string,password?:string)=>apiJSON<{user:AdminAuthUser;temporaryPassword:string}>(`/api/admin/users/${encodeURIComponent(id)}/reset-password`,{method:'POST',body:JSON.stringify(password?{password}: {})});
export type DashboardLayoutItem={id:string;span:1|2|3|4};
export const fetchDashboardLayout=()=>apiJSON<{layout:DashboardLayoutItem[]|null;updated_at:string|null}>('/api/dashboard-layout');
export const saveDashboardLayout=(layout:DashboardLayoutItem[])=>apiJSON<{layout:DashboardLayoutItem[];updated_at:string}>('/api/dashboard-layout',{method:'PUT',body:JSON.stringify({layout})});
export type CommunicationUser={id:string;username:string;role:string;active:boolean};
export type CommunicationConversation={id:string;kind:'direct'|'group'|'enquiry';subject:string;closed:boolean;created_by:string;created_at:string;updated_at:string;members:CommunicationUser[];last_message:any};
export type CommunicationMessage={id:string;conversation_id:string;sender_id:string;sender:string;body:string;reference_type:string|null;reference_id:string|null;created_at:string;edited_at:string|null};
export type CommunicationTask={id:string;conversation_id:string;subject:string;kind:string;title:string;description:string;assigned_to:string|null;assigned_username:string|null;created_by:string;creator_username:string;status:string;priority:string;due_at:string|null;version:number;created_at:string;updated_at:string};
export const fetchCommunicationOverview=()=>apiJSON<{conversations:CommunicationConversation[];users:CommunicationUser[];tasks:CommunicationTask[];admin:boolean}>('/api/communication/overview');
export const createCommunicationConversation=(data:{kind:string;subject:string;member_ids:string[]})=>apiJSON<CommunicationConversation>('/api/communication/conversations',{method:'POST',body:JSON.stringify(data)});
export const fetchCommunicationMessages=(id:string,after?:string)=>apiJSON<{messages:CommunicationMessage[]}>(`/api/communication/conversations/${id}/messages${after?`?after=${encodeURIComponent(after)}`:''}`);
export const sendCommunicationMessage=(id:string,data:{body:string;reference_type?:string;reference_id?:string})=>apiJSON<CommunicationMessage>(`/api/communication/conversations/${id}/messages`,{method:'POST',body:JSON.stringify(data)});
export const markCommunicationRead=(id:string)=>apiJSON<{ok:boolean}>(`/api/communication/conversations/${id}/read`,{method:'POST',body:'{}'});
export const createCommunicationTask=(data:Record<string,unknown>)=>apiJSON<CommunicationTask>('/api/communication/tasks',{method:'POST',body:JSON.stringify(data)});
export const updateCommunicationTask=(id:string,data:Record<string,unknown>)=>apiJSON<CommunicationTask>(`/api/communication/tasks/${id}`,{method:'PATCH',body:JSON.stringify(data)});
export const fetchCommunicationAudit=()=>apiJSON<{events:any[]}>('/api/communication/audit');

// ---------------- Training Academy (server-side progress) ----------------
export type TrainingRecordDTO={kind:string;item_id:string;status:string;score:number|null;detail?:any;started_at?:string;completed_at?:string|null;updated_at?:string};
export type QuizSummaryDTO={quiz_id:string;attempts:number;best:number;last:number;passed:boolean;last_at:string;wrong:string[]};
export type ApiError=Error&{status?:number};
async function apiJSONStatus<T>(path:string,init:RequestInit={}):Promise<T>{
 if(!accessToken)throw Object.assign(new Error('Sign in required'),{status:401});
 const res=await fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken,...(init.headers||{})},cache:'no-store'});
 if(!res.ok){const data=await res.json().catch(()=>({}));throw Object.assign(new Error(res.status===401?'Session expired':data.error||'ERP API request failed'),{status:res.status});}
 return res.json();
}
const numify=(x:any)=>x===null||x===undefined?x:Number(x);
const normRecord=(r:any):TrainingRecordDTO=>({...r,score:numify(r.score)});
const normQuiz=(q:any):QuizSummaryDTO=>({...q,attempts:Number(q.attempts||0),best:Number(q.best||0),last:Number(q.last||0),passed:!!q.passed,wrong:q.wrong||[]});
export async function fetchTrainingMe(){const d=await apiJSONStatus<any>('/api/training/me');return {user_id:String(d.user_id),records:(d.records||[]).map(normRecord),quizzes:(d.quizzes||[]).map(normQuiz),settings:d.settings||{}};}
export const saveTrainingRecord=(r:{kind:string;item_id:string;status:string;score?:number|null;detail?:any})=>apiJSONStatus<{record:any}>('/api/training/records',{method:'POST',body:JSON.stringify(r)}).then(d=>normRecord(d.record));
export const resetTrainingKind=(kind:'onboarding'|'tour'|'hint')=>apiJSONStatus<{deleted:number}>('/api/training/reset',{method:'POST',body:JSON.stringify({kind})});
export const saveQuizAttempt=(a:{quiz_id:string;score:number;correct:number;total:number;passed:boolean;wrong:string[];duration_seconds?:number})=>apiJSONStatus<{attempt:any;summary:any}>('/api/training/quiz-attempts',{method:'POST',body:JSON.stringify(a)}).then(d=>({attempt:d.attempt,summary:normQuiz(d.summary)}));
export type TeamMember={id:string;username:string;full_name:string;role:string;branch_code:string;department:string;designation:string;active:boolean;last_login_at:string|null;last_activity_at:string|null;records:TrainingRecordDTO[];quizzes:QuizSummaryDTO[]};
export async function fetchTrainingTeam(){const d=await apiJSONStatus<any>('/api/training/team');return (d.users||[]).map((u:any)=>({...u,id:String(u.id),records:(u.records||[]).map(normRecord),quizzes:(u.quizzes||[]).map(normQuiz)})) as TeamMember[];}
export async function fetchTrainingUser(id:string){const d=await apiJSONStatus<any>(`/api/training/users/${encodeURIComponent(id)}`);return {user:d.user,records:(d.records||[]).map(normRecord),attempts:(d.attempts||[]).map((a:any)=>({...a,score:Number(a.score)}))};}
export const fetchTrainingSettings=()=>apiJSONStatus<{readiness:any}>('/api/training/settings');
export const saveTrainingSettings=(readiness:any)=>apiJSONStatus<{readiness:any;updated_at:string}>('/api/training/settings',{method:'PUT',body:JSON.stringify({readiness})});

export type FeedbackItem={id:string;feedback_no:string;user_id:string;username:string;full_name?:string;role:string;feedback_type:string;impact:string;title:string;description:string;module:string;screen_id:string;route:string;route_params:any;record_type?:string;record_id?:string;record_no?:string;section?:string;mode:string;status:string;points:{id:string;body:string;position:number}[];attachments:any[];comments?:any[];assigned_to?:string;assigned_name?:string;duplicate_of?:string;created_at:string;updated_at:string;resolution:string};
export type FeedbackInput={feedback_type:string;impact:string;title?:string;description?:string;points?:string[];module?:string;screen_id:string;route:string;route_params?:Record<string,unknown>;record_type?:string;record_id?:string;record_no?:string;section?:string;mode:'Company'|'Practice';client_context?:Record<string,unknown>};
export const listFeedback=()=>apiJSONStatus<{items:FeedbackItem[];admin:boolean}>('/api/feedback');
export type FeedbackStats={byModule:{label:string;total:number;open:number;blocking:number}[];byScreen:{label:string;total:number;open:number;confusing:number}[];byRole:{label:string;total:number;open:number}[];byType:{label:string;total:number}[]};
export const fetchFeedbackStats=()=>apiJSONStatus<FeedbackStats>('/api/feedback/stats');
export const createFeedback=(data:FeedbackInput)=>apiJSONStatus<{item:FeedbackItem}>('/api/feedback',{method:'POST',body:JSON.stringify(data)});
export const updateFeedback=(id:string,data:Record<string,unknown>)=>apiJSONStatus<{item:FeedbackItem}>(`/api/feedback/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});
export const commentFeedback=(id:string,body:string,internal=false)=>apiJSONStatus<{comment:any}>(`/api/feedback/${encodeURIComponent(id)}/comments`,{method:'POST',body:JSON.stringify({body,internal})});
const toBase64=(b:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(b)});
export async function uploadFeedbackAttachment(id:string,file:Blob,name:string){return apiJSONStatus<{attachment:any}>(`/api/feedback/${encodeURIComponent(id)}/attachments`,{method:'POST',body:JSON.stringify({name,mime_type:file.type||'application/octet-stream',data:await toBase64(file)})})}
export async function openFeedbackAttachment(id:string){const d=await apiJSONStatus<{name:string;mime_type:string;data:string}>(`/api/feedback/attachments/${encodeURIComponent(id)}`);const raw=atob(d.data),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return {name:d.name,url:URL.createObjectURL(new Blob([a],{type:d.mime_type})),mime_type:d.mime_type}}
