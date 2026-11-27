import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {instrumentReferences,instrumentWorlds,instrumentWorld,validateInstrument,importInstrument,exportInstrument,appendInstrument,instrumentCameraFrame} from '../lib/instrument-foundry.js';
import {counterlineWorlds,counterlineCameraFrame} from '../lib/counterline-worlds.js';
import {foundryRecord} from '../lib/worldcraft-foundry.js';
import {registeredInstruments} from '../lib/instrument-catalog.js';
import {worldcraftIdentity} from '../lib/worldcraft-model.js';

const clone=structuredClone,refs=instrumentReferences();
const examples=JSON.parse(await readFile(new URL('../public/playability/loops-examples.json',import.meta.url)));
const incumbent=counterlineWorlds(examples.lines[0].worldSnapshot.world);
function custom(id='author-study-v1'){const value=clone(refs[0]);value.preset.id=id;value.preset.name='Author study';value.invitation='Try a short answer, then move along the launch rail.';return value;}

test('instrument references preserve complete registered physical worlds, profiles, ordinary openings and camera authority',()=>{
 assert.deepEqual(registeredInstruments(),refs);
 for(const entry of instrumentWorlds()){
  const previous=incumbent.find(value=>value.id===entry.id),foundry=foundryRecord(entry.id);
  assert.deepEqual(entry.world,previous.world);assert.equal(worldcraftIdentity(entry.world),foundry.worldIdentity);
  assert.deepEqual(entry.profile,previous.profile);assert.deepEqual(entry.opening,previous.opening);assert.deepEqual(entry.originalOpening,previous.originalOpening);
  assert.deepEqual(counterlineCameraFrame(entry.world,entry.opening,'overview',390,844,entry.foundryId),counterlineCameraFrame(previous.world,previous.opening,'overview',390,844,previous.foundryId));
 }
 assert.deepEqual(refs.map(value=>value.preset.objects.length),[12,21]);assert.equal(refs[1].preset.capacity,24);
});
test('author envelope round-trips as bounded frozen data without changing physical identity for presentation metadata',()=>{
 const input=custom(),before=JSON.stringify(input),value=validateInstrument(input);
 assert.deepEqual(importInstrument(exportInstrument(value)),value);assert.equal(JSON.stringify(input),before);
 assert.ok(Object.isFrozen(value.preset.objects[0]));assert.throws(()=>{value.profile.dynamics='total-speed';});
 const changed=clone(input);changed.sourceBuild='a'.repeat(40);changed.camera={target:{x:10,y:5,z:35},radius:60,yaw:-45,elevation:35};changed.invitation='Another invitation.';changed.profile={version:1,dynamics:'total-speed',bankVoice:null};
 assert.equal(worldcraftIdentity(instrumentWorld(input).world),worldcraftIdentity(instrumentWorld(changed).world));
});
test('instrument rejects scripts, remote assets, unknown fields, physics coefficients, unsupported goals and nonstatic/movable authorship',()=>{
 const mutations=[v=>v.script='alert(1)',v=>v.invitation='Load https://example.test/a',v=>v.profile.url='x',v=>v.preset.objects[0].restitution=1,v=>v.preset.rules.goal={kind:'first-ground-zone',x:0,z:30,r:1},v=>v.preset.rules.launcher.fixed=true,v=>v.preset.rules.fixed.pop(),v=>v.preset.rules.allowance={bank:1},v=>v.preset.objects.forEach(o=>{delete o.voice;}),v=>v.sourceBuild='main',v=>v.camera={target:{x:0,y:0,z:40},radius:1,yaw:0,elevation:45}];
 for(const mutate of mutations){const value=custom();mutate(value);assert.throws(()=>validateInstrument(value));}
 assert.throws(()=>importInstrument(' '.repeat(49153)));assert.throws(()=>validateInstrument({...custom(),invitation:'a'.repeat(601)}));
});
test('both openings and every launcher window endpoint use actual player detents',()=>{
 for(const key of ['yaw','elevation','charge']){
  const value=custom();value.opening[key]+=.001;assert.throws(()=>validateInstrument(value),/detents/);
  const original=custom();original.preset.rules.launcher[key]+=.001;assert.throws(()=>validateInstrument(original),/detents/);
 }
 const windowed=custom();windowed.preset.rules.launcher={...windowed.preset.rules.launcher,originFixed:false,window:{yawMin:-10,yawMax:10,elevationMin:5,elevationMax:40,chargeMin:.2,chargeMax:.8}};
 assert.doesNotThrow(()=>validateInstrument(windowed));
 for(const key of Object.keys(windowed.preset.rules.launcher.window)){const value=clone(windowed);value.preset.rules.launcher.window[key]+=.001;assert.throws(()=>validateInstrument(value));}
});
test('audition imports are idempotent, bounded and reject identity/content collisions before mutating caller data',()=>{
 const current=instrumentReferences(),before=JSON.stringify(current),first=custom();
 let list=appendInstrument(current,first);assert.equal(JSON.stringify(current),before);assert.equal(appendInstrument(list,first).length,3);
 for(let i=1;i<6;i++)list=appendInstrument(list,custom(`author-${i}`));
 assert.equal(list.length,8);assert.throws(()=>appendInstrument(list,custom('seventh')),/six additional/);
 const changed=clone(first);changed.profile.bankVoice=null;assert.throws(()=>appendInstrument(list,changed),/different content/);
 const reference=clone(refs[0]);reference.camera={target:{x:0,y:0,z:40},radius:70,yaw:0,elevation:40};
 assert.throws(()=>appendInstrument([],reference),/Reference instrument ids/);assert.throws(()=>appendInstrument(refs,reference),/different content/);
});
test('bounded optional camera orbit changes inspection only and default remains incumbent framing',()=>{
 assert.equal(instrumentCameraFrame(null,1280,720),null);
 const frame=instrumentCameraFrame({target:{x:0,y:3,z:40},radius:50,yaw:0,elevation:30},390,844);
 assert.equal(frame.horizontal,true);assert.equal(frame.fov,1.02);assert.equal(frame.position.x,0);assert.ok(Math.abs(frame.position.y-28)<1e-12);
 assert.deepEqual(frame.target,{x:0,y:3,z:40});
});
