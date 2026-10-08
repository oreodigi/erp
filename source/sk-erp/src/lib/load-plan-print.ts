/** Printable 2D projections generated from the validated 3D placement coordinates. */
import {Placement,VehicleSpace} from './load-planning';
const esc=(x:any)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const palette=['#2563eb','#d97706','#059669','#7c3aed','#e11d48','#0891b2'];
export function projectionSvg(items:Placement[],v:VehicleSpace,view:'top'|'side',width=760,height=250){
 const ordered=items.slice().sort((a,b)=>b.stop-a.stop||a.z-b.z||b.x-a.x);const step=new Map(ordered.map((p,i)=>[p.id,i+1]));
 const pad=28,iw=width-pad*2,ih=height-pad*2,maxA=view==='top'?v.l:v.l,maxB=view==='top'?v.w:v.h,s=Math.min(iw/maxA,ih/maxB),ox=pad,oy=height-pad;
 const boxes=items.map((p)=>{const a=p.x,b=view==='top'?p.y:p.z,al=p.l,bl=view==='top'?p.w:p.h,x=ox+a*s,y=oy-(b+bl)*s,w=Math.max(1,al*s),h=Math.max(1,bl*s),fill=palette[(p.stop-1)%palette.length];return '<g><rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+fill+'" fill-opacity=".72" stroke="#172033" stroke-width=".7"/><text x="'+(x+w/2).toFixed(1)+'" y="'+(y+h/2+3).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#fff">'+step.get(p.id)+'</text></g>'}).join('');
 return '<svg viewBox="0 0 '+width+' '+height+'" xmlns="http://www.w3.org/2000/svg"><rect x="'+ox+'" y="'+(oy-maxB*s).toFixed(1)+'" width="'+(maxA*s).toFixed(1)+'" height="'+(maxB*s).toFixed(1)+'" fill="#f8fafc" stroke="#475569" stroke-width="2"/>'+boxes+'<text x="'+pad+'" y="15" font-size="12" font-weight="700" fill="#172033">'+esc(view==='top'?'TOP VIEW · door / rear at left':'SIDE VIEW · door / rear at left')+'</text></svg>';
}
export function instructionRows(items:Placement[]){
 return items.slice().sort((a,b)=>b.stop-a.stop||a.z-b.z||b.x-a.x).map((p,i)=>({no:i+1,name:p.name,stop:p.stop,position:'X '+p.x+' · Y '+p.y+' · Z '+p.z,size:p.l+'×'+p.w+'×'+p.h}));
}
