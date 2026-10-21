import test from 'node:test';
import assert from 'node:assert/strict';
import {createHouseShotWorld,createOrcStaticWorld,createStarterWorld,validateWorld,validateWorldEdit,worldcraftFixedSetup,validateWorldcraftShot,worldcraftCanAdd,worldcraftPinResult,worldcraftTargetResult,worldcraftTargetBody,exportWorldJSON,parseWorldJSON,worldcraftIdentity,createWorldcraftStore,WORLDCRAFT_CATALOG,WORLDCRAFT_ORC} from '../lib/worldcraft-model.js';

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

test('Orc Stand-in is a second fixed-rail challenge and does not change House Shot',()=>{
 const house=createHouseShotWorld(),orc=createOrcStaticWorld();
 assert.equal(Object.hasOwn(house.rules,'target'),false);
 assert.equal(worldcraftIdentity(house),worldcraftIdentity(parseWorldJSON(exportWorldJSON(house))));
 assert.deepEqual(parseWorldJSON(exportWorldJSON(orc)),orc);
 assert.equal(orc.rules.pin,null);
 assert.deepEqual(orc.rules.target,{id:'stand-in-orc',x:-26,z:58.5,yaw:0});
 assert.deepEqual(orc.rules.allowance,{bank:1,ramp:1});
 assert.deepEqual(orc.rules.locked,['shield']);
 assert.deepEqual(worldcraftFixedSetup(orc),{railIndex:1,originX:0,yaw:0,elevation:18,charge:.55});
 assert.deepEqual(orc.objects.map(object=>object.id),['ramp-yours','bank-yours','shield']);
 assert.equal(worldcraftCanAdd(orc,'ramp'),false);
 assert.equal(worldcraftCanAdd(orc,'bank'),false);
 assert.equal(worldcraftCanAdd(orc,'block'),false);
 assert.equal(WORLDCRAFT_ORC.restitution,WORLDCRAFT_CATALOG.block.restitution);
 assert.equal(WORLDCRAFT_ORC.friction,WORLDCRAFT_CATALOG.block.friction);
 assert.equal(worldcraftTargetBody(orc.rules.target.id),'worldcraft-target-stand-in-orc');
 for(const rules of [
  {...orc.rules,pin:null,target:undefined},
  {...house.rules,pin:null},
  {...orc.rules,target:{...orc.rules.target,id:'shield'}},
  {...orc.rules,target:{...orc.rules.target,x:-10,z:52}},
  {...orc.rules,target:{id:'stand-in-orc',x:-26,z:58.5}},
  {...orc.rules,target:{...orc.rules.target,yaw:1}},
 ])assert.throws(()=>validateWorld({...orc,rules}));
 assert.throws(()=>validateWorldEdit(orc,{...orc,rules:{...orc.rules,target:{...orc.rules.target,x:-13.5}}}));
 assert.throws(()=>validateWorldEdit(orc,{...orc,objects:orc.objects.map(object=>object.id==='shield'?{...object,x:.5}:object)}));
 assert.throws(()=>validateWorldEdit(orc,{...orc,objects:orc.objects.filter(object=>object.id!=='shield')}));
 assert.doesNotThrow(()=>validateWorldEdit(orc,{...orc,objects:orc.objects.map(object=>object.id==='ramp-yours'?{...object,x:object.x-.5,yaw:5}:object)}));
 assert.doesNotThrow(()=>validateWorldEdit(orc,{...orc,objects:orc.objects.map(object=>object.id==='bank-yours'?{...object,z:object.z-.5}:object)}));
 const fixed=worldcraftFixedSetup(orc);
 assert.throws(()=>validateWorldcraftShot(orc,{...fixed,yaw:5}));
 assert.equal(worldcraftPinResult(orc,{reason:'first-ground-contact',position:[-14,.43,68]}),null);
 const body=worldcraftTargetBody('stand-in-orc');
 const contact={body,point:{x:-26,y:1.2,z:58.2},count:3,first:.8,last:.84};
 assert.deepEqual(worldcraftTargetResult(orc,{reason:'first-ground-contact',contacts:[contact]}),{status:'hit',body,contact});
 assert.deepEqual(worldcraftTargetResult(orc,{reason:'interrupted',contacts:[contact]}).status,'hit');
 assert.equal(worldcraftTargetResult(orc,{reason:'first-ground-contact',contacts:[{body:'worldcraft-object-shield',point:{x:0,y:2,z:53},count:1,first:.4,last:.4}]}).status,'miss');
 assert.equal(worldcraftTargetResult(orc,{reason:'interrupted',contacts:[]}).status,'unfinished');
 assert.equal(worldcraftTargetResult(orc,{reason:'timeout'}).status,'unfinished');
 assert.equal(worldcraftTargetResult(house,{reason:'first-ground-contact',contacts:[contact]}),null);
});

test('piece edit Undo/Redo preserve free origin; explicit loads and fixed worlds supply their own origin', async()=>{
 const {createWorldHistory,worldcraftSetupForWorld}=await import('../lib/worldcraft-model.js');
 const world=createStarterWorld(),history=createWorldHistory(world),setup={railIndex:1,originX:5,yaw:12,elevation:25,charge:.7};
 history.commit({...world,objects:world.objects.map((o,i)=>i?o:{...o,x:o.x+.5})});
 for(const next of [history.current(),history.undo(),history.redo()])assert.deepEqual(worldcraftSetupForWorld(next,setup),setup);
 assert.deepEqual(worldcraftSetupForWorld(world,setup,{load:true}),{...setup,originX:0});
 assert.deepEqual(worldcraftSetupForWorld(house(),setup),worldcraftFixedSetup(house()));
});
