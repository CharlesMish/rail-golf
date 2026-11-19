import { readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { createRangeHarness } from '../range/run.mjs';
import { adaptRangePreset } from '../../lib/worldcraft-range.js';
import { overpassPreset } from './spatial-layout.mjs';
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const preset=overpassPreset(), world=adaptRangePreset(preset).world,h=createRangeHarness(havok,world,'0b151c5c94849b78ccda6c41a1755b66471e3fa2');
const rows=[];
for(let elevation=8;elevation<=55;elevation+=1)for(let c=25;c<=100;c+=2){
  const setup={railIndex:1,originX:0,yaw:-1,elevation,charge:c/100};
  const r=h.shoot(world,setup),contacts=r.contacts.filter(c=>c.body.startsWith('worldcraft-object'));
  if(contacts.length)rows.push({setup,contacts,events:r.evidence.filter(e=>e.kind==='redirect'),terminal:r.terminal,samples:r.samples});
}
h.dispose();
const output = process.argv[2];
if (output) await writeFile(output, JSON.stringify(rows));
const families=new Map();for(const r of rows){let f=r.contacts.map(c=>c.body.replace('worldcraft-object-','')).join('>'); if(!families.has(f))families.set(f,[]);families.get(f).push(r);}
console.log([...families].map(([family,rs])=>({family,n:rs.length,setup:rs[Math.floor(rs.length/2)].setup,contacts:rs[Math.floor(rs.length/2)].contacts,terminal:rs[Math.floor(rs.length/2)].terminal})).sort((a,b)=>b.n-a.n));
