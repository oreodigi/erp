/** Stage-2 helpers for reusable dimensions, multivehicle recommendation and load-plan reporting. */
import {CargoLine,VehicleSpace,PackingResult,optimizeLoad} from './load-planning';
export type VehicleTemplate={id:string;name:string;l:number;w:number;h:number;maxKg:number;source?:'preset'|'fleet'|'custom'};
export const VEHICLE_PRESETS:VehicleTemplate[]=[
 {id:'preset-14ft',name:'14 FT LCV',l:426,w:200,h:200,maxKg:4000,source:'preset'},
 {id:'preset-17ft',name:'17 FT LCV',l:518,w:210,h:215,maxKg:7000,source:'preset'},
 {id:'preset-20ft',name:'20 FT Container',l:610,w:235,h:239,maxKg:10000,source:'preset'},
 {id:'preset-24ft',name:'24 FT Truck',l:731,w:235,h:240,maxKg:16000,source:'preset'},
 {id:'preset-32ft',name:'32 FT Container',l:975,w:235,h:245,maxKg:32000,source:'preset'},
];
export type VehicleRecommendation={vehicle:VehicleTemplate;result:PackingResult;fitsAll:boolean;score:number};
export function recommendVehicles(lines:CargoLine[],vehicles:VehicleTemplate[]):VehicleRecommendation[]{
 const total=lines.reduce((s,l)=>s+Math.max(0,Math.floor(l.qty)),0);
 return vehicles.map(vehicle=>{const result=optimizeLoad(lines,vehicle);const missing=result.unplaced.reduce((s,x)=>s+x.qty,0);const fitsAll=missing===0&&result.cargoCount===total;const score=(fitsAll?0:1000000)+missing*10000+result.volumePct+result.weightPct*.1+(vehicle.l*vehicle.w*vehicle.h)/1e8;return {vehicle,result,fitsAll,score};}).sort((a,b)=>a.score-b.score);
}
export function splitAcrossVehicles(lines:CargoLine[],vehicle:VehicleTemplate,maxVehicles=10){
 const remaining=lines.map(x=>({...x,qty:Math.max(0,Math.floor(x.qty))}));const loads:{vehicleNo:number;result:PackingResult}[]=[];
 for(let n=1;n<=maxVehicles&&remaining.some(x=>x.qty>0);n++){
  const active=remaining.filter(x=>x.qty>0);const result=optimizeLoad(active,vehicle);if(!result.placed.length)break;loads.push({vehicleNo:n,result});
  const used=new Map<string,number>();for(const p of result.placed)used.set(p.lineId,(used.get(p.lineId)||0)+1);
  for(const line of remaining)line.qty=Math.max(0,line.qty-(used.get(line.id)||0));
 }
 return {loads,remaining:remaining.filter(x=>x.qty>0),complete:!remaining.some(x=>x.qty>0)};
}
export function loadPlanReport(plan:any){
 const placed=plan?.placed||[],lines=plan?.lines||[],v=plan?.vehicle||{};const byStop=new Map<number,number>();for(const p of placed)byStop.set(p.stop,(byStop.get(p.stop)||0)+1);
 return {planNo:plan?.planNo||'',name:plan?.name||'',status:plan?.status||'Draft',vehicle:v.name||v.truckId||'Vehicle',dimensions:[v.l,v.w,v.h].join(' × ')+' cm',payload:v.maxKg||0,loadedKg:placed.reduce((s:number,p:any)=>s+Number(p.kg||0),0),packages:placed.length,cargoLines:lines.length,volumePct:Number(plan?.stats?.volumePct||0),weightPct:Number(plan?.stats?.weightPct||0),unplaced:(plan?.unplaced||[]).reduce((s:number,x:any)=>s+Number(x.qty||0),0),stops:[...byStop.entries()].sort((a,b)=>a[0]-b[0])};
}
export function reportHtml(plan:any){
 const r=loadPlanReport(plan);const esc=(x:any)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
 const rows=(plan.lines||[]).map((x:any)=>'<tr><td>'+esc(x.name)+'</td><td>'+x.qty+'</td><td>'+x.l+'×'+x.w+'×'+x.h+'</td><td>'+x.kg+'</td><td>'+x.stop+'</td></tr>').join('');
 return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(r.planNo)+' Load Plan</title><style>body{font:14px Arial;color:#172033;padding:32px}h1{margin:0}small{color:#667085}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}.box{border:1px solid #d8dee9;border-radius:8px;padding:10px}.v{font-size:18px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}footer{margin-top:42px;display:flex;justify-content:space-between}</style></head><body><h1>SMART LOAD PLAN · '+esc(r.planNo)+'</h1><small>'+esc(r.name)+' · '+esc(r.status)+'</small><div class="grid"><div class="box">Vehicle<div class="v">'+esc(r.vehicle)+'</div>'+esc(r.dimensions)+'</div><div class="box">Packages<div class="v">'+r.packages+'</div></div><div class="box">Space<div class="v">'+r.volumePct.toFixed(1)+'%</div></div><div class="box">Payload<div class="v">'+r.loadedKg.toLocaleString('en-IN')+' / '+Number(r.payload).toLocaleString('en-IN')+' kg</div></div></div><h3>Cargo manifest</h3><table><thead><tr><th>Cargo</th><th>Qty</th><th>L×W×H cm</th><th>kg/pc</th><th>Stop</th></tr></thead><tbody>'+rows+'</tbody></table><p><b>Unplaced:</b> '+r.unplaced+' · <b>Stop sequence:</b> '+r.stops.map((x:any)=>'Stop '+x[0]+': '+x[1]).join(' · ')+'</p><footer><span>Loading supervisor __________________</span><span>Operations __________________</span></footer><script>window.onload=()=>window.print()</script></body></html>';
}
