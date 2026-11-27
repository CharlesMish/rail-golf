import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {instrumentReferences} from '../lib/instrument-foundry.js';
import {validateInstrumentProbes,measureInstrument,PROBE_FORMAT} from '../scripts/instrument-foundry/validate.mjs';
const instrument=instrumentReferences()[0];
const document=(setting=instrument.opening)=>({format:PROBE_FORMAT,version:1,cases:[{id:'ordinary',family:'An ordinary physical relation',kind:'family',setup:structuredClone(setting)}]});
test('author probe inputs are bounded, exact and use actual controls before physics',()=>{
 const input=document(),before=JSON.stringify(input);assert.deepEqual(validateInstrumentProbes(instrument,input),input);assert.equal(JSON.stringify(input),before);
 for(const mutate of [v=>v.cases[0].setup.yaw+=.01,v=>v.cases[0].setup.elevation=4.5,v=>v.cases[0].setup.charge=.555,v=>v.cases[0].setup.originX=-10.5,v=>v.cases[0].setup.extra=true,v=>v.cases.push(structuredClone(v.cases[0])),v=>v.cases[0].kind='score',v=>v.cases[0].family='\n',v=>v.cases[0].expectedNotes=9,v=>v.extra='ignored',v=>v.cases=[],v=>v.cases=Array.from({length:33},(_,i)=>({...v.cases[0],id:'case-'+i}))]){const invalid=document();mutate(invalid);assert.throws(()=>validateInstrumentProbes(instrument,invalid));}
 const windowed=structuredClone(instrument);windowed.preset.rules.launcher.originFixed=false;windowed.preset.rules.launcher.window={yawMin:-10,yawMax:10,elevationMin:5,elevationMax:40,chargeMin:.1,chargeMax:.8};assert.throws(()=>validateInstrumentProbes(windowed,document({...instrument.opening,yaw:10.5})),/outside/);
});
test('default probes retain curated and original openings separately, without phrase quotas',()=>{
 const result=validateInstrumentProbes(instrument);assert.equal(result.cases.length,2);assert.deepEqual(result.cases[0].setup,instrument.opening);assert.notDeepEqual(result.cases[0].setup,result.cases[1].setup);
 const negative=document({railIndex:1,originX:0,yaw:70,elevation:5,charge:.1});negative.cases[0].kind='negative';assert.equal(validateInstrumentProbes(instrument,negative).cases[0].kind,'negative');
});
test('invalid probe is refused before any Havok object can be consumed',async()=>{
 const invalid=document();invalid.cases[0].setup.charge=.123;
 await assert.rejects(measureInstrument(instrument,invalid,{havok:{}}),/ordinary player control detents/);
});
test('actual author validator preserves repeated musical contacts independently of redirects and rejects boundary neighbors',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 const probes=document({railIndex:1,originX:-10,yaw:12.5,elevation:5,charge:.48});
 const result=await measureInstrument(instrument,probes,{havok});const c=result.cases[0];assert.equal(result.ok,true);assert.deepEqual(c.central.voicedImpacts.map(n=>n.note),['C4','G4','E4','G4','E4']);assert.equal(c.central.qualifiedRedirects.length,3);assert.equal(c.central.musicalImpacts.length,5);assert.equal(c.neighbors.filter(n=>n.rejected).length,2);assert.ok(c.neighbors.find(n=>n.control==='originX'&&n.delta===-.5).rejected);assert.ok(c.neighbors.find(n=>n.control==='elevation'&&n.delta===-.5).rejected);assert.equal(c.neighbors.filter(n=>!n.rejected).length,6);assert.equal(result.resources.afterRuntime.staticBodies,0);assert.equal(result.resources.afterRuntime.dynamicBodies,0);assert.equal(result.resources.afterScene.meshes,0);assert.equal(result.resources.afterScene.materials,0);assert.ok(c.central.fullPhysicalSHA256.match(/^[0-9a-f]{64}$/));
});
