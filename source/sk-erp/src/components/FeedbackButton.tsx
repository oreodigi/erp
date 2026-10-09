import React,{useEffect,useRef,useState} from 'react';
import {FileUp,MessageSquarePlus,Mic,Paperclip,Plus,RefreshCw,Trash2,X} from 'lucide-react';
import {commentFeedback,createFeedback,getERPUser,listFeedback,openFeedbackAttachment,updateFeedback,uploadFeedbackAttachment,type FeedbackItem} from '../lib/api';
import {useStore,useUI} from '../store/store';
import {SCREEN_BY_ID} from '../training/registry';

const TYPES=['Bug','Improvement','Missing Feature','Confusing','Data Issue','Training/Help Issue','Other'];
const IMPACT=['Low','Medium','High','Blocking'];
const STATUSES=['New','Reviewing','Accepted','Planned','In Development','Ready for Testing','Fixed','Verified','Closed','Duplicate','Not Planned','Need More Information'];
const ACCEPT='image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
const size=n=>n<1048576?Math.ceil(n/1024)+' KB':(n/1048576).toFixed(1)+' MB';

export function FeedbackButton(){
 const route=useUI(s=>s.route),params=useUI(s=>s.params),source=useStore(s=>s.source),sc=SCREEN_BY_ID.get(route);
 const [open,setOpen]=useState(false),[tab,setTab]=useState<'give'|'mine'|'review'>('give'),[type,setType]=useState('Improvement'),[impact,setImpact]=useState('Medium'),[text,setText]=useState(''),[points,setPoints]=useState<string[]>(['']),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[section,setSection]=useState(''),[sections,setSections]=useState<string[]>([]);
 const [recording,setRecording]=useState(false),[audio,setAudio]=useState<Blob|null>(null),[items,setItems]=useState<FeedbackItem[]>([]),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(false),[reply,setReply]=useState<Record<string,string>>({});
 const rec=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]);
 const load=async()=>{setLoading(true);try{const d=await listFeedback();setItems(d.items);setAdmin(d.admin)}catch(e:any){setMsg(e.message)}finally{setLoading(false)}};
 useEffect(()=>{if(open){void load();const found=Array.from(document.querySelectorAll('main section[aria-label],main [data-tour]')).map((e:any)=>String(e.getAttribute('aria-label')||e.getAttribute('data-tour')||'').trim()).filter(Boolean);setSections(Array.from(new Set(found)).slice(0,30));}},[open,tab,route]);
 const reset=()=>{setText('');setPoints(['']);setFiles([]);setAudio(null);setMsg('');setType('Improvement');setImpact('Medium');setSection('')};
 const submit=async()=>{
  setBusy(true);setMsg('');
  try{
   const recordNo=String((params as any)?.lrNo||(params as any)?.billNo||(params as any)?.orderNo||(params as any)?.planNo||'');
   const fallback=audio||files.length?'Attachment/voice feedback':'';
   const d=await createFeedback({feedback_type:type,impact,description:text.trim()||fallback,points:points.filter(x=>x.trim()),module:sc?.module||route.split('/')[0]||'',screen_id:route,route,route_params:params||{},record_no:recordNo||undefined,section:section||undefined,mode:source==='legacy'?'Company':'Practice',client_context:{viewport:[innerWidth,innerHeight],platform:navigator.platform,userAgent:navigator.userAgent.slice(0,300)}});
   for(const f of files)await uploadFeedbackAttachment(d.item.id,f,f.name);
   if(audio)await uploadFeedbackAttachment(d.item.id,audio,'voice-'+Date.now()+'.webm');
   setMsg('Feedback '+(d.item.feedback_no||'')+' submitted successfully.');reset();await load();setTab('mine');
  }catch(e:any){setMsg(e.message||'Could not save feedback')}finally{setBusy(false)}
 };
 const start=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks.current=[];const m=new MediaRecorder(stream);rec.current=m;m.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};m.onstop=()=>{setAudio(new Blob(chunks.current,{type:m.mimeType||'audio/webm'}));stream.getTracks().forEach(t=>t.stop())};m.start();setRecording(true)}catch{setMsg('Microphone permission is required to record voice.')}};
 const stop=()=>{rec.current?.stop();setRecording(false)};
 useEffect(()=>()=>{if(rec.current?.state==='recording')rec.current.stop()},[]);
 const addFiles=(incoming:FileList|null)=>{const next=[...files,...Array.from(incoming||[])].slice(0,6);const bad=next.find(f=>f.size>12*1024*1024);if(bad){setMsg(bad.name+' is larger than 12 MB.');return}setFiles(next);setMsg('')};
 const openFile=async(id:string)=>{try{const a=await openFeedbackAttachment(id);window.open(a.url,'_blank','noopener')}catch(e:any){setMsg(e.message)}};
 const changeStatus=async(i:FeedbackItem,status:string)=>{try{await updateFeedback(i.id,{status});await load()}catch(e:any){setMsg(e.message)}};
 const sendReply=async(i:FeedbackItem)=>{const body=(reply[i.id]||'').trim();if(!body)return;try{await commentFeedback(i.id,body,false);setReply(x=>({...x,[i.id]:''}));await load()}catch(e:any){setMsg(e.message)}};
 const verify=async(i:FeedbackItem,ok:boolean)=>{try{await updateFeedback(i.id,{status:ok?'Verified':'Need More Information'});if(!ok)await commentFeedback(i.id,'Submitter requested another review after testing the fix.',false);await load()}catch(e:any){setMsg(e.message)}};
 const shown=tab==='review'?items:items.filter(i=>String(i.user_id)===String(getERPUser()?.id));
 return <><button onClick={()=>{setOpen(true);setTab('give')}} className="fixed z-40 right-4 lg:right-6 bottom-[76px] lg:bottom-5 h-11 px-3.5 rounded-xl bg-surface border border-line shadow-lg flex items-center gap-2 text-[12.5px] font-semibold hover:border-brand/50" aria-label="Give feedback"><MessageSquarePlus size={17} className="text-brand"/><span className="hidden sm:inline">Give feedback</span></button>
 {open&&<div className="fixed inset-0 z-[80]"><div className="absolute inset-0 bg-black/45" onClick={()=>setOpen(false)}/><div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-surface shadow-2xl flex flex-col">
  <div className="p-4 border-b border-line flex items-start gap-3"><div className="flex-1"><div className="eyebrow">ERP review system</div><h2 className="text-lg font-bold mt-0.5">Feedback & Review</h2><p className="text-[12px] text-muted mt-1">{sc?.title||route} · {source==='legacy'?'Company':'Practice'} mode</p></div><button className="btn-icon" onClick={()=>setOpen(false)}><X size={18}/></button></div>
  <div className="px-4 pt-3 flex gap-2 border-b border-line"><button className={tab==='give'?'tab active':'tab'} onClick={()=>setTab('give')}>Give feedback</button><button className={tab==='mine'?'tab active':'tab'} onClick={()=>setTab('mine')}>My feedback</button>{admin&&<button className={tab==='review'?'tab active':'tab'} onClick={()=>setTab('review')}>Review inbox</button>}</div>
  <div className="p-4 sm:p-5 overflow-y-auto flex-1">
  {tab==='give'?<div className="space-y-4">
   <div className="grid grid-cols-2 gap-3"><label className="text-[12px] font-semibold">Type<select className="input mt-1 w-full" value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-[12px] font-semibold">Impact<select className="input mt-1 w-full" value={impact} onChange={e=>setImpact(e.target.value)}>{IMPACT.map(x=><option key={x}>{x}</option>)}</select></label></div>
   {!!sections.length&&<label className="block text-[12px] font-semibold">Page section <span className="text-muted font-normal">(optional)</span><select className="input mt-1 w-full" value={section} onChange={e=>setSection(e.target.value)}><option value="">Whole screen</option>{sections.map(x=><option key={x} value={x}>{x}</option>)}</select></label>}
   <label className="block text-[12px] font-semibold">What should we know?<textarea className="input mt-1 w-full min-h-28 resize-y" placeholder="Describe the issue, confusion or improvement…" value={text} onChange={e=>setText(e.target.value)}/></label>
   <div><div className="text-[12px] font-semibold mb-2">Points</div>{points.map((p,i)=><div className="flex gap-2 mb-2" key={i}><input className="input flex-1" placeholder={'Point '+(i+1)} value={p} onChange={e=>setPoints(a=>a.map((x,j)=>j===i?e.target.value:x))}/>{points.length>1&&<button className="btn-icon" onClick={()=>setPoints(a=>a.filter((_,j)=>j!==i))}><Trash2 size={15}/></button>}</div>)}<button className="btn-ghost h-9" onClick={()=>setPoints(a=>[...a,''])}><Plus size={14}/> Add point</button></div>
   <div className="grid sm:grid-cols-2 gap-3">
    <div className="card p-3"><div className="text-[12px] font-semibold mb-2">Voice feedback</div>{!recording?<button className="btn-ghost h-10" onClick={start}><Mic size={16}/>{audio?'Record again':'Record voice'}</button>:<button className="btn-primary h-10" onClick={stop}>Stop recording</button>}{audio&&<><audio className="w-full mt-3" controls src={URL.createObjectURL(audio)}/><button className="link text-[11px] mt-1" onClick={()=>setAudio(null)}>Remove recording</button></>}</div>
    <div className="card p-3"><div className="text-[12px] font-semibold mb-2">Images & documents</div><label className="btn-ghost h-10 cursor-pointer"><FileUp size={16}/>Choose files<input className="hidden" type="file" multiple accept={ACCEPT} onChange={e=>addFiles(e.target.files)}/></label><p className="text-[10.5px] text-muted mt-2">Up to 6 files, 12 MB each. Images, PDF, Word, Excel, TXT/CSV.</p></div>
   </div>
   {!!files.length&&<div className="space-y-1">{files.map((f,i)=><div key={i} className="flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2 text-[12px]"><Paperclip size={14}/><span className="flex-1 truncate">{f.name}</span><span className="text-muted">{size(f.size)}</span><button onClick={()=>setFiles(a=>a.filter((_,j)=>j!==i))}><X size={14}/></button></div>)}</div>}
   <div className="rounded-lg bg-surface2 p-3 text-[11.5px] text-muted">Automatically attached: screen <b>{route}</b>, current route parameters, mode, viewport and device/browser context.</div>
   {msg&&<div className="text-[12.5px] font-semibold">{msg}</div>}
  </div>:<div>
   <div className="flex items-center mb-3"><div className="font-semibold">{tab==='review'?'All user feedback':'Submitted feedback'}</div><button className="btn-ghost h-8 ml-auto" onClick={()=>void load()}><RefreshCw size={13}/>{loading?'Loading…':'Refresh'}</button></div>
   <div className="space-y-2">{shown.length===0&&!loading&&<div className="card p-5 text-sm text-muted">No feedback yet.</div>}{shown.map(i=><div key={i.id} className="card p-3"><div className="flex flex-wrap gap-2 items-center"><b className="text-[13px]">{i.feedback_no}</b><span className="chip">{i.feedback_type}</span><span className="chip">{i.impact}</span><span className="chip">{i.status}</span><span className="text-[11px] text-muted ml-auto">{new Date(i.created_at).toLocaleString()}</span></div><div className="text-[12px] text-muted mt-1">{i.screen_id} · {i.mode}{tab==='review'&&<> · {i.full_name||i.username} ({i.role})</>}</div>{i.description&&<p className="text-[13px] mt-2 whitespace-pre-wrap">{i.description}</p>}{i.points?.map(p=><div className="text-[12px] mt-1" key={p.id}>• {p.body}</div>)}{i.resolution&&<div className="mt-2 rounded-lg bg-surface2 p-2.5 text-[12px]"><b>Resolution:</b> {i.resolution}</div>}{!!i.comments?.length&&<div className="mt-2 space-y-1">{i.comments.map((c:any)=><div key={c.id} className="text-[11.5px] rounded-md bg-surface2 px-2.5 py-2"><b>{c.full_name||c.username}:</b> {c.body}</div>)}</div>}{tab==='mine'&&<div className="mt-2 flex gap-2"><input className="input h-9 flex-1" placeholder="Reply or add clarification…" value={reply[i.id]||''} onChange={e=>setReply(x=>({...x,[i.id]:e.target.value}))}/><button className="btn-ghost h-9" disabled={!reply[i.id]?.trim()} onClick={()=>void sendReply(i)}>Reply</button></div>}{tab==='mine'&&i.status==='Fixed'&&<div className="mt-2 rounded-lg border border-line p-2.5"><div className="text-[11.5px] font-semibold mb-2">The team marked this fixed. Please verify it.</div><div className="flex gap-2"><button className="btn-primary h-8" onClick={()=>void verify(i,true)}>Verified</button><button className="btn-ghost h-8" onClick={()=>void verify(i,false)}>Still needs work</button></div></div>}{!!i.attachments?.length&&<div className="flex flex-wrap gap-1 mt-2">{i.attachments.map((a:any)=><button className="btn-ghost h-8" key={a.id} onClick={()=>void openFile(a.id)}><Paperclip size={12}/>{a.name}</button>)}</div>}{tab==='review'&&<div className="mt-3"><select className="input h-9 text-[12px]" value={i.status} onChange={e=>void changeStatus(i,e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>}</div>)}</div>
   {msg&&<div className="text-[12.5px] font-semibold mt-3">{msg}</div>}
  </div>}
  </div>
  {tab==='give'&&<div className="p-4 border-t border-line flex gap-2"><button className="btn-ghost h-10" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary h-10 ml-auto" disabled={busy||(!text.trim()&&!points.some(x=>x.trim())&&!files.length&&!audio)} onClick={submit}>{busy?'Submitting…':'Submit feedback'}</button></div>}
 </div></div>}</>
}
