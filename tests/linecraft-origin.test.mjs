import test from 'node:test';
import assert from 'node:assert/strict';
import {LINECRAFT_ORIGIN,selectLinecraftOrigin,shiftLinecraftOrigin} from '../lib/linecraft-origin.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
import {stationMuzzle,YARD_STATIONS} from '../lib/stations.js';
import {captureLabLaunch} from '../lib/lab-controls.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {createLinecraftShelf,createLinecraftSession,linecraftMeta} from '../lib/linecraft-lab.js';
import {recordLineReceipt} from '../lib/line-score.js';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';

const setup={railIndex:1,yaw:0,elevation:30,charge:.8};
const link=(station,rail)=>({v:1,build:'faee6864',world:'timber-courtyard',route:'/lab/linecraft',card:'open-line',station,rail,yaw:0,elevation:30,speed:40,environment:{floor:'A'}});
test('all old link positions restore the identical muzzle on both courtyard stations',()=>{
 for(const station of ['gate','lumber'])for(let rail=0;rail<3;rail++){
  const previous={...setup,railIndex:rail},restored=restoreShareLine(decodeShareLine(encodeShareLine(link(station,rail))),'faee6864');
  assert.equal(restored.setup.originX,RAIL_RULES.railPositions[rail]);
  assert.deepEqual(stationMuzzle(previous,YARD_STATIONS[station]),stationMuzzle(restored.setup,YARD_STATIONS[station]));
  assert.equal(restored.autoFire,false);
 }
});
test('one half-metre control is bounded and does not replace aim or power',()=>{
 for(const station of ['gate','lumber']){
  const range=LINECRAFT_ORIGIN[station];
  assert.equal(range.step,.5);
  const left=selectLinecraftOrigin(setup,station,-100),right=selectLinecraftOrigin(setup,station,100);
  assert.equal(left.originX,range.min);assert.equal(right.originX,range.max);
  assert.equal(shiftLinecraftOrigin(left,station,1).originX,range.min+.5);
  assert.equal(shiftLinecraftOrigin(right,station,1).originX,range.max);
  assert.equal(right.yaw,setup.yaw);assert.equal(right.elevation,setup.elevation);assert.equal(right.charge,setup.charge);
 }
});
test('new setup links, snapshots and kept lines retain the precise origin',()=>{
 const shot=selectLinecraftOrigin(setup,'lumber',7.5),card=selectOpenLineStation('lumber');
 const linkV2={...link('lumber',shot.railIndex),v:2,originX:shot.originX};
 const restored=restoreShareLine(decodeShareLine(encodeShareLine(linkV2)),'faee6864');
 assert.equal(restored.setup.originX,7.5);
 assert.deepEqual(stationMuzzle(restored.setup,card.station),stationMuzzle(shot,card.station));
 const launch=captureLabLaunch(card,shot,{floor:'A'},'faee6864');
 assert.equal(launch.setup.originX,7.5);assert.deepEqual(launch.muzzle,stationMuzzle(shot,card.station));
 const ledger=[{kind:'termination',reason:'ground-contact'}];
 const line={...shot,holeId:'open-line',stationId:'lumber',windId:card.wind.id,build:'faee6864',environment:{floor:'A'},environmentAfter:{floor:'A'},points:[launch.muzzle],contacts:[],ledger,lineReceipt:recordLineReceipt(ledger)};
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const shelf=createLinecraftShelf(storage),entry=shelf.keep('origin:1',line,launch,linecraftMeta(createLinecraftSession()));
 assert.equal(entry.line.originX,7.5);assert.equal(createLinecraftShelf(storage).entries()[0].launchContext.setup.originX,7.5);
 assert.throws(()=>encodeShareLine({...linkV2,originX:7.25}),/origin/);
});
test('both ends of both launch-origin spans fire and resolve under real Havok',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 for(const station of ['gate','lumber'])for(const originX of [LINECRAFT_ORIGIN[station].min,LINECRAFT_ORIGIN[station].max]){
  const h=diverterHarness(havok,'A',true,selectOpenLineStation(station),{scoreLab:true});
  try{const shot=h.shoot(selectLinecraftOrigin(setup,station,originX));
   assert.ok(shot.ledger.some(event=>event.kind==='termination'),`${station} ${originX}`);
  }finally{h.dispose();}
 }
});
