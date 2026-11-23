import test from 'node:test';
import assert from 'node:assert/strict';
import {Ray,Vector3} from '@babylonjs/core';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {ARCHITECTURE_SHOTS} from '../scripts/playgrounds/architecture-fixtures.mjs';
import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS} from '../lib/playgrounds-architecture.js';
import {PLAYABILITY_CISTERN,cisternFlightFrame,cisternFollowOffsets,cisternClearFraction,cisternTerminalLabel} from '../lib/playability-cistern.js';
import {spatialCameraFrame,spatialLaunch} from '../lib/spatial-lab-session.js';
import {advanceFlightCamera,projectileScreen} from '../lib/flight-framing.js';
import {createPlaygroundShelf} from '../lib/playgrounds-shelf.js';
const vec=a=>({x:a[0],y:a[1],z:a[2]});
function obscured(h,camera,ball){const a=new Vector3(camera.x,camera.y,camera.z),b=new Vector3(ball.x,ball.y,ball.z),d=b.subtract(a),length=d.length(),r=new Ray(a,d.normalize(),length-.44);return h.world.meshes.some(m=>{m.computeWorldMatrix(true);const hit=r.intersectsMesh(m,false);return hit.hit&&hit.distance<length-.44;});}
test('Cistern presentation has identical actual physical authority and historical identity',()=>{
 assert.equal(PLAYGROUNDS_ARCHITECTURE.openInSurvey,true);assert.equal(PLAYGROUNDS_ARCHITECTURE.overviewFlight,true);assert.equal(PLAYGROUNDS_ARCHITECTURE.flightPresentation,undefined);
 assert.equal(PLAYABILITY_CISTERN.openInSurvey,false);assert.equal(PLAYABILITY_CISTERN.overviewFlight,false);assert.equal(PLAYABILITY_CISTERN.buildWorld,PLAYGROUNDS_ARCHITECTURE.buildWorld);assert.equal(PLAYABILITY_CISTERN.playground,PLAYGROUNDS_ARCHITECTURE.playground);
 const a=architectureHarness(PLAYABILITY_CISTERN),b=architectureHarness(PLAYGROUNDS_ARCHITECTURE);
 try{for(const setup of Object.values(ARCHITECTURE_SHOTS))assert.deepEqual(a.shoot(setup),b.shoot(setup));assert.deepEqual(a.resources(),b.resources());}finally{a.dispose();b.dispose();}
});
test('launch framing and closer overhead following keep actual-ball sight lines clear on sampled desktop and phone paths',()=>{
 const h=architectureHarness(PLAYABILITY_CISTERN);
 try{
  for(const railIndex of [0,1,2])for(let yaw=-70;yaw<=70;yaw+=5){const setup={...PLAYABILITY_CISTERN.defaultSetup,railIndex,yaw},f=spatialCameraFrame(PLAYABILITY_CISTERN,setup,390,844),ball=spatialLaunch(PLAYABILITY_CISTERN,setup).muzzle;assert.equal(obscured(h,vec(f.position),ball),false);}
  for(const name of ['ear-return','cross-galleries','slow-pocket']){const result=h.shoot(ARCHITECTURE_SHOTS[name],{fullPath:true});for(const [w,he]of [[1440,900],[390,844],[844,390]]){const initial=spatialCameraFrame(PLAYABILITY_CISTERN,result.record.setup,w,he);let frame={position:vec(initial.position),target:vec(initial.target),fov:initial.fov},previous=null;
    for(let i=1;i<result.path.length;i+=2){const ball=vec(result.path[i].slice(1,4)),ordinary=advanceFlightCamera(frame,ball,previous,cisternFollowOffsets(ball),1/60,w/he,initial.horizontal,initial.fov);frame=cisternFlightFrame(ordinary,ball);previous=ball;assert.equal(obscured(h,frame.position,ball),false,`${name} ${result.path[i][0]}`);assert.ok(cisternClearFraction(ball,frame.position)>.9999);const screen=projectileScreen(frame,ball,w/he,initial.horizontal);assert.ok(Math.abs(screen.x)<.01&&Math.abs(screen.y)<.01&&screen.depth>.1);}
  }}
  // The raised boom is an explicit specialized-room policy: there are no roofs.
  assert.ok(RINGWELL_SOLIDS.every(s=>!s.pitch&&!s.roll));
 }finally{h.dispose();}
});
test('Stop records interruption, clears active physics, preserves the world, and cannot masquerade as a natural Keep',()=>{
 const h=architectureHarness(PLAYABILITY_CISTERN),contract={...PLAYABILITY_CISTERN.playground,station:PLAYABILITY_CISTERN.station},data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},shelf=createPlaygroundShelf(contract,storage);
 try{
  const original=h.world.environment.snapshot();h.session.fire(ARCHITECTURE_SHOTS['slow-pocket']);for(let i=0;i<2400;i++)h.step();h.session.action('stop');const r=structuredClone(h.session.last);
  assert.equal(r.reason,'interrupted');assert.ok(Math.abs(r.elapsed-20)<1e-8);assert.equal(h.session.flight,null);assert.deepEqual(h.world.environment.snapshot(),original);assert.match(cisternTerminalLabel(r),/interrupted attempt/);
  assert.throws(()=>shelf.keep(r,[[0,0,0,0],[r.elapsed,...r.position]],'a90785ac2a'));
  const setup=h.session.action('recall');assert.deepEqual(setup,ARCHITECTURE_SHOTS['slow-pocket']);const reproduced=h.shoot(setup);assert.equal(reproduced.record.reason,'settled');assert.ok(reproduced.record.elapsed>40);
  const good=h.shoot(ARCHITECTURE_SHOTS['ear-return']);const path=[];
  // Use the same actual samples the browser preserves; historical schema stays valid.
  const muzzle=spatialLaunch(PLAYABILITY_CISTERN,good.record.setup).muzzle;path.push([0,muzzle.x,muzzle.y,muzzle.z],...good.path.map(p=>p.slice(0,4)));const entry=shelf.keep(good.record,path,'a90785ac2a');assert.equal(entry.layout,original.layout);
  const reloaded=createPlaygroundShelf({...PLAYGROUNDS_ARCHITECTURE.playground,station:PLAYGROUNDS_ARCHITECTURE.station},storage).get(entry.id);assert.deepEqual(reloaded,entry);h.world.environment.restore(reloaded.record.environment);assert.deepEqual(h.shoot(reloaded.record.setup),good);
  h.session.action('reset');assert.equal(h.resources().dynamicBodies,0);const cleanup=h.disposeWorld();assert.equal(cleanup.meshes+cleanup.staticBodies+cleanup.dynamicBodies+cleanup.geometries+cleanup.materials+cleanup.casters,0);
 }finally{h.scene.dispose();h.engine.dispose();}
});
test('Cistern result language distinguishes boundaries, natural ground, stone rest and deliberate interruption',()=>{
 const h=architectureHarness(PLAYABILITY_CISTERN);try{for(const [id,pattern]of [['high-escape',/outer study boundary on the far side/],['short-miss',/terminal floor/],['slow-pocket',/Slow motion on stone/]])assert.match(cisternTerminalLabel(h.shoot(ARCHITECTURE_SHOTS[id]).record),pattern);}finally{h.dispose();}
});
