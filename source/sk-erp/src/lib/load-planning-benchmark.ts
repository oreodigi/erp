import {CargoLine,VehicleSpace,optimizeLoad} from './load-planning';
export type BenchmarkCase={id:string;name:string;lines:CargoLine[];vehicle:VehicleSpace};
export type BenchmarkResult={caseId:string;name:string;packages:number;placed:number;unplaced:number;volumePct:number;weightPct:number;ms:number};
const line=(id:string,qty:number,l:number,w:number,h:number,kg:number,stop=1):CargoLine=>({id,name:id,qty,l,w,h,kg,stop,stackable:true,rotate:true,maxLayers:6,maxTopKg:1500});
export const BENCHMARK_CASES:BenchmarkCase[]=[
 {id:'mixed-50',name:'Mixed industrial · 50 pcs',vehicle:{id:'v20',name:'20 FT',l:610,w:235,h:239,maxKg:10000},lines:[line('Carton',30,60,45,40,25,1),line('Crate',12,110,80,70,180,2),{...line('Pallet',8,120,100,100,450,3),stackable:false,rotate:false}]},
 {id:'dense-120',name:'Dense cartons · 120 pcs',vehicle:{id:'v24',name:'24 FT',l:731,w:235,h:240,maxKg:16000},lines:[line('A',50,55,40,35,22,1),line('B',40,70,50,45,30,2),line('C',30,90,60,55,42,3)]},
 {id:'heavy-80',name:'Heavy multi-stop · 80 pcs',vehicle:{id:'v32',name:'32 FT',l:975,w:235,h:245,maxKg:32000},lines:[line('S1',30,80,60,55,180,1),line('S2',25,100,75,65,260,2),line('S3',25,120,90,75,340,3)]},
];
export function runInternalBenchmarks(cases=BENCHMARK_CASES):BenchmarkResult[]{
 return cases.map(c=>{const start=performance.now();const r=optimizeLoad(c.lines,c.vehicle);const ms=performance.now()-start;return {caseId:c.id,name:c.name,packages:c.lines.reduce((s,x)=>s+x.qty,0),placed:r.placed.length,unplaced:r.unplaced.reduce((s,x)=>s+x.qty,0),volumePct:r.volumePct,weightPct:r.weightPct,ms};});
}
