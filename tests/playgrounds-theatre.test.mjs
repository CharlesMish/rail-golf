import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shoot,havok} from '../scripts/playgrounds/theatre-harness.mjs';
import {createTheatreRuntime,theatreProject,theatreSampleAt,THEATRE_PARTS,theatreCorners,theatreHull} from '../lib/playgrounds-theatre.js';
import {createTheatreShelf,validTheatreEntry,validTheatreRecord,THEATRE_SHELF_KEY} from '../lib/playgrounds-theatre-records.js';
const evidence=JSON.parse(await readFile(new URL('../docs/experiments/playgrounds/theatre-evidence.json',import.meta.url),'utf8'));
const storage=(initial=null)=>{let raw=initial;return {getItem:key=>key===THEATRE_SHELF_KEY?raw:null,setItem:(key,value)=>{assert.equal(key,THEATRE_SHELF_KEY);raw=value;},raw:()=>raw};};

test('Theatre actual accepted-runtime fixtures retain broad-side, top and negative contacts',()=>{
 for(const name of ['open','side','rostrum','over','corner']){const expected=evidence.results[name],actual=shoot(expected.setup).record;assert.equal(JSON.stringify(actual),JSON.stringify(expected.record));assert.ok(validTheatreRecord(actual));assert.equal(actual.reason,'first-ground-contact');}
 const side=evidence.results.side.record.impacts.filter(i=>!i.ground);assert.ok(side[0].incoming[0]>0);assert.ok(side.at(-1).outgoing[0]<0);assert.ok(side.at(-1).outgoing[2]>0);assert.equal(side[0].normal[2],0);
 const top=evidence.results.rostrum.record.impacts.filter(i=>!i.ground);assert.ok(top[0].incoming[1]<0);assert.ok(top.at(-1).outgoing[1]>0);assert.ok(Math.abs(top[0].normal[1])>.9);
 assert.ok(evidence.results.corner.record.impacts[0].normal[2]>.8);
 assert.deepEqual(evidence.results.over.record.contacts.map(c=>c.body),['theatre-ground']);
});
test('Orthographic projections share exact source coordinates; time selects an actual sample',()=>{
 const path=evidence.results.rostrum.record.path;for(const p of path){assert.deepEqual(theatreProject(p.slice(1),'front'),[p[1],p[2]]);assert.deepEqual(theatreProject(p.slice(1),'wing'),[p[3],p[2]]);}
 const p=path[20],q=path[21];assert.deepEqual(theatreSampleAt(path,(p[0]+q[0])/2),p);assert.deepEqual(theatreSampleAt(path,100),path.at(-1));assert.equal(theatreSampleAt([],1),null);
 for(const part of THEATRE_PARTS){assert.equal(theatreCorners(part).length,8);assert.ok(theatreHull(theatreCorners(part).map(p=>theatreProject(p,'plan'))).length>=4);}
});
test('Completed records stop at first ground and preserve distinct start/end provenance',()=>{
 const r=evidence.results.side.record;assert.equal(r.path.at(-1)[0],r.elapsed);assert.deepEqual(r.path.at(-1).slice(1),r.position);assert.ok(r.path.every((p,i)=>i===0||p[0]>r.path[i-1][0]));assert.deepEqual(r.environment,r.endEnvironment);assert.equal(r.station.id,'theatre-veranda');
 const runtime=createTheatreRuntime(havok);runtime.fire(r.setup);while(runtime.active)runtime.step();const prior=JSON.stringify(runtime.record);for(let n=0;n<20;n++)assert.equal(runtime.step(),false);assert.equal(JSON.stringify(runtime.record),prior);runtime.dispose();
});
test('Six voluntary Keeps round-trip; full shelf refuses replacement and returns cloned data',()=>{
 const memory=storage(),shelf=createTheatreShelf(memory),record=evidence.results.open.record;
 for(let n=0;n<6;n++)assert.ok(shelf.keep(record,'4dab6e1'));const bytes=memory.raw();assert.equal(shelf.keep(record,'4dab6e1'),null);assert.equal(memory.raw(),bytes);assert.equal(createTheatreShelf(memory).entries().length,6);
 const entry=shelf.entries()[0];entry.record.setup.yaw=60;assert.equal(shelf.get(entry.id).record.setup.yaw,0);shelf.remove(entry.id);assert.equal(shelf.entries().length,5);assert.equal(createTheatreShelf(memory).entries().length,5);
});
test('Restore data rejects foreign layout, malformed times, terminal mismatch and unbounded input',()=>{
 const shelf=createTheatreShelf(storage());const entry=shelf.keep(evidence.results.side.record,'4dab6e1');assert.ok(validTheatreEntry(entry));
 for(const mutate of [e=>{e.layout='other';},e=>{e.record.environment.layout='other';},e=>{e.record.path[4][0]=-1;},e=>{e.record.path[4][1]=Infinity;},e=>{e.record.path.at(-1)[1]+=1;},e=>{e.record.setup.charge=1.01;},e=>{e.record.setup.script='unsafe';},e=>{e.record.station.x=1;},e=>{e.record.path.push(...e.record.path);},e=>{e.record.evidence=[null];},e=>{e.record.contacts=[null];},e=>{e.record.impacts=[null];}]){const bad=structuredClone(entry);mutate(bad);assert.equal(validTheatreEntry(bad),false);}
});
test('Malformed or blocked storage preserves original bytes and keeps working in memory',()=>{
 const memory=storage('{broken'),shelf=createTheatreShelf(memory);assert.match(shelf.warning(),/preserved/);assert.ok(shelf.keep(evidence.results.open.record,'4dab6e1'));assert.equal(memory.raw(),'{broken');
 const blocked=createTheatreShelf({getItem(){return null;},setItem(){throw Error('quota');}});assert.ok(blocked.keep(evidence.results.open.record,'4dab6e1'));assert.equal(blocked.entries().length,1);assert.match(blocked.warning(),/Download/);
});
test('Held restored setup and varied frame partitions reproduce the same Havok record',()=>{
 const expected=evidence.results.side.record;
 for(const partition of [[1/30],[1/60],[1/144],[.004,.031,.011,.019]]){const runtime=createTheatreRuntime(havok);assert.equal(runtime.active,false);for(let n=0;n<480;n++)assert.equal(runtime.step(),false);runtime.fire(expected.setup);let accumulator=0,index=0;while(runtime.active){accumulator+=partition[index++%partition.length];while(accumulator>=1/120&&runtime.active){runtime.step();accumulator-=1/120;}}assert.equal(JSON.stringify(runtime.record),JSON.stringify(expected));assert.deepEqual(runtime.dispose(),{meshes:0,materials:0,geometries:0,transformNodes:0});}
});
test('Ordinary aim/elevation/power detents retain primary contacts; origin changes may choose another family',()=>{
 for(const id of ['side','rostrum'])for(const n of evidence.neighbors[id].slice(0,6)){const r=shoot(n.setup).record;assert.equal(r.contacts[0].body,id==='side'?'theatre-flat':'theatre-rostrum');}
 assert.deepEqual(evidence.neighbors.side.find(n=>n.changed==='railIndex'&&n.change===-1).contacts,['theatre-ground']);
});

test('Physical ablations carry distinct layout identities and cannot enter the full theatre shelf',()=>{const record=shoot(evidence.results.side.setup,{control:'no-flat'}).record;assert.match(record.environment.layout,/control-no-flat$/);assert.equal(validTheatreRecord(record),false);});

test('Dirty development builds preserve their explicit provenance in a kept record',()=>{const shelf=createTheatreShelf(storage());const build='b48042a959-dirty',entry=shelf.keep(evidence.results.open.record,build);assert.equal(entry.build,build);assert.ok(validTheatreEntry(entry));assert.equal(shelf.get(entry.id).build,build);assert.equal(validTheatreEntry({...entry,build:'b48042a959-dirty-other'}),false);});
