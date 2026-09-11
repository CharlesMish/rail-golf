import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { collectDeliveryStepEvents, earnedDeliveryRoutes, normalizeDeliveryBook, segmentTokenIntersection, padImpulse } from '../lib/delivery-routes.js';
import { courtyardShot } from './helpers/courtyard-physics.mjs';
Logger.LogLevels = 0;
const delivery = COURTYARD_HOLES[0];

test('routes require the same shot to land; progress is a collection, not a combined trick stamp', () => {
  assert.deepEqual(earnedDeliveryRoutes(false, ['sky','skip'], false, ['boost']), []);
  assert.deepEqual(earnedDeliveryRoutes(true, ['sky','mill'], true), ['sky','mill']);
  assert.deepEqual(earnedDeliveryRoutes(true, [], false), ['direct']);
  assert.deepEqual(earnedDeliveryRoutes(true, [], true), []);
  assert.deepEqual(earnedDeliveryRoutes(true, [], false, ['bank-a']), []);
});

test('sky collection sweeps between samples and stays in event order', () => {
  assert.notEqual(segmentTokenIntersection({x:0,y:40,z:90},{x:0,y:40,z:130}), null);
  assert.equal(segmentTokenIntersection({x:8,y:40,z:90},{x:8,y:40,z:130}), null);
  const e = collectDeliveryStepEvents({x:0,y:100,z:110},{x:0,y:0,z:110},delivery);
  assert.deepEqual(e.map(x=>x.kind), ['sky','first-kiss']);
  const already = collectDeliveryStepEvents({x:0,y:100,z:110},{x:0,y:0,z:110},delivery,[],['sky']);
  assert.deepEqual(already.map(x=>x.kind), ['first-kiss']);
});

test('pad requires descent, precedes first kiss, and preserves horizontal aim', () => {
  assert.deepEqual(collectDeliveryStepEvents({x:0,y:.8,z:84},{x:0,y:2,z:84},delivery), []);
  const events = collectDeliveryStepEvents({x:0,y:2,z:84},{x:0,y:.6,z:84},delivery);
  assert.deepEqual(events.map(e=>e.kind), ['boost','first-kiss']);
  assert.ok(events[0].amount < events[1].amount);
  assert.deepEqual(padImpulse({x:4,y:-10,z:30},delivery), {x:0,y:30.75,z:0});
});

test('saved route lines survive round-trip storage and reject malformed or out-of-range setups', () => {
  const direct={railIndex:1,yaw:0,elevation:42,charge:.89};
  const book=normalizeDeliveryBook(JSON.parse(JSON.stringify({direct,sky:{...direct,charge:2},mill:{...direct,railIndex:.5},extra:direct})));
  assert.deepEqual(book,{direct});
  assert.deepEqual(normalizeDeliveryBook(null),{});
});

test('the full yard supports several skip, sky and mill lines', async (t) => {
  const havok=await HavokPhysics({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
  const fixtures=[
    ...[[20,.65],[20,.7],[20,.75],[22,.65],[22,.7],[24,.65]].map(([elevation,charge])=>({elevation,charge,route:'skip'})),
    ...[-16,-14,-12].map(yaw=>({elevation:65,charge:1,yaw,route:'mill'})),
    ...[[50,.9],[50,.95],[52,.9],[52,.95],[54,.95],[56,.95]].map(([elevation,charge])=>({elevation,charge,route:'sky'})),
  ];
  for (const f of fixtures) await t.test(`${f.route}, ${f.elevation}°, ${f.charge}`,()=>{
    const r=courtyardShot(havok,delivery,{railIndex:1,yaw:f.yaw ?? 0,elevation:f.elevation,charge:f.charge});
    assert.equal(r.outcome,'ace',JSON.stringify(r));
    assert.ok(r.routes.includes(f.route));
    assert.ok(earnedDeliveryRoutes(true,r.routes,r.collisions.length>0,r.tags).includes(f.route));
  });
});
