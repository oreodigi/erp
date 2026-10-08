import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'sk-load-'));
try {
 const outfile=join(dir,'engine.mjs');await build({entryPoints:['src/lib/load-planning.ts'],outfile,bundle:true,platform:'node',format:'esm'});
 const {optimizeLoad,validatePlan,validatePlacement}=await import('file://'+outfile);
 const v={id:'v',name:'test',l:300,w:200,h:200,maxKg:500};
 const line=(x={})=>({id:'x',name:'box',qty:1,l:100,w:100,h:100,kg:100,stackable:true,rotate:false,stop:1,...x});
 for(const [name,lines,expected,missing] of [
  ['basic',[line({qty:3})],3,0],['oversize',[line({l:400})],0,1],
  ['overweight',[line({qty:7})],5,2],['nonstack',[line({qty:6,stackable:false})],5,1],
  ['rotation',[line({l:250,w:150,h:90,rotate:true})],1,0],
 ]){const r=optimizeLoad(lines,v);assert.equal(r.placed.length,expected,name+' placed');assert.equal(r.unplaced.reduce((s,x)=>s+x.qty,0),missing,name+' unplaced');assert.deepEqual(validatePlan(r.placed,v),[],name+' validity');console.log('PASS',name);}
 const p=optimizeLoad([line()],v).placed[0];assert(validatePlacement({...p,x:250},[],v).length>0,'bounds');assert(validatePlacement({...p,z:50},[],v).length>0,'support');assert(validatePlacement({...p,id:'collision'},[p],v).length>0,'collision');console.log('PASS independent validation');
 const overflow=optimizeLoad([line({qty:501,kg:1})],{...v,l:10000,w:10000,h:1000,maxKg:10000});assert.equal(overflow.placed.length+overflow.unplaced.reduce((s,x)=>s+x.qty,0),501);console.log('PASS overflow explicitly unplaced');
} finally {await rm(dir,{recursive:true,force:true});}
