import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadHavok } from '../scripts/foundry/contact-sweep.mjs';
import { createReturnHarness } from '../docs/experiments/horizons/return/harness.mjs';
import { adaptRangePreset, exportRangePreset, parseRangePreset, validateRangePreset } from '../lib/worldcraft-range.js';
import { exportWorldJSON, parseWorldJSON, worldcraftIdentity } from '../lib/worldcraft-model.js';
import { foundryRecord } from '../lib/worldcraft-foundry.js';

const preset = parseRangePreset(await readFile(new URL('../worlds/foundry/radial-return/preset.json', import.meta.url), 'utf8'));
const havok = await loadHavok();
const setup = (elevation = 30, charge = .25) => ({ railIndex: 1, originX: 0, yaw: 0, elevation, charge });
const pieces = row => row.episodes.filter(e => e.body !== 'worldcraft-ground');
const order = row => pieces(row).map(e => e.body);
const noWall = validateRangePreset({ ...preset, objects: preset.objects.filter(o => o.id !== 'wall'), rules: { ...preset.rules, fixed: ['middle', 'inner'] } });

test('radial return is existing data, round trips its station and plate poses, and retains identity', () => {
  assert.equal(exportRangePreset(parseRangePreset(exportRangePreset(preset))), exportRangePreset(preset));
  const world = adaptRangePreset(preset).world;
  assert.deepEqual(parseWorldJSON(exportWorldJSON(world)), world);
  assert.equal(worldcraftIdentity(foundryRecord('radial-return').world), worldcraftIdentity(world));
  assert.deepEqual(world.launcher, { x: 0, z: 32 });
  assert.deepEqual(world.objects.filter(o => o.kind === 'plate').map(o => [o.lift, o.tilt]), [[3,90],[1,90]]);
});

test('proposed shot reverses at the wall, meets a real top, and skips the lower shelf across player detents', () => {
  const h = createReturnHarness(havok, preset);
  try {
    const first = h.shoot(setup());
    assert.deepEqual(order(first), ['worldcraft-object-wall','worldcraft-object-middle']);
    const [wall, middle] = pieces(first);
    assert.ok(wall.incoming[2] > 13 && wall.outgoing[2] < -11);
    assert.ok(middle.normal[1] < -.999 && middle.incoming[1] < -6 && middle.outgoing[1] > 5);
    assert.ok(middle.point[2] > 46 && middle.point[2] < 50 && Math.abs(middle.point[1]-3.35) < .1);
    assert.ok(middle.freeFlightSincePrior > .25);
    assert.equal(first.terminal.reason, 'first-ground-contact');
    for (const [axis,delta] of [['yaw',-.5],['yaw',.5],['elevation',-.5],['elevation',.5],['charge',-.01],['charge',.01],['originX',-.5],['originX',.5]]) {
      const input = setup(); input[axis] += delta;
      const next = h.shoot(input);
      assert.deepEqual(order(next), order(first), `${axis} ${delta}`);
      assert.ok(pieces(next)[1].normal[1] < -.999);
    }
    assert.deepEqual(h.shoot(setup()), first);
    assert.equal(h.replace(noWall).ok, true);
    const control = h.shoot(setup());
    assert.equal(pieces(control).length, 0);
    assert.ok(control.terminal.position[2] > 55);
  } finally { assert.deepEqual(h.dispose().after, { physicsBodies:0, sceneMeshes:0, materials:0, textures:0, shadowCasters:0 }); }
});

test('a real detent shot also descends top-to-top; one power detent deliberately skips the inner shelf', () => {
  const h = createReturnHarness(havok, preset);
  try {
    const descent = h.shoot(setup(32,.22)), contacts = pieces(descent);
    assert.deepEqual(order(descent), ['worldcraft-object-wall','worldcraft-object-middle','worldcraft-object-inner']);
    for (const e of contacts.slice(1)) {
      assert.ok(e.normal[1] < -.999 && e.incoming[1] < 0 && e.outgoing[1] > 0);
    }
    assert.ok(contacts[2].freeFlightSincePrior > 1.1);
    assert.ok(contacts[1].point[1] > contacts[2].point[1] + 1.9);
    assert.equal(descent.terminal.reason, 'first-ground-contact');
    assert.deepEqual(order(h.shoot(setup(32,.23))), ['worldcraft-object-wall','worldcraft-object-middle']);
    const edge = pieces(h.shoot(setup(32.5,.22))).at(-1);
    assert.equal(edge.body,'worldcraft-object-inner');
    assert.ok(Math.abs(edge.normal[1]) < .9); // a counted contact is not a top landing
  } finally { h.dispose(); }
});
