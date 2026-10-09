// Headless feasibility for the pallet-yard prototype. Definitions follow pallet-proposal.md §2.
// Usage: node scripts/pallet-yard-feasibility.mjs <mode> [shard] [count]
// modes: bench | empty | grid | shots | repro | cosmetic | search | fixtures | report
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import Havok from '@babylonjs/havok';
import {diverterHarness} from '../tests/helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {scoreLine} from '../lib/line-score.js';
import {PALLET_YARD_PALLET,PALLET_YARD_LEVER,buildPalletEvidence,palletEvidenceConsistent,palletYardEventList,palletYardSettledText} from '../lib/pallet-yard.js';

const mode=process.argv[2]??'bench';
const shard=+(process.argv[3]??0);
const count=+(process.argv[4]??1);
const out=process.env.PALLET_OUT??'/opt/cursor/artifacts/pallet-yard';
const lever=process.env.PALLET_LEVER?JSON.parse(process.env.PALLET_LEVER):PALLET_YARD_LEVER;
const geometry={floor:PALLET_YARD_PALLET,switch:lever};
const PARKED={floor:{x:900,y:.5,z:900,width:10,height:.8,depth:8},switch:{x:-900,y:5,z:900,width:2.4,height:3.4,depth:.7}};
const hole=selectOpenLineStation('gate');
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
await mkdir(out,{recursive:true});

const range=(a,b,s)=>{const rows=[];for(let v=a;v<=b+1e-9;v=Math.round((v+s)*10000)/10000)rows.push(v);return rows;};
export const gridG=(origins=[-4,0,4])=>origins.flatMap(originX=>range(-50,50,5).flatMap(yaw=>range(10,60,5).flatMap(elevation=>range(30,100,10).map(power=>({set:'G',originX,yaw,elevation,charge:power/100,railIndex:1})))));
export const gridE=()=>[-4,0,4].flatMap(originX=>range(-35,35,2.5).flatMap(yaw=>range(5,50,2.5).flatMap(elevation=>range(10,90,5).map(power=>({set:'E',originX,yaw,elevation,charge:power/100,railIndex:1})))));
const inFloor=point=>point&&Math.abs(point[0])<=30&&point[2]>=10&&point[2]<=100;
const normTags=tags=>[...new Set(tags.map(tag=>tag.startsWith('switch-')?'switch':tag.startsWith('floor-')?'floor':tag))].sort();
const usefulClaims=claims=>claims.filter(id=>id!=='switch'&&!String(id).includes('pallet-yard-pallet')).sort();
const round=(n,d=2)=>Number.isFinite(n)?+n.toFixed(d):null;

function summarize(result){
 const receipt=scoreLine(result.ledger);
 const first=result.ledger.find(event=>event.kind==='contact');
 return {
  tags:[...new Set(result.tags)].sort(),
  claims:receipt.claimIds.slice().sort(),
  point:result.point?.map(value=>round(value,2))??null,
  end:result.end,
  lever:result.tags.some(tag=>tag.startsWith('switch-'))||result.flips.length>0,
  palletRaw:result.rawSamples.length>0,
  palletTop:result.tags.some(tag=>tag.startsWith('floor-')),
  palletRedirect:result.ledger.some(event=>event.kind==='redirect'&&event.feature==='pallet-yard-pallet'),
  firstSolid:first?.body??null,
  skip:result.tags.includes('boost'),
  bankA:result.tags.includes('bank-a'),
  bankB:result.tags.includes('bank-b'),
 };
}
const pack=summary=>({t:summary.tags.join('|'),c:summary.claims.join('|'),p:summary.point,e:summary.end,lv:summary.lever?1:0,pr:summary.palletRaw?1:0,pt:summary.palletTop?1:0,pq:summary.palletRedirect?1:0,sk:summary.skip?1:0,ba:summary.bankA?1:0,bb:summary.bankB?1:0,f:summary.firstSolid});
const keyOf=shot=>[shot.set,shot.originX,shot.yaw,shot.elevation,shot.charge].join('|');

function openHarness(state,flatB,placed){
 return diverterHarness(hv,state,true,hole,{scoreLab:true,linecraft:true,palletYard:true,flatB,geometry:placed});
}
async function mapShots(shots,flatB,placed,label){
 let harness=openHarness('A',flatB,placed),since=0,n=0;const t0=Date.now();
 const rows=[];
 try{
  for(const shot of shots){
   if(++since>1000){harness.dispose();harness=openHarness('A',flatB,placed);since=0;}
   harness.world.setState('A');
   const a=summarize(harness.shoot(shot));
   harness.world.setState('B');
   const b=summarize(harness.shoot(shot));
   rows.push({...shot,A:pack(a),B:pack(b)});
   if(++n%200===0)console.log(label,'shard',shard,n,'/',shots.length,'s',((Date.now()-t0)/1000).toFixed(0));
  }
 }finally{harness.dispose();}
 return rows;
}

const honest=(a,b)=>{
 const left=a.p,right=b.p;
 const dist=left&&right?Math.hypot(left[0]-right[0],left[1]-right[1],left[2]-right[2]):Infinity;
 return dist>2||normTags((a.t??'').split('|').filter(Boolean)).join('|')!==normTags((b.t??'').split('|').filter(Boolean)).join('|');
};
const useful=(a,b)=>usefulClaims((a.c??'').split('|').filter(Boolean)).join('|')!==usefulClaims((b.c??'').split('|').filter(Boolean)).join('|');

if(mode==='bench'){
 const harness=openHarness('A',false,geometry);
 const t0=Date.now();
 const result=summarize(harness.shoot({railIndex:1,originX:0,yaw:0,elevation:25,charge:.6}));
 harness.dispose();
 console.log(JSON.stringify({ms:Date.now()-t0,result}));
}
else if(mode==='empty'){
 const shots=gridE().filter((_,index)=>index%count===shard);
 let harness=openHarness('A',false,PARKED),since=0;const t0=Date.now();const rows=[];
 try{
  for(const shot of shots){
   if(++since>1500){harness.dispose();harness=openHarness('A',false,PARKED);since=0;}
   harness.world.setState('A');
   const summary=summarize(harness.shoot(shot));
   const delivered=inFloor(summary.point)||summary.tags.some(tag=>tag.startsWith('bank'));
   if(delivered)rows.push({...shot,base:pack(summary)});
   if(rows.length%500===0)console.log('empty',shard,rows.length,'seen',since,'s',((Date.now()-t0)/1000).toFixed(0));
  }
 }finally{harness.dispose();}
 await writeFile(`${out}/empty.${shard}.json`,JSON.stringify({rows}));
 console.log('empty shard',shard,'delivered',rows.length,'of',shots.length);
}
else if(mode==='grid'){
 const shots=gridG().filter((_,index)=>index%count===shard);
 const rows=await mapShots(shots,false,geometry,'grid');
 await writeFile(`${out}/grid.${shard}.json`,JSON.stringify({rows}));
 console.log('grid shard',shard,rows.length);
}
else if(mode==='shots'){
 const file=process.argv[5];
 const source=JSON.parse(await readFile(file,'utf8'));
 const shots=(source.rows??source).filter((_,index)=>index%count===shard);
 const rows=await mapShots(shots,false,geometry,'shots');
 await writeFile(`${out}/shots.${shard}.json`,JSON.stringify({rows}));
 console.log('shots shard',shard,rows.length);
}
else if(mode==='repro'||mode==='cosmetic'){
 const flatB=mode==='cosmetic';
 const envelope=JSON.parse(await readFile(`${out}/envelope.json`,'utf8')).rows.filter(row=>row.set==='E');
 const sample=envelope.filter((_,index)=>index%Math.max(1,Math.floor(envelope.length/300))===0).slice(0,300);
 const same=(left,right)=>JSON.stringify(left.p)===JSON.stringify(right.p)&&normTags(left.t.split('|').filter(Boolean)).join('|')===normTags(right.t.split('|').filter(Boolean)).join('|')&&left.c===right.c&&(flatB||left.e===right.e);
 let harness=openHarness('A',flatB,geometry);let matched=0;const examples=[];
 try{
  for(const row of sample){
   const shot={railIndex:1,originX:row.originX,yaw:row.yaw,elevation:row.elevation,charge:row.charge};
   harness.world.setState('A');const a1=pack(summarize(harness.shoot(shot)));
   harness.world.setState('B');const b1=pack(summarize(harness.shoot(shot)));
   harness.dispose();harness=openHarness('B',flatB,geometry);
   harness.world.setState('B');const b2=pack(summarize(harness.shoot(shot)));
   harness.world.setState('A');const a2=pack(summarize(harness.shoot(shot)));
   const ok=same(a1,a2)&&same(b1,b2)&&(flatB?same(a1,b1):true);
   if(ok)matched++;else if(examples.length<5)examples.push({shot,a1,b1,a2,b2});
  }
 }finally{harness.dispose();}
 const report={mode,matched,total:sample.length,flatB,examples};
 await writeFile(`${out}/${mode}.json`,JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
}
else if(mode==='search'){
 const mz=5;const starts=[];
 for(const originX of [-4,0,4])for(const offset of [-6,-3,0,3,6])for(const elevation of [15,30]){
  const bearing=Math.atan2(lever.x-originX,lever.z-mz)*180/Math.PI;
  starts.push({originX,bearing,yaw:bearing+offset,elevation,power:50});
 }
 let harness=openHarness('A',false,geometry);const runs=[];
 const shoot=(shot,state)=>{harness.world.setState(state);const marks=[];let previous=null;const result=harness.shoot(shot,{onStep:position=>{if(!previous||position.z-previous.z>1.5){marks.push({x:position.x,y:position.y,z:position.z});previous={x:position.x,y:position.y,z:position.z};}}});return {summary:summarize(result),marks};};
 try{
  for(const start of starts){
   let yaw=start.yaw,elevation=start.elevation,power=start.power;
   let low=10,high=90;const trace=[];let flippedAt=null;
   for(let n=1;n<=12;n++){
    const shot={railIndex:1,originX:start.originX,yaw:+yaw.toFixed(2),elevation:+elevation.toFixed(2),charge:power/100};
    const {summary,marks}=shoot(shot,'A'); // marks are positions the player can see after the shot
    const nearest=marks.reduce((best,mark)=>!best||Math.abs(mark.z-lever.z)<Math.abs(best.z-lever.z)?mark:best,null);
    trace.push({n,yaw:shot.yaw,elevation:shot.elevation,power,lever:summary.lever,z:summary.point?.[2]??null,x:nearest?round(nearest.x,1):null});
    if(summary.lever){flippedAt=n;break;}
    const short=!nearest||nearest.z<lever.z-2;
    const dx=nearest?nearest.x-lever.x:0;
    if(Math.abs(dx)>1.2){
     const correction=Math.max(-3,Math.min(3,Math.atan2(-dx,Math.max(8,lever.z-mz))*180/Math.PI));
     yaw=Math.max(start.bearing-6,Math.min(start.bearing+6,yaw+correction));
    }
    if(short){low=power;power=Math.min(90,Math.round((power+high)/2));if(power===low)power=Math.min(90,power+5);}
    else {high=power;power=Math.max(10,Math.round((power+low)/2));if(power===high)power=Math.max(10,power-5);}
    if(nearest&&nearest.y>4.2)elevation=Math.max(5,elevation-2.5);
    else if(nearest&&nearest.y<0.4&&!short)elevation=Math.min(50,elevation+2.5);
   }
   runs.push({originX:start.originX,offset:+(start.yaw-start.bearing).toFixed(1),startElevation:start.elevation,flippedAt,trace});
 }
 }finally{harness.dispose();}
 const flipped=runs.filter(run=>run.flippedAt!=null);
 const within=limit=>runs.filter(run=>run.flippedAt!=null&&run.flippedAt<=limit).length/runs.length;
 const ordered=flipped.map(run=>run.flippedAt).sort((a,b)=>a-b);
 const report={runs:runs.length,flipped:flipped.length,median:ordered.length?ordered[Math.floor((ordered.length-1)/2)]:null,p4:+within(4).toFixed(3),p8:+within(8).toFixed(3),byOrigin:[-4,0,4].map(origin=>({origin,n:runs.filter(run=>run.originX===origin).length,p8:+(runs.filter(run=>run.originX===origin&&run.flippedAt!=null&&run.flippedAt<=8).length/runs.filter(run=>run.originX===origin).length).toFixed(3)}))};
 await writeFile(`${out}/search.json`,JSON.stringify({report,runs},null,1));
 console.log(JSON.stringify(report));
}
else if(mode==='fixtures'){
 const seeds=[];
 for(const state of ['A','B'])for(const originX of [-4,0,4])for(const yaw of range(-8,12,2))for(const elevation of [12,18,24,32,40])for(const power of [40,55,70,85])
  seeds.push({state,shot:{railIndex:1,originX,yaw,elevation,charge:power/100}});
 for(const originX of [-4,0,4])for(const yaw of range(18,40,1))for(const elevation of [10,16,22,30,40])for(const power of [35,50,65,80])
  seeds.push({state:'A',shot:{railIndex:1,originX,yaw,elevation,charge:power/100},lever:true});
 const want={top:null,under:null,graze:null,clip:null,flipPallet:null,flipOnly:null};
 let harness=openHarness('A',false,geometry),since=0;
 const describe=(result,state)=>{
  const face=result.rawSamples[0]?.face??null;
  const redirect=result.ledger.some(event=>event.kind==='redirect'&&event.feature==='pallet-yard-pallet');
  const rejected=result.ledger.some(event=>event.kind==='rejected'&&event.feature==='pallet-yard-pallet');
  const deck=result.rawSamples.some(sample=>Math.abs(sample.local.y-0.4)<.16);
  return {face,redirect,rejected,deck,flipped:result.flips.length>0,touched:result.rawSamples.length>0,end:result.end,stateAtContact:result.rawSamples.at(-1)?.stateAtContact??null};
 };
 try{
  for(const seed of seeds){
   if(++since>800){harness.dispose();harness=openHarness('A',false,geometry);since=0;}
   harness.world.setState(seed.state);
   const result=harness.shoot(seed.shot);
   const fact=describe(result,seed.state);
   const events=palletYardEventList(result.ledger);
   const settled=palletYardSettledText(events,result.ledger.findLast(event=>event.kind==='termination')?.reason);
   const record=buildPalletEvidence({stateAtLaunch:result.start,stateAtEnd:result.end,flips:result.flips,rawSamples:result.rawSamples,ledger:result.ledger,displaySettled:settled,displayLive:events.map(event=>({text:event.text,atStep:event.atStep??0})),addressChip:result.start==='B'?'PALLET B':'PALLET A',setupRelation:'fresh',setup:seed.shot,build:'fixture'});
   const keep=name=>{if(!want[name])want[name]={name,shot:seed.shot,state:seed.state,fact,errors:palletEvidenceConsistent(record)};};
   if(!want.top&&fact.redirect&&fact.face==='top'&&fact.deck)keep('top');
   if(!want.under&&fact.redirect&&(fact.face==='underside'||fact.face==='end-x-'||fact.face==='end-x+')&&!fact.deck)keep('under');
   if(!want.graze&&!fact.redirect&&fact.rejected&&fact.deck)keep('graze');
   if(!want.clip&&!fact.redirect&&fact.rejected&&!fact.deck&&(fact.face==='end-x-'||fact.face==='end-x+'||fact.face==='edge'))keep('clip');
   if(!want.flipPallet&&fact.flipped&&fact.touched&&fact.stateAtContact&&fact.stateAtContact!==seed.state)keep('flipPallet');
   if(!want.flipOnly&&fact.flipped&&!fact.touched)keep('flipOnly');
   if(Object.values(want).every(Boolean))break;
  }
 }finally{harness.dispose();}
 await writeFile(`${out}/fixtures.json`,JSON.stringify(want,null,1));
 console.log(JSON.stringify(Object.fromEntries(Object.entries(want).map(([name,row])=>[name,row?{state:row.state,shot:row.shot,fact:row.fact,errors:row.errors}:null]))));
}
else if(mode==='report'){
 const read=async file=>existsSync(file)?JSON.parse(await readFile(file,'utf8')):null;
 const grids=[];for(let i=0;i<count;i++){const part=await read(`${out}/grid.${i}.json`);if(part)grids.push(...part.rows);}
 const shots=[];for(let i=0;i<count;i++){const part=await read(`${out}/shots.${i}.json`);if(part)shots.push(...part.rows);}
 const empty=[];for(let i=0;i<count;i++){const part=await read(`${out}/empty.${i}.json`);if(part)empty.push(...part.rows);}
 const rate=(rows,pick)=>rows.length?rows.filter(pick).length/rows.length:null;
 const countOf=(rows,pick)=>rows.filter(pick).length;
 const central=rows=>rows.filter(row=>Math.abs(row.yaw)<=10);
 const lever=side=>row=>row[side].lv===1;
 const line=(rows,label)=>{
  const both=[...rows.map(row=>row.A),...rows.map(row=>row.B)];
  return {label,n:rows.length,leverA:round(rate(rows,lever('A')),3),leverB:round(rate(rows,lever('B')),3),leverEither:round(rate(rows,row=>row.A.lv||row.B.lv),3)};
 };
 const gRows=grids.filter(row=>row.set==='G');
 const g0=gRows.filter(row=>row.originX===0);
 const eRows=shots.length?shots:gRows.filter(row=>row.set==='E');
 const touched=eRows.filter(row=>row.A.pr||row.B.pr);
 const report={
  geometry:{pallet:PALLET_YARD_PALLET,lever},
  counts:{grid:gRows.length,g0:g0.length,envelope:eRows.length,empty:empty.length,central:central(eRows).length},
  G1:{gridCentral:line(central(gRows),'G central'),g0:line(g0,'G0'),envelope:line(eRows,'E'),central:line(central(eRows),'C')},
  G2:{
   bankA:{base:countOf(empty,row=>row.base.ba),A:countOf(eRows,row=>row.A.ba),B:countOf(eRows,row=>row.B.ba)},
   bankB:{base:countOf(empty,row=>row.base.bb),A:countOf(eRows,row=>row.A.ba?false:row.A.bb),B:countOf(eRows,row=>row.B.bb)},
   skipNoPallet:{base:countOf(empty,row=>row.base.sk),A:countOf(eRows,row=>row.A.sk&&!row.A.pr),B:countOf(eRows,row=>row.B.sk&&!row.B.pr)},
  },
  G3:{
   touched:touched.length,
   honest:countOf(touched,row=>honest(row.A,row.B)),
   useful:countOf(touched,row=>useful(row.A,row.B)),
   examples:touched.filter(row=>useful(row.A,row.B)).slice(0,8).map(row=>({originX:row.originX,yaw:row.yaw,elevation:row.elevation,charge:row.charge,A:row.A,B:row.B})),
  },
 };
 // Bank B line above double-counts carelessly. Recompute plainly.
 report.G2.bankB={base:countOf(empty,row=>row.base.bb),A:countOf(eRows,row=>row.A.bb),B:countOf(eRows,row=>row.B.bb)};
 report.G2.bankA={base:countOf(empty,row=>row.base.ba),A:countOf(eRows,row=>row.A.ba),B:countOf(eRows,row=>row.B.ba)};
 const search=await read(`${out}/search.json`);
 const repro=await read(`${out}/repro.json`);
 const cosmetic=await read(`${out}/cosmetic.json`);
 const fixtures=await read(`${out}/fixtures.json`);
 report.G4=repro;report.G3.cosmetic=cosmetic;report.G6=search?.report??null;report.G5=fixtures?Object.fromEntries(Object.entries(fixtures).map(([name,row])=>[name,row?{ok:row.errors?.length===0,fact:row.fact,shot:row.shot,state:row.state}:null])):null;
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,1));
 console.log(JSON.stringify(report,null,1));
}
else throw Error('unknown mode '+mode);
