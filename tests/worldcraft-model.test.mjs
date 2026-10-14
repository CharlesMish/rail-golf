import test from 'node:test';
import assert from 'node:assert/strict';
import {RAIL_RULES,chargeToSpeed} from '../lib/rail-golf-v02.js';
import {stationMuzzle,stationAim,stationRailPosition} from '../lib/stations.js';
import {createRedirectTracker} from '../lib/line-recognition.js';
import {WORLDCRAFT_CATALOG,WORLDCRAFT_STORAGE_PREFIX,WORLDCRAFT_LIMITS,createBlankWorld,createStarterWorld,validateWorld,parseWorldJSON,exportWorldJSON,worldcraftFootprint,worldcraftIdentity,validateWorldcraftSetup,captureWorldSnapshot,createWorldHistory,packWorldcraftLine,lineMatchesWorld,createWorldcraftStore} from '../lib/worldcraft-model.js';

const world=()=>createStarterWorld({id:'world-test'});
const storage=()=>{const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const setup={railIndex:1,originX:2.5,yaw:12,elevation:24,charge:.6};
const station={id:'worldcraft',label:'Worldcraft apron',x:setup.originX,z:0,yaw:0};
const launch={station,muzzle:stationMuzzle(setup,station),rail:stationRailPosition(setup.railIndex,station),aim:stationAim(setup,station),direction:stationAim(setup,station),speed:chargeToSpeed(setup.charge),mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius};
launch.rail.y=0;
const build='b24f036630ad24e963592c7f787307b1c57995bd';
const line=(id='line-one')=>packWorldcraftLine({id,createdAt:'2026-10-14T00:00:00.000Z',worldSnapshot:captureWorldSnapshot(world(),build),setup,launch,points:[{t:0,x:2.5,y:1,z:4},{t:1,x:3,y:5,z:22}],events:[{kind:'redirect',feature:'bank-1',point:{x:1,y:2,z:3}}],contacts:[{body:'worldcraft-bank-1',point:{x:1,y:2,z:3},count:2,first:1,last:1.01}],terminal:{reason:'first-ground',elapsed:2,position:[3,0,34]}});

test('world roundtrip uses a fixed catalog, exact envelope and stable prefab IDs',()=>{
 const value=world();assert.deepEqual(parseWorldJSON(exportWorldJSON(value)),value);
 assert.equal(createBlankWorld({id:'empty'}).objects.length,0);
 assert.deepEqual(value.objects.map(item=>item.id),['bank-1','ramp-1','block-1']);
 assert.equal(WORLDCRAFT_CATALOG.bank.restitution,.86);assert.equal(WORLDCRAFT_CATALOG.block.restitution,.1);
 const parsed=validateWorld(value);parsed.objects[0].x=0;assert.equal(value.objects[0].x,-12,'validated document is detached');
 assert.doesNotThrow(()=>validateWorld({...value,id:'23d185b7-829b-4c90-8e61-92a7b4c56d53'}));
});

test('untrusted imports reject unknown versions/keys, script or asset fields, excessive input and malformed JSON',()=>{
 const base=world();
 for(const changed of [
  {...base,version:2},{...base,url:'https://example.test/model.glb'},{...base,script:'run()'},
  {...base,environment:{...base.environment,url:'https://example.test/sky.png'}},
  {...base,environment:{preset:'forest-clearing-v1',seed:999}},
  {...base,rules:{score:'eval()'}},
  {...base,objects:[{...base.objects[0],width:1e20}]},
  {...base,objects:[{...base.objects[0],kind:'https://example.test/model.glb'}]},
  {...base,objects:Array.from({length:13},(_,i)=>({...base.objects[0],id:'object-'+i}))},
 ])assert.throws(()=>parseWorldJSON(JSON.stringify(changed)));
 assert.throws(()=>parseWorldJSON(' '.repeat(WORLDCRAFT_LIMITS.importBytes+1)),/32 KiB/);
 assert.throws(()=>parseWorldJSON('{' ),/Invalid JSON/);
 assert.throws(()=>parseWorldJSON(exportWorldJSON(base).replace('"x": -12','"x": 1e309')),/expected/);
 const withProto=exportWorldJSON(base).replace('"version": 1','"version": 1,"__proto__":{"polluted":true}');
 assert.throws(()=>parseWorldJSON(withProto),/fields/);assert.equal({}.polluted,undefined);
 const exotic=Object.create({url:'secret'});Object.assign(exotic,base);assert.throws(()=>validateWorld(exotic),/fields/);
 for(const bad of [Infinity,NaN,null,'0',.1])assert.throws(()=>validateWorld({...base,launcher:{x:bad}}));
});

test('piece transforms reject off-grid numbers, repeated IDs and complete rotated-footprint violations',()=>{
 const base=createBlankWorld({id:'bounds'});
 const piece={id:'piece',kind:'bank',x:0,z:25,yaw:0};
 for(const patch of [{x:.1},{z:24.7},{yaw:1},{yaw:180},{x:29},{z:95.5,yaw:45}])assert.throws(()=>validateWorld({...base,objects:[{...piece,...patch}]}));
 assert.throws(()=>validateWorld({...base,objects:[piece,{...piece,x:20}]}),/ids must be unique/);
 assert.throws(()=>validateWorld({...base,objects:[{...piece,z:10}]}),/launcher corridor/);
 const touching={...base,objects:[{id:'a',kind:'block',x:0,z:25,yaw:0},{id:'b',kind:'block',x:6,z:25,yaw:0}]};
 assert.doesNotThrow(()=>validateWorld(touching),'edge touching is valid');
 assert.throws(()=>validateWorld({...touching,objects:[touching.objects[0],{...touching.objects[1],x:5.5}]}),/overlaps another/);
 assert.throws(()=>validateWorld({...base,objects:[piece,{id:'diagonal',kind:'bank',x:0,z:25,yaw:90}]}),/overlaps another/);
 const ramp=worldcraftFootprint({id:'r',kind:'ramp',x:0,z:25,yaw:0});
 assert.ok(Math.abs(ramp.halfZ-(Math.cos(Math.PI/9)*10+Math.sin(Math.PI/9)*.8)/2)<1e-12);
});

test('world identity captures physical edits, ignores presentation identity/order and contains no colliding short hash',()=>{
 const base=world(),same={...base,id:'copy-id',name:'A different title',objects:[...base.objects].reverse()};
 assert.equal(worldcraftIdentity(base),worldcraftIdentity(same));
 const moved={...base,objects:base.objects.map((item,i)=>i?item:{...item,x:item.x+.5})};
 assert.notEqual(worldcraftIdentity(base),worldcraftIdentity(moved));
 assert.notEqual(worldcraftIdentity(base),worldcraftIdentity({...base,launcher:{x:.5}}));
 assert.equal(JSON.parse(worldcraftIdentity(base)).objects.length,3);
});

test('Undo/Redo uses accepted revisions only, restores stable IDs, clears redo and detaches callers',()=>{
 const base=world(),history=createWorldHistory(base),changed={...base,name:'Renamed'};
 assert.deepEqual(history.status(),{canUndo:false,canRedo:false,revision:0});
 history.commit(base);assert.equal(history.status().revision,0);
 assert.throws(()=>history.commit({...base,objects:[{...base.objects[0],x:40}]}));assert.equal(history.status().revision,0);
 history.commit(changed);assert.equal(history.status().revision,1);
 changed.name='External mutation';assert.equal(history.current().name,'Renamed');
 assert.deepEqual(history.undo(),base);assert.equal(history.status().canRedo,true);
 assert.equal(history.redo().name,'Renamed');
 history.undo();history.commit({...base,name:'Other branch'});assert.equal(history.status().canRedo,false);
 const exposed=history.current();exposed.objects.length=0;assert.equal(history.current().objects.length,3);
 history.reset(createBlankWorld({id:'replacement'}));assert.equal(history.status().canUndo,false);
 assert.equal(history.current().id,'replacement');
});

test('shot snapshots and Keep preserve exact fired world/setup/history independent of later editor changes',()=>{
 const source=world(),snapshot=captureWorldSnapshot(source,build),kept=line();
 source.objects[0].x+=.5;assert.equal(snapshot.world.objects[0].x,-12);
 assert.equal(Object.isFrozen(snapshot.world.objects[0]),true);
 assert.equal(kept.worldSnapshot.build,build);assert.deepEqual(kept.setup,setup);
 assert.deepEqual(kept.launch,launch);assert.equal(kept.contacts[0].count,2);
 assert.equal(kept.setup.originX,2.5,'actual stopped carriage is distinct from world default0');
 assert.equal(lineMatchesWorld(kept,world()),true);assert.equal(lineMatchesWorld(kept,source),false);
 const history=createWorldHistory(world());history.commit(source);history.undo();assert.equal(lineMatchesWorld(kept,history.current()),true);
 assert.throws(()=>{kept.points[0].x=300;},TypeError);
 assert.throws(()=>packWorldcraftLine({...kept,worldSnapshot:{...snapshot,worldIdentity:'wrong'}}),/does not match/);
 for(const patch of [{railIndex:0},{originX:.2},{originX:11},{yaw:71},{elevation:4},{charge:1.1}])assert.throws(()=>validateWorldcraftSetup({...setup,...patch}));
 assert.throws(()=>validateWorldcraftSetup({...setup,url:'no'}),/fields/);
 assert.throws(()=>packWorldcraftLine({...kept,points:Array.from({length:2049},()=>({x:0,y:1,z:0}))}),/samples/);
 assert.throws(()=>packWorldcraftLine({...kept,events:[{value:Infinity}]}),/number/);
 assert.throws(()=>packWorldcraftLine({...kept,events:[JSON.parse('{"__proto__":{}}')]}),/field/);
 assert.throws(()=>packWorldcraftLine({...kept,launch:{...launch,speed:launch.speed+1}}),/physics contract/);
 assert.throws(()=>packWorldcraftLine({...kept,launch:{...launch,station:{...station,x:0}}}),/origin/);
 assert.throws(()=>packWorldcraftLine({...kept,contacts:[{...kept.contacts[0],last:0}]}),/time/);
});

test('real interrupted redirect diagnostics omit optional undefined properties without losing recorded evidence',()=>{
 const tracker=createRedirectTracker();
 tracker.beginStep({x:12,y:-3,z:0},0);
 tracker.contact({id:'bank-1',kind:'bank',label:'Bank'},'worldcraft-bank-1',{x:1,y:2,z:3});
 tracker.finish();const diagnostics=tracker.drainDiagnostics();
 assert.equal(diagnostics[0].reason,'shot-ended-before-free-flight');
 assert.equal(Object.hasOwn(diagnostics[0],'outgoing'),true);assert.equal(diagnostics[0].outgoing,undefined);
 const kept=packWorldcraftLine({...line(),events:diagnostics,terminal:{reason:'interrupted'}});
 assert.deepEqual(kept.events,JSON.parse(JSON.stringify(diagnostics)));
 assert.equal(Object.hasOwn(kept.events[0],'outgoing'),false);
 assert.throws(()=>packWorldcraftLine({...line(),events:[[undefined]]}),/evidence object/,'undefined arrays are not silent nulls');
});

test('Worldcraft storage saves/reopens four explicit slots, never auto-evicts, and cannot touch incumbent keys',()=>{
 const raw=storage();raw.setItem('rail-golf-timber-courtyard-v01','production');raw.setItem('rail-golf:linecraft:shelf-v1','linecraft');
 const store=createWorldcraftStore(raw),first=store.saveWorld(world());assert.equal(first.persisted,true);
 assert.equal(store.saveWorld({...world(),name:'Update'},{replaceId:first.entry.id}).entry.id,first.entry.id);
 for(let n=1;n<4;n++)store.saveWorld({...world(),name:'Copy '+n});
 assert.throws(()=>store.saveWorld(world()),/occupied/);assert.equal(store.worlds().length,4);
 assert.throws(()=>store.saveWorld(world(),{replaceId:'missing'}),/no longer exists/);
 for(let n=0;n<4;n++)store.keepLine(line('line-'+n));
 assert.throws(()=>store.keepLine(line('line-fifth')),/occupied/);
 assert.equal(store.keepLine(line('line-0')).entry.id,'line-0','same immutable Keep is idempotent');
 assert.throws(()=>store.keepLine({...line('line-0'),terminal:{reason:'different'}}),/immutable/);
 const again=createWorldcraftStore(raw);assert.deepEqual(again.worlds(),store.worlds());assert.deepEqual(again.lines(),store.lines());
 assert.equal(again.removeWorld(first.entry.id),true);assert.equal(again.removeWorld(first.entry.id),false);
 assert.equal(again.removeLine('line-0'),true);assert.equal(createWorldcraftStore(raw).lines().length,3);
 assert.equal(raw.getItem('rail-golf-timber-courtyard-v01'),'production');assert.equal(raw.getItem('rail-golf:linecraft:shelf-v1'),'linecraft');
 assert.deepEqual([...raw.map.keys()].filter(key=>key.startsWith(WORLDCRAFT_STORAGE_PREFIX)).sort(),[WORLDCRAFT_STORAGE_PREFIX+'lines',WORLDCRAFT_STORAGE_PREFIX+'worlds']);
 assert.throws(()=>parseWorldJSON(store.exportLocal()),/fields/,'a study export is not a playable-world import');
});

test('corrupt/unsupported collections remain byte-for-byte intact and new choices remain exportable in memory',()=>{
 for(const original of ['broken JSON',JSON.stringify({version:2,entries:[]}),JSON.stringify({version:1,entries:[{id:'bad'}]})]){
  const raw=storage(),key=WORLDCRAFT_STORAGE_PREFIX+'worlds';raw.setItem(key,original);
  const store=createWorldcraftStore(raw),result=store.saveWorld(world());
  assert.equal(result.persisted,false);assert.equal(result.status.memoryOnly,true);assert.match(result.status.warning,/Original data kept/);
  assert.equal(raw.getItem(key),original);assert.equal(JSON.parse(store.exportLocal()).worlds.length,1);
  assert.equal(store.keepLine(line()).persisted,true,'unaffected line collection remains independently writable');
 }
});

test('quota/read failures and another tab changing a collection never discard the in-memory edit or overwrite newer bytes',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const absent=createWorldcraftStore(blocked);assert.equal(absent.saveWorld(world()).persisted,false);assert.equal(absent.worlds().length,1);assert.match(absent.status().warning,/blocked/);
 const quota=createWorldcraftStore({getItem:()=>null,setItem(){throw Error('quota');}});
 assert.equal(quota.keepLine(line()).persisted,false);assert.equal(quota.lines().length,1);assert.match(quota.status().warning,/quota/);
 const raw=storage(),old=createWorldcraftStore(raw),newer=createWorldcraftStore(raw);
 newer.saveWorld({...world(),name:'Other tab'});const before=raw.getItem(WORLDCRAFT_STORAGE_PREFIX+'worlds');
 const attempted=old.saveWorld({...world(),name:'This tab'});assert.equal(attempted.persisted,false);
 assert.equal(raw.getItem(WORLDCRAFT_STORAGE_PREFIX+'worlds'),before);assert.match(old.status().warning,/Another tab/);
 assert.equal(old.worlds()[0].world.name,'This tab');
});
