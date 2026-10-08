// Authentication is enforced by the server; never put internal API tokens in browser code.
export type ERPUser={id:string;username:string;role:string};
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
export type AdminAuthUser={id:string;username:string;role:string;active:boolean;created_at:string};
export const fetchAdminUsers=()=>apiJSON<{users:AdminAuthUser[]}>('/api/admin/users');
export const updateAdminUser=(id:string,data:{role?:string;active?:boolean})=>apiJSON<{user:AdminAuthUser}>(`/api/admin/users/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});
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
