import test from 'node:test';
import assert from 'node:assert/strict';
import { measure, loadHavok } from '../scripts/horizons/crossing-house.mjs';
import { validateFoundryDirectory } from '../scripts/foundry/validate.mjs';

// These are physical interaction/robustness tests, not contact-count targets.
test('Crossing House separates carry and cross-court routes with real detent neighbours and causal controls', async () => {
  const result = await measure();
  const shot = id => result.shots.find(s => s.id === id);
  assert.deepEqual(shot('over-screen').order, ['jump', 'far']);
  assert.deepEqual(shot('across-court').order, ['screen', 'west', 'east']);
  assert.deepEqual(shot('short-miss').order, []);
  assert.equal(shot('short-miss').terminal.reason, 'first-ground-contact');
  const over = result.nearby.find(g => g.id === 'over-screen').probes;
  assert.equal(over.length, 8);
  assert.ok(over.every(s => s.order.join('/') === 'jump/far'));
  const across = result.nearby.find(g => g.id === 'across-court').probes;
  assert.ok(across.every(s => s.order.slice(0, 2).join('/') === 'screen/west'));
  assert.ok(across.some(s => s.order.includes('east')) && across.some(s => !s.order.includes('east')));
  assert.deepEqual(result.controls.find(s => s.id === 'without-ramp').order, []);
  assert.deepEqual(result.controls.find(s => s.id === 'without-screen').order, []);
  assert.deepEqual(result.controls.find(s => s.id === 'screen-only').order, ['screen']);
  assert.equal(result.controls.find(s => s.id === 'screen-turn-minus').order.length, 1);
  assert.ok(result.replay.every(row => row.exact));
  const counts = result.resources.lifecycle.map(({ staticBodies, totalBodies, meshes, materials, textures, casterRegistrations }) => ({ staticBodies, totalBodies, meshes, materials, textures, casterRegistrations }));
  assert.ok(counts.every(c => JSON.stringify(c) === JSON.stringify(counts[0])));
  assert.deepEqual(result.resources.afterDispose, { bodies: 0, meshes: 0, materials: 0, textures: 0, casterRegistrations: 0 });
  const sensitive = result.nearby.find(g => g.id === 'second-visit-sensitive').probes;
  assert.ok(sensitive.some(s => s.order.length < 4), 'Do not present the long return as a robust required challenge');
});

test('Crossing House manifest reproduces all saved positive and negative setups', async () => {
  const report = await validateFoundryDirectory('worlds/foundry/crossing-house', await loadHavok());
  assert.equal(report.id, 'crossing-house');
  assert.equal(report.shots.length, 5);
  assert.equal(report.customCode, null);
});
