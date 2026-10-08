/** Smart Load Planning: deterministic, constraint-checked 3D rectangular packing baseline.
 * Coordinates and dimensions are in centimetres; mass in kilograms.
 * No claim of certified axle/stability/securement analysis. */
export type CargoLine={id:string;name:string;qty:number;l:number;w:number;h:number;kg:number;stackable:boolean;rotate:boolean;stop:number;orderId?:string;maxTopKg?:number;maxLayers?:number};
export type VehicleSpace={id:string;name:string;l:number;w:number;h:number;maxKg:number;truckId?:string};
export type Placement={id:string;lineId:string;name:string;x:number;y:number;z:number;l:number;w:number;h:number;kg:number;stop:number;stackable:boolean;maxTopKg:number;maxLayers:number};
export type PackingResult={placed:Placement[];unplaced:{lineId:string;name:string;qty:number;reason:string}[];volumePct:number;weightPct:number;loadedKg:number;totalKg:number;cargoCount:number;warnings:string[]};
const EPS=1e-6;
const intersects=(a:Placement,b:Placement)=>a.x<b.x+b.l-EPS&&a.x+a.l>b.x+EPS&&a.y<b.y+b.w-EPS&&a.y+a.w>b.y+EPS&&a.z<b.z+b.h-EPS&&a.z+a.h>b.z+EPS;
export function validatePlacement(p:Placement,placed:Placement[],v:VehicleSpace):string[]{
 const errors:string[]=[];
 if([p.x,p.y,p.z,p.l,p.w,p.h,p.kg].some(n=>!Number.isFinite(n)))return ['Invalid coordinates or dimensions'];
 if(p.x<0||p.y<0||p.z<0||p.l<=0||p.w<=0||p.h<=0||p.kg<0)errors.push('Invalid position, dimensions or mass');
 if(p.x+p.l>v.l+EPS||p.y+p.w>v.w+EPS||p.z+p.h>v.h+EPS)errors.push('Outside vehicle bounds');
 if(placed.some(q=>intersects(p,q)))errors.push('Collision with another package');
 if(placed.reduce((s,q)=>s+q.kg,0)+p.kg>v.maxKg+EPS)errors.push('Payload exceeded');
 if(p.z>EPS){
   const below=placed.filter(q=>Math.abs(q.z+q.h-p.z)<EPS&&p.x<q.x+q.l-EPS&&p.x+p.l>q.x+EPS&&p.y<q.y+q.w-EPS&&p.y+p.w>q.y+EPS);
   const support=below.reduce((s,q)=>s+Math.max(0,Math.min(p.x+p.l,q.x+q.l)-Math.max(p.x,q.x))*Math.max(0,Math.min(p.y+p.w,q.y+q.w)-Math.max(p.y,q.y)),0);
   if(support<p.l*p.w*0.99)errors.push('Insufficient support under package');
   if(below.some(q=>!q.stackable))errors.push('Stacking on non-stackable cargo');
   if(below.some(q=>p.kg>q.maxTopKg))errors.push('Top-load weight limit exceeded');
   const layer=1+Math.max(0,...below.map(q=>Math.round(q.z/Math.max(q.h,EPS))+1));
   if(below.some(q=>layer>q.maxLayers))errors.push('Maximum stacking layers exceeded');
 }
 return errors;
}
function orientations(line:CargoLine):[number,number,number][]{
 const a:[number,number,number][]=[[line.l,line.w,line.h]];
 if(line.rotate)a.push([line.w,line.l,line.h],[line.l,line.h,line.w],[line.h,line.l,line.w],[line.w,line.h,line.l],[line.h,line.w,line.l]);
 return a.filter((v,i,all)=>all.findIndex(w=>w.join()===v.join())===i);
}
export function optimizeLoad(lines:CargoLine[],vehicle:VehicleSpace):PackingResult{
 const placed:Placement[]=[],unplaced:{lineId:string;name:string;qty:number;reason:string}[]=[];
 const warnings:string[]=[];
 const count=lines.reduce((s,l)=>s+Math.max(0,Math.floor(l.qty)),0);
 if(count>500)warnings.push('Only the first 500 packages were evaluated; split larger shipments.');
 const jobs=lines.flatMap(line=>Array.from({length:Math.min(Math.max(0,Math.floor(line.qty)),500)},(_,i)=>({line,i}))).slice(0,500);
 // Earlier delivery stops are positioned closer to the rear/door (x=0) where feasible.
 jobs.sort((a,b)=>a.line.stop-b.line.stop||(b.line.l*b.line.w*b.line.h-a.line.l*a.line.w*a.line.h)||(b.line.kg-a.line.kg));
 const fails=new Map<string,{name:string;qty:number;reason:string}>();
 for(const {line,i} of jobs){
  let best:Placement|undefined;let score=Infinity;
  const candidates:[[number,number,number]]|number[][]=[[0,0,0]];
  for(const p of placed){candidates.push([p.x+p.l,p.y,p.z],[p.x,p.y+p.w,p.z],[p.x,p.y,p.z+p.h]);}
  const seen=new Set<string>();
  for(const [x,y,z] of candidates){
   const key=[x,y,z].join(':');if(seen.has(key))continue;seen.add(key);
   for(const [l,w,h] of orientations(line)){
    const p:Placement={id:line.id+'-'+i,lineId:line.id,name:line.name,x,y,z,l,w,h,kg:line.kg,stop:line.stop,stackable:line.stackable,maxTopKg:line.maxTopKg??(line.stackable?100000:0),maxLayers:line.maxLayers??(line.stackable?99:1)};
    if(validatePlacement(p,placed,vehicle).length)continue;
    const s=z*1000000+x*1000+y+Math.max(0,10-line.stop)*0.001;
    if(s<score){best=p;score=s;}
   }
  }
  if(best)placed.push(best);else{
   const cur=fails.get(line.id)||{name:line.name,qty:0,reason:'Insufficient compatible space, support or payload'};
   cur.qty++;fails.set(line.id,cur);
  }
 }
 for(const [lineId,info] of fails)unplaced.push({lineId,...info});
 if(count>500){let remaining=500;for(const line of lines){const q=Math.max(0,Math.floor(line.qty));const evaluated=Math.min(q,Math.max(0,remaining));remaining-=evaluated;if(q>evaluated){const existing=unplaced.find(x=>x.lineId===line.id);if(existing)existing.qty+=q-evaluated;else unplaced.push({lineId:line.id,name:line.name,qty:q-evaluated,reason:'Evaluation limit of 500 packages'});}}warnings.push((count-500)+' packages not evaluated.');}
 const loadedKg=placed.reduce((s,p)=>s+p.kg,0);
 const usedVolume=placed.reduce((s,p)=>s+p.l*p.w*p.h,0);
 const totalKg=lines.reduce((s,l)=>s+l.kg*Math.max(0,Math.floor(l.qty)),0);
 return {placed,unplaced,volumePct:vehicle.l*vehicle.w*vehicle.h?100*usedVolume/(vehicle.l*vehicle.w*vehicle.h):0,weightPct:vehicle.maxKg?100*loadedKg/vehicle.maxKg:0,loadedKg,totalKg,cargoCount:placed.length,warnings};
}
export function validatePlan(items:Placement[],v:VehicleSpace):string[]{
 const errors:string[]=[];
 for(let i=0;i<items.length;i++)for(const e of validatePlacement(items[i],items.filter((_,j)=>j!==i),v))errors.push(items[i].name+' #'+(i+1)+': '+e);
 return errors;
}
