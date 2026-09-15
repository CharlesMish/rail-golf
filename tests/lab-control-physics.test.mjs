import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';import {selectOpenLineStation} from '../lib/line-lab.js';import {captureLabLaunch} from '../lib/lab-controls.js';
import {createSurveyArchive,createSurveyLog} from '../lib/survey-ledger.js';import {IDBFactory} from 'fake-indexeddb';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
test('Gate → Walk fire snapshot drives actual Havok impulse/position and matching durable ticket; unchanged physics equivalent to established launcher',async()=>{
 const m=new Map(),storage={get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const log=createSurveyLog({storage,archive:createSurveyArchive(new IDBFactory()),session:'real-havok'});
 const launches=[];
 for(const station of ['gate','lumber']){
  const card=selectOpenLineStation(station),setup={...card.defaultShot,charge:.5},context=captureLabLaunch(card,setup,{floor:'A'},'fixture-build');
  const h=diverterHarness(hv,'A',true,card,{scoreLab:true});
  try{
   const ticket=log.begin(context),ordinary=h.shoot(setup);h.action('reset');
   const physical=h.shoot(setup,{launch:{position:[context.muzzle.x,context.muzzle.y,context.muzzle.z],velocity:[context.direction.x,context.direction.y,context.direction.z].map(v=>v*context.launchSpeed)}});
   assert.deepEqual(physical,ordinary);log.append(ticket,physical.ledger);launches.push(context);
  }finally{h.dispose();}
 }
 const records=(await log.export()).records;assert.deepEqual(records.map(r=>[r.card,r.station]),[['open-line','gate'],['open-line','lumber']]);
 for(let i=0;i<2;i++){assert.deepEqual(records[i].muzzle,launches[i].muzzle);assert.deepEqual(records[i].direction,launches[i].direction);assert.deepEqual(records[i].setup,launches[i].setup);}
 assert.ok(Math.abs(records[0].muzzle.z-records[1].muzzle.z)>100);
});
