import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseShotWorld,createOrcLoopWorld,createStarterWorld,validateWorld,validateWorldEdit,worldcraftFixedSetup,validateWorldcraftShot,worldcraftCanAdd,worldcraftPinResult,worldcraftChallengeResult,exportWorldJSON,parseWorldJSON,worldcraftIdentity,createWorldcraftStore} from '../lib/worldcraft-model.js';

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

test('House Shot identity is unchanged by the optional orc-loop fields',()=>{
 const w=house();
 assert.equal(worldcraftIdentity(w),'{"catalog":"worldcraft-prefabs-v1","physics":"rail-golf-v02-worldcraft-v1","environment":{"preset":"forest-clearing-v1","seed":1},"objects":[{"id":"ramp-yours","kind":"ramp","x":0,"z":42,"yaw":0}],"launcher":{"x":0},"rules":{"pin":{"x":-10,"z":72.5,"r":3},"locked":[],"allowance":{"ramp":1},"rail":{"yaw":0,"elevation":18,"charge":0.55}}}');
 assert.equal(w.timing,undefined);
 assert.equal(w.rules.target,undefined);
});

test('Orc Loop is a fixed two-piece challenge with a deterministic delay and a contact goal',()=>{
 const orc=createOrcLoopWorld();
 assert.equal(orc.id,'orc-loop-v1');
 assert.deepEqual(orc.objects.map(o=>o.kind),['ramp','bank']);
 assert.equal(orc.rules.target.id,'orc');
 assert.equal(orc.timing.delay,0);
 assert.equal(worldcraftCanAdd(orc,'ramp'),false);
 assert.equal(worldcraftCanAdd(orc,'bank'),false);
 assert.equal(worldcraftCanAdd(orc,'block'),false);
 assert.deepEqual(parseWorldJSON(exportWorldJSON(orc)),orc);
 assert.doesNotThrow(()=>validateWorldEdit(orc,{...orc,timing:{delay:1.5},objects:orc.objects.map(o=>o.id==='ramp-yours'?{...o,yaw:-10}:o)}));
 assert.throws(()=>validateWorldEdit(orc,{...orc,rules:{...orc.rules,target:{...orc.rules.target,speed:2}}}));
 assert.throws(()=>validateWorld({...house(),timing:{delay:0}}));
 assert.throws(()=>validateWorld({...orc,timing:{delay:.25}}));
 assert.throws(()=>validateWorld({...orc,rules:{...orc.rules,target:{...orc.rules.target,id:'goblin'}}}));
 const body='worldcraft-target-orc';
 assert.deepEqual(worldcraftChallengeResult(orc,{reason:'first-ground-contact',position:[0,.43,70]},[{body,count:1,first:1.2,last:1.2}]),{status:'clear',distance:null,goal:'orc',body,contactTime:1.2});
 assert.equal(worldcraftChallengeResult(orc,{reason:'first-ground-contact',position:[0,.43,70]},[]).status,'miss');
 assert.equal(worldcraftChallengeResult(orc,{reason:'interrupted',position:[0,.43,70]},[]).status,'unfinished');
 assert.equal(worldcraftChallengeResult(house(),{reason:'first-ground-contact',position:[-10,.43,72.5]}).goal,undefined);
 assert.deepEqual(worldcraftFixedSetup(orc),{railIndex:1,originX:0,yaw:0,elevation:18,charge:.55});
});

test('piece edit Undo/Redo preserve free origin; explicit loads and fixed worlds supply their own origin', async()=>{
 const {createWorldHistory,worldcraftSetupForWorld}=await import('../lib/worldcraft-model.js');
 const world=createStarterWorld(),history=createWorldHistory(world),setup={railIndex:1,originX:5,yaw:12,elevation:25,charge:.7};
 history.commit({...world,objects:world.objects.map((o,i)=>i?o:{...o,x:o.x+.5})});
 for(const next of [history.current(),history.undo(),history.redo()])assert.deepEqual(worldcraftSetupForWorld(next,setup),setup);
 assert.deepEqual(worldcraftSetupForWorld(world,setup,{load:true}),{...setup,originX:0});
 assert.deepEqual(worldcraftSetupForWorld(house(),setup),worldcraftFixedSetup(house()));
});
