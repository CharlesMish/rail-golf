import test from 'node:test';
import assert from 'node:assert/strict';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {EXCHANGE_CASES} from '../scripts/places/architecture-measure.mjs';
import {PLACES_ARCHITECTURE,buildExchangeYard,EXCHANGE_SOLIDS} from '../lib/places-architecture.js';

test('all pitched-roof faces use outward Babylon normals and culling without changing convex hull points',()=>{
 const original=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...a)=>buildExchangeYard(...a,{legacyRoofWinding:true})}),fixed=architectureHarness(PLACES_ARCHITECTURE);
 try{for(const r of EXCHANGE_SOLIDS.filter(r=>r.shape==='gable')){
  const old=original.world.meshes.find(m=>m.name==='exchange-'+r.id),m=fixed.world.meshes.find(m=>m.name===old.name),p=m.getVerticesData('position'),n=m.getVerticesData('normal'),indices=m.getIndices();
  assert.deepEqual(p,old.getVerticesData('position'),'convex-hull point order remains exact');assert.equal(m.material.backFaceCulling,true);assert.equal(m.receiveShadows,true);assert.equal(fixed.casters.has(m),true);assert.equal(indices.length,24);
  const oldIndices=old.getIndices();for(let k=0;k<indices.length;k+=3){assert.deepEqual(indices.slice(k,k+3),[oldIndices[k],oldIndices[k+2],oldIndices[k+1]]);const centroid=[0,0,0];for(let j=0;j<3;j++)for(let c=0;c<3;c++)centroid[c]+=p[indices[k+j]*3+c]/3;centroid[1]-=r.h/3;for(let j=0;j<3;j++)assert.ok(centroid.reduce((sum,v,c)=>sum+v*n[indices[k+j]*3+c],0)>0,`${r.id} face ${k/3} points outward`);}
 }}finally{original.dispose();fixed.dispose();}
});

test('render-only roof correction preserves every representative original physical record, callback and path exactly',()=>{
 const original=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...a)=>buildExchangeYard(...a,{legacyRoofWinding:true})}),fixed=architectureHarness(PLACES_ARCHITECTURE);
 try{for(const [id,setup]of Object.entries(EXCHANGE_CASES))assert.deepEqual(fixed.shoot(setup),original.shoot(setup),id);}finally{original.dispose();fixed.dispose();}
});

import {PLACES_ARCHITECTURE_REFINED,EXCHANGE_REFINED_LAYOUT,EXCHANGE_REFINED_STATIONS,exchangeSegment} from '../lib/places-architecture.js';
import {spatialLaunch,spatialCameraFrame} from '../lib/spatial-lab-session.js';
import {createPlaygroundShelf,validPlaygroundEntry} from '../lib/playgrounds-shelf.js';
import {FREIGHT_CASES,retainsFreight} from '../scripts/refinement/spatial-cases.mjs';
import {exchangeNeighbours} from '../scripts/places/architecture-measure.mjs';
const physical=r=>[r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path,r.impacts];

test('Freight supports ordinary neighboring return families while Forecourt physics is unchanged',()=>{
 const original=architectureHarness(PLACES_ARCHITECTURE),refined=architectureHarness(PLACES_ARCHITECTURE_REFINED);
 try{for(const setup of Object.values(EXCHANGE_CASES).filter(s=>s.carriageMode==='forecourt'))assert.deepEqual(physical(refined.shoot(setup)),physical(original.shoot(setup)));
 for(const id of ['platform-hall','pier-gallery','bridge-signal','roof-bridge','roof-bridge-long','bridge-top']){assert.equal(retainsFreight(id,refined.shoot(FREIGHT_CASES[id])),true,id);for(const n of exchangeNeighbours(FREIGHT_CASES[id]))assert.equal(retainsFreight(id,refined.shoot(n.setup)),true,`${id}: ${n.change}`);}
 const sensitive=exchangeNeighbours(FREIGHT_CASES['bridge-edge-sensitive']).map(n=>retainsFreight('bridge-edge-sensitive',refined.shoot(n.setup)));assert.equal(sensitive.filter(Boolean).length,5);
 for(const id of ['short-ground','empty-carry','high-open-arc'])assert.equal(retainsFreight(id,refined.shoot(FREIGHT_CASES[id])),true);
 }finally{original.dispose();refined.dispose();}
});

test('v2 station identity rejects v1 memory, restores new lines silently and keeps three rails on actual dock',()=>{
 const config=PLACES_ARCHITECTURE_REFINED,contract={...config.playground,station:config.station},oldContract={...PLACES_ARCHITECTURE.playground,station:PLACES_ARCHITECTURE.station},h=architectureHarness(config),fresh=architectureHarness(config),shelf=createPlaygroundShelf(contract,null);
 try{assert.equal(EXCHANGE_REFINED_STATIONS[1].y,3.5);for(const railIndex of [0,1,2]){const {rail,muzzle}=spatialLaunch(config,{...FREIGHT_CASES['bridge-signal'],railIndex});assert.ok(rail.x>=-9.5&&rail.x<=5.5&&rail.z>=63.5&&rail.z<=80.5);assert.equal(rail.y,3.5);assert.ok(muzzle.y>3.5);}
 const result=h.shoot(FREIGHT_CASES['bridge-signal']),muzzle=spatialLaunch(config,result.record.setup).muzzle,path=[[0,muzzle.x,muzzle.y,muzzle.z],...result.path.map(p=>p.slice(0,4))],entry=shelf.keep(result.record,path,'8b02b8c');assert.equal(entry.layout,EXCHANGE_REFINED_LAYOUT);assert.equal(validPlaygroundEntry(entry,contract),true);assert.equal(validPlaygroundEntry(entry,oldContract),false);assert.equal(fresh.session.flight,null);fresh.world.environment.restore(entry.record.environment);assert.equal(fresh.session.flight,null);assert.deepEqual(fresh.shoot(entry.record.setup),result);
 const forged=structuredClone(entry);forged.record.station.y=0;assert.equal(validPlaygroundEntry(forged,contract),false);assert.throws(()=>h.world.environment.restore({layout:'playgrounds-exchange-yard-v1'}));assert.throws(()=>config.station({...config.defaultSetup,carriageMode:'service'}));
 }finally{h.dispose();fresh.dispose();}
});

test('Freight launch camera clears architecture at every sampled rail and yaw while Forecourt camera stays exact',()=>{
 const config=PLACES_ARCHITECTURE_REFINED;
 for(const railIndex of [0,1,2])for(let yaw=-70;yaw<=70;yaw+=5)for(const [width,height]of [[1440,900],[390,844],[844,390]]){
  const setup={...config.defaultSetup,carriageMode:'freight',railIndex,yaw},frame=spatialCameraFrame(config,setup,width,height),muzzle=spatialLaunch(config,setup).muzzle,camera={x:frame.position[0],y:frame.position[1],z:frame.position[2]};
  for(const solid of EXCHANGE_SOLIDS)assert.equal(exchangeSegment(camera,muzzle,solid),null,`rail${railIndex} yaw${yaw} ${solid.id}`);
  setup.carriageMode='forecourt';assert.deepEqual(spatialCameraFrame(config,setup,width,height),spatialCameraFrame(PLACES_ARCHITECTURE,setup,width,height));
 }
});
