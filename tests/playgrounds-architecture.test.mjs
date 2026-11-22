import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsMotionType} from '@babylonjs/core';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,ARCHITECTURE_LAYOUT,architectureEnvironmentValid} from '../lib/playgrounds-architecture.js';
import {ARCHITECTURE_SHOTS,architectureControl,architectureNeighbours,summary,matchesFamily} from '../scripts/playgrounds/architecture-fixtures.mjs';

test('Gallery Cistern uses visible static solids and preserves the genuine terminal floor',()=>{
 const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE);
 try{
  assert.equal(h.resources().staticBodies,15);assert.equal(h.resources().dynamicBodies,0);
  for(const row of RINGWELL_SOLIDS){const m=h.world.features.get(row.id),body=m.physicsBody;assert.equal(body.getMotionType(),PhysicsMotionType.STATIC);assert.equal(Boolean(m.metadata.rangeGround),Boolean(row.ground));assert.equal(m.getBoundingInfo().boundingBox.extendSize.x*2,row.w);assert.equal(m.getBoundingInfo().boundingBox.extendSize.y*2,row.h);assert.equal(m.getBoundingInfo().boundingBox.extendSize.z*2,row.d);}
  assert.equal(h.world.features.get('ground').metadata.rangeGround,true);
  const short=h.shoot(ARCHITECTURE_SHOTS['short-miss']);assert.deepEqual(short.record.contacts.map(c=>c.body),['rw-ground']);assert.equal(short.record.reason,'first-ground-contact');
  assert.ok(architectureEnvironmentValid({layout:ARCHITECTURE_LAYOUT}));for(const bad of [{layout:'foreign'},null,{layout:ARCHITECTURE_LAYOUT,script:'x'},{layout:ARCHITECTURE_LAYOUT,level:1}])assert.equal(architectureEnvironmentValid(bad),false);
 }finally{h.dispose();}
});

test('broad low, high and chamber intentions survive real control neighbours; top-to-top remains secondary',()=>{
 const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE);
 try{
  for(const id of ['low-return','high-circuit','ear-return']){assert.ok(matchesFamily(id,h.shoot(ARCHITECTURE_SHOTS[id])),id);for(const n of architectureNeighbours(ARCHITECTURE_SHOTS[id]))assert.ok(matchesFamily(id,h.shoot(n.setup)),`${id} ${n.control} ${n.delta}`);}
  const r=h.shoot(ARCHITECTURE_SHOTS['cross-galleries']),east=r.record.evidence.find(e=>e.kind==='redirect'&&e.feature==='east-gallery'),west=r.record.evidence.find(e=>e.kind==='redirect'&&e.feature==='west-gallery');
  assert.ok(east&&west);assert.ok(Math.abs(east.point.y-18)<.005&&Math.abs(west.point.y-10)<.005);assert.ok(east.incoming.y<0&&east.outgoing.y>0&&west.incoming.y<0&&west.outgoing.y>0);assert.ok(Math.hypot(west.point.x-east.point.x,west.point.z-east.point.z)>30);
  const topCount=architectureNeighbours(ARCHITECTURE_SHOTS['cross-galleries']).filter(n=>matchesFamily('cross-galleries',h.shoot(n.setup))).length;assert.equal(topCount,5);
  // Lower arrival remains a real side-face interaction, not a falsely claimed top.
  const side=h.shoot(ARCHITECTURE_SHOTS['side-not-top']).record.evidence.find(e=>e.kind==='redirect'&&e.feature==='west-gallery');assert.ok(side&&side.point.y<10-.43&&side.outgoing.y<0);
 }finally{h.dispose();}
});

test('walls and receivers supply complementary physical possibilities, not just extra decoration',()=>{
 const full=architectureHarness(PLAYGROUNDS_ARCHITECTURE),walls=architectureHarness(architectureControl('walls-only')),receivers=architectureHarness(architectureControl('receivers-only'));
 try{
  assert.equal(architectureEnvironmentValid(walls.world.environment.snapshot()),false);
  assert.equal(architectureEnvironmentValid(receivers.world.environment.snapshot()),false);
  assert.throws(()=>full.world.environment.restore(walls.world.environment.snapshot()));
  assert.throws(()=>walls.world.environment.restore(full.world.environment.snapshot()));
  const a=full.shoot(ARCHITECTURE_SHOTS['low-return']),b=walls.shoot(ARCHITECTURE_SHOTS['low-return']),c=receivers.shoot(ARCHITECTURE_SHOTS['low-return']);
  assert.deepEqual(a.record.contacts.map(x=>x.body),['rw-low-landing','rw-far-wall','rw-ground']);assert.deepEqual(b.record.contacts.map(x=>x.body),['rw-far-wall','rw-ground']);assert.equal(c.record.reason,'out-of-bounds');assert.ok(a.record.elapsed>b.record.elapsed+2);
  const d=full.shoot(ARCHITECTURE_SHOTS['cross-galleries']);assert.ok(matchesFamily('cross-galleries',d));assert.deepEqual(walls.shoot(ARCHITECTURE_SHOTS['cross-galleries']).record.contacts.map(x=>x.body),['rw-east-wall','rw-ground']);assert.deepEqual(receivers.shoot(ARCHITECTURE_SHOTS['cross-galleries']).record.contacts.map(x=>x.body),['rw-ground']);
 }finally{full.dispose();walls.dispose();receivers.dispose();}
});

test('repeat, Recall and reset retain actual records and release all owned resources; long settling stays an explicit negative',()=>{
 const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE);
 try{
  const shot=ARCHITECTURE_SHOTS['ear-return'],a=h.shoot(shot);assert.deepEqual(h.shoot(shot),a);const restored=h.session.action('recall');assert.deepEqual(restored,shot);assert.deepEqual(h.shoot(restored),a);
  h.session.action('reset');const idle=h.resources();for(let n=0;n<5;n++){h.shoot(ARCHITECTURE_SHOTS['low-return']);h.session.action('reset');assert.deepEqual(h.resources(),idle);}
  const slow=h.shoot(ARCHITECTURE_SHOTS['slow-pocket']);assert.equal(slow.record.reason,'settled');assert.ok(slow.record.elapsed>35);assert.equal(summary(slow).order.includes('rw-ground'),false);
  const result=h.disposeWorld();assert.equal(result.staticBodies+result.dynamicBodies+result.animatedBodies+result.meshes+result.materials+result.geometries+result.casters,0);
 }finally{h.scene.dispose();h.engine.dispose();}
});
