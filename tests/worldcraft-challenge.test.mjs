import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseShotWorld,createTwoPiecePitchWorld,createStarterWorld,validateWorld,validateWorldEdit,worldcraftFixedSetup,validateWorldcraftShot,worldcraftCanAdd,worldcraftPinResult,exportWorldJSON,parseWorldJSON,worldcraftIdentity,createWorldcraftStore,WORLDCRAFT_CATALOG,WORLDCRAFT_RAMP_PITCH,worldcraftPitchedCenterY,worldcraftFootprint,worldcraftObjectCenterY} from '../lib/worldcraft-model.js';

const house=()=>createHouseShotWorld();
const withFixed=()=>validateWorld({...house(),objects:[...house().objects,{id:'fixed-bank',kind:'bank',x:-20,z:20,yaw:0}],rules:{...house().rules,locked:['fixed-bank']}});

test('optional rules preserve legacy worlds and roundtrip fixed challenges without changing identities',()=>{
 for(const w of [house(),withFixed(),createStarterWorld({id:'old-world'})]){
  assert.deepEqual(parseWorldJSON(exportWorldJSON(w)),w);
  assert.equal(worldcraftIdentity(w),worldcraftIdentity(parseWorldJSON(exportWorldJSON(w))));
 }
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,v)=>values.set(key,v)};
 const old=createStarterWorld({id:'old'});const store=createWorldcraftStore(storage);
 store.saveWorld(old);store.saveWorld(withFixed());
 assert.deepEqual(createWorldcraftStore(storage).worlds().map(e=>e.world),[old,withFixed()]);
 const w=house(),copy=validateWorld(w);copy.rules.pin.x=0;copy.rules.allowance.ramp=2;
 assert.equal(w.rules.pin.x,-10);assert.equal(w.rules.allowance.ramp,1);
});

test('rules reject malformed/unknown authority and impossible allowances without repairing it',()=>{
 const w=house();
 for(const rules of [
  {},{...w.rules,script:'x'},{...w.rules,pin:{...w.rules.pin,r:0}},
  {...w.rules,pin:{...w.rules.pin,x:31}}, {...w.rules,pin:{...w.rules.pin,z:107}},
  {...w.rules,pin:{...w.rules.pin,x:NaN}}, {...w.rules,locked:['missing']},
  {...w.rules,locked:['ramp-yours','ramp-yours']}, {...w.rules,allowance:{}},
  {...w.rules,allowance:{ramp:1.5}}, {...w.rules,allowance:{ramp:1,bank:13}},
  {...w.rules,allowance:JSON.parse('{"ramp":1,"__proto__":2}')},
  {...w.rules,rail:{yaw:71,elevation:18,charge:.55}},
  {...w.rules,rail:{yaw:0,elevation:18,charge:.55,originX:2}},
 ])assert.throws(()=>validateWorld({...w,rules}));
 assert.equal(worldcraftCanAdd(w,'ramp'),false);assert.equal(worldcraftCanAdd(w,'bank'),false);
 assert.equal(worldcraftCanAdd({...w,objects:[]},'ramp'),true);
 assert.equal(worldcraftCanAdd(createStarterWorld(),'bank'),true);
});

test('fixed pieces, launcher and rules survive every ordinary edit; explicit documents remain loadable',()=>{
 const w=withFixed();
 for(const patch of [
  {rules:null}, {rules:{...w.rules,pin:{...w.rules.pin,x:0}}}, {launcher:{x:.5}},
  {objects:w.objects.filter(o=>o.id!=='fixed-bank')},
  {objects:w.objects.map(o=>o.id==='fixed-bank'?{...o,x:o.x+.5}:o)},
  {objects:w.objects.map(o=>o.id==='fixed-bank'?{...o,yaw:5}:o)},
  {objects:w.objects.map(o=>o.id==='fixed-bank'?{...o,kind:'block'}:o)},
 ])assert.throws(()=>validateWorldEdit(w,{...w,...patch}));
 assert.doesNotThrow(()=>validateWorldEdit(w,{...w,objects:w.objects.map(o=>o.id==='ramp-yours'?{...o,yaw:5}:o)}));
 assert.doesNotThrow(()=>validateWorldEdit(w,{...w,objects:w.objects.filter(o=>o.id!=='ramp-yours')}));
 assert.doesNotThrow(()=>validateWorldEdit(w,{...w,name:'Renamed copy'}));
 const fixed=worldcraftFixedSetup(w);
 for(const patch of [{originX:.5},{yaw:1},{elevation:19},{charge:.56},{railIndex:0}])assert.throws(()=>validateWorldcraftShot(w,{...fixed,...patch}));
 assert.deepEqual(validateWorldcraftShot(w,fixed),fixed);
 assert.equal(worldcraftFixedSetup({...w,rules:{...w.rules,rail:null}}),null);
});

test('only measured first-ground centre inside/on the pin clears; stops, out of bounds and malformed terminals do not',()=>{
 const w=house(),at=(x,z,reason='first-ground-contact')=>({reason,position:[x,.43,z]});
 assert.deepEqual(worldcraftPinResult(w,at(-10,72.5)),{status:'clear',distance:0});
 assert.deepEqual(worldcraftPinResult(w,at(-7,72.5)),{status:'clear',distance:3});
 assert.equal(worldcraftPinResult(w,at(-6.999,72.5)).status,'miss');
 for(const reason of ['interrupted','out-of-bounds','settled','timeout'])assert.deepEqual(worldcraftPinResult(w,at(-10,72.5,reason)),{status:'unfinished',distance:null});
 for(const position of [[],[-10,NaN,72.5],[-10,72.5],null])assert.equal(worldcraftPinResult(w,{reason:'first-ground-contact',position}).status,'unfinished');
 assert.equal(worldcraftPinResult(createStarterWorld(),at(-10,72.5)),null);
});

test('two-piece pitch keeps House Shot unchanged and roundtrips an editable ramp incline',()=>{
 const house=createHouseShotWorld(),pitch=createTwoPiecePitchWorld();
 assert.equal(Object.hasOwn(house.objects[0],'pitch'),false);
 assert.equal(Object.hasOwn(house.rules,'rampPitch'),false);
 assert.equal(house.rules.rail.yaw,0);assert.equal(house.rules.rail.elevation,18);assert.equal(house.rules.rail.charge,.55);
 assert.deepEqual(parseWorldJSON(exportWorldJSON(pitch)),pitch);
 assert.equal(worldcraftIdentity(pitch),worldcraftIdentity(parseWorldJSON(exportWorldJSON(pitch))));
 assert.notEqual(worldcraftIdentity(pitch),worldcraftIdentity({...pitch,objects:pitch.objects.map(o=>o.kind==='ramp'?{...o,pitch:o.pitch-5}:o)}));
 assert.equal(pitch.rules.rampPitch,true);
 assert.deepEqual(pitch.rules.rail,house.rules.rail);
 assert.deepEqual(pitch.rules.allowance,{bank:1,ramp:1});
 assert.equal(pitch.objects.find(o=>o.kind==='ramp').pitch,0);
 assert.deepEqual(pitch.rules.pin,{x:0,z:76,r:1.5});
 assert.ok(Math.abs(worldcraftPitchedCenterY(WORLDCRAFT_CATALOG.ramp,-20)-WORLDCRAFT_CATALOG.ramp.centerY)<1e-12);
 assert.ok(Math.abs(worldcraftObjectCenterY(pitch.objects[0])-worldcraftPitchedCenterY(WORLDCRAFT_CATALOG.ramp,0))<1e-12);
 const flat=worldcraftFootprint({id:'r',kind:'ramp',x:0,z:40,yaw:0,pitch:0});
 const steep=worldcraftFootprint({id:'r',kind:'ramp',x:0,z:40,yaw:0,pitch:-40});
 assert.ok(steep.halfZ<flat.halfZ);
 assert.doesNotThrow(()=>validateWorldEdit(pitch,{...pitch,objects:pitch.objects.map(o=>o.kind==='ramp'?{...o,pitch:-15}:o)}));
 assert.throws(()=>validateWorldEdit(pitch,{...pitch,rules:{...pitch.rules,rampPitch:undefined}}));
 assert.throws(()=>validateWorldEdit(house,{...house,objects:[{...house.objects[0],pitch:-20}]}),/Incline is fixed/);
 assert.equal(worldcraftCanAdd(pitch,'ramp'),false);assert.equal(worldcraftCanAdd(pitch,'bank'),false);assert.equal(worldcraftCanAdd(pitch,'block'),false);
 for(const rules of [
  {...pitch.rules,rampPitch:false},{...pitch.rules,rampPitch:1},{...pitch.rules,rampPitch:'true'},
 ])assert.throws(()=>validateWorld({...pitch,rules}));
 assert.throws(()=>validateWorld({...pitch,objects:pitch.objects.map(o=>o.kind==='ramp'?{...o,pitch:-50}:o)}));
 assert.throws(()=>validateWorld({...pitch,objects:pitch.objects.map(o=>o.kind==='ramp'?{...o,pitch:-7}:o)}));
 assert.throws(()=>validateWorld({...pitch,objects:pitch.objects.map(o=>o.kind==='ramp'?{id:o.id,kind:o.kind,x:o.x,z:o.z,yaw:o.yaw}:o)}),/needs an incline/);
 assert.throws(()=>validateWorld({...pitch,objects:[...pitch.objects,{id:'bank-extra',kind:'bank',x:18,z:30,yaw:0,pitch:0}]}),/only a ramp/);
 assert.throws(()=>validateWorld({...createStarterWorld(),objects:[{...createStarterWorld().objects[1],pitch:-20}]}),/Incline is fixed/);
 assert.equal(WORLDCRAFT_RAMP_PITCH.step,5);
});

test('piece edit Undo/Redo preserve free origin; explicit loads and fixed worlds supply their own origin', async()=>{
 const {createWorldHistory,worldcraftSetupForWorld}=await import('../lib/worldcraft-model.js');
 const world=createStarterWorld(),history=createWorldHistory(world),setup={railIndex:1,originX:5,yaw:12,elevation:25,charge:.7};
 history.commit({...world,objects:world.objects.map((o,i)=>i?o:{...o,x:o.x+.5})});
 for(const next of [history.current(),history.undo(),history.redo()])assert.deepEqual(worldcraftSetupForWorld(next,setup),setup);
 assert.deepEqual(worldcraftSetupForWorld(world,setup,{load:true}),{...setup,originX:0});
 assert.deepEqual(worldcraftSetupForWorld(house(),setup),worldcraftFixedSetup(house()));
});
