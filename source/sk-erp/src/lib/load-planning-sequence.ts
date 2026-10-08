import {Placement,VehicleSpace,validatePlacement} from './load-planning';
const EPS=1e-6;
/** Door is x=0. A package for an earlier stop must have a clear straight extraction corridor to that door. */
export function accessibilityIssues(items:Placement[],v:VehicleSpace):string[]{
 const out:string[]=[];
 for(const p of items){
  const blockers=items.filter(q=>q.id!==p.id&&q.stop>p.stop&&q.x<p.x+p.l-EPS&&q.x+q.l>EPS&&q.y<p.y+p.w-EPS&&q.y+q.w>p.y+EPS&&q.z<p.z+p.h-EPS&&q.z+q.h>p.z+EPS);
  if(blockers.length)out.push(p.name+' (stop '+p.stop+') is blocked toward rear door by later-stop cargo: '+[...new Set(blockers.map(x=>x.name+' · stop '+x.stop))].join(', '));
 }
 return [...new Set(out)];
}
export function loadingSequence(items:Placement[]){
 return items.slice().sort((a,b)=>b.stop-a.stop||a.z-b.z||b.x-a.x||a.y-b.y).map((p,i)=>({...p,loadStep:i+1,unloadStep:0}));
}
export function unloadingSequence(items:Placement[]){
 return items.slice().sort((a,b)=>a.stop-b.stop||a.x-b.x||b.z-a.z||a.y-b.y).map((p,i)=>({...p,unloadStep:i+1,loadStep:0}));
}
export function rotatePlacement(p:Placement,axis:'floor'|'forward',items:Placement[],v:VehicleSpace){
 const rotated:Placement=axis==='floor'?{...p,l:p.w,w:p.l}:{...p,l:p.h,h:p.l};
 const issues=validatePlacement(rotated,items.filter(x=>x.id!==p.id),v);
 return {placement:rotated,issues};
}
