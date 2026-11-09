// Replays the rally, then measures editor-detent neighbours and simpler worlds.
// This is an offline experiment. The gallery depends only on its JSON pair.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import preset from '../../worlds/foundry/return-address/preset.json' with { type: 'json' };
import { rangeOpeningSetup } from '../../lib/worldcraft-range.js';
import { runRange } from '../range/run.mjs';

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const seed = 20261109;
const opening = rangeOpeningSetup(preset);
const serve = { ...opening, charge: 0.68 };
const halfMetre = x => Math.round(x * 2) / 2;
const key = shot => JSON.stringify([shot.originX, shot.yaw, shot.elevation, shot.charge]);

async function fire(setups, document = preset) {
  const { lines, rejected } = await runRange({ preset: document, setups, seed, havok, omitPoints: true });
  assert.equal(rejected, 0);
  return lines.slice(1);
}

function receipt(shot) {
  return {
    setup: shot.setup, contacts: shot.contacts.map(contact => contact.body),
    finalContactPoint: shot.contacts.at(-1)?.point ?? null,
    terminal: shot.terminal, outcome: shot.outcome,
  };
}

// Use the first-contact x shown in the Play panel. The ball centre can differ
// at an edge. The contact ledger includes the tee as a distinct ground body.
function receiver(shot) {
  const contact = shot.contacts.at(-1);
  if (shot.terminal.reason !== 'first-ground-contact' || contact?.body !== 'worldcraft-tee') return null;
  const x = Number(contact.point.x.toFixed(2));
  if (Math.abs(x) > 10 || x * shot.setup.originX >= 0) return null;
  return halfMetre(x);
}

function twoFaceCatch(shot) {
  const order = shot.setup.originX < 0 ? ['west', 'east'] : ['east', 'west'];
  return receiver(shot) !== null && shot.contacts.length === 3
    && order.every((id, i) => shot.contacts[i].body === 'worldcraft-object-' + id);
}

function replyTo(shot) {
  return { ...shot.setup, originX: receiver(shot), yaw: -shot.setup.yaw };
}

const [initial, outbound] = await fire([opening, serve]);
assert.equal(initial.contacts.at(-1).body, 'worldcraft-ground');
assert.ok(twoFaceCatch(outbound));
const [reply] = await fire([replyTo(outbound)]);
assert.ok(twoFaceCatch(reply));
assert.equal(receiver(reply), opening.originX);

const otherSetups = {
  'edge-catch': { ...serve, charge: 0.62 },
  'yaw-neighbour': { ...serve, yaw: 4.5 },
  'unturned-reply': { ...serve, originX: receiver(outbound) },
  'short-lob': { ...serve, yaw: 70, elevation: 65, charge: 0 },
  'centre-seam': { ...serve, originX: 0, yaw: 0 },
};
const examples = await fire(Object.values(otherSetups));
const cases = { opening: receipt(initial), serve: receipt(outbound), reply: receipt(reply) };
Object.keys(otherSetups).forEach((id, i) => { cases[id] = receipt(examples[i]); });
assert.ok(twoFaceCatch(examples[0]));
assert.equal(receiver(examples[2]), null);
assert.ok(receiver(examples[3]) !== null && !twoFaceCatch(examples[3]));

// Cartesian box about the serve. Each dimension uses the actual UI detent.
const setups = [];
for (let x = -5; x <= -3; x += 0.5) {
  for (let yaw = 2.5; yaw <= 5.5; yaw += 0.5) {
    for (let elevation = 12; elevation <= 14; elevation += 0.5) {
      for (let pct = 65; pct <= 71; pct++) {
        setups.push({ ...serve, originX: x, yaw, elevation, charge: pct / 100 });
      }
    }
  }
}
const local = await fire(setups);
const catches = local.filter(twoFaceCatch);
const uniqueReplies = new Map(catches.map(shot => {
  const setup = replyTo(shot);
  return [key(setup), setup];
}));
const answers = await fire([...uniqueReplies.values()]);
const bySetup = new Map(answers.map(shot => [key(shot.setup), shot]));
let rallies = 0, closed = 0;
for (const shot of catches) {
  const answer = bySetup.get(key(replyTo(shot)));
  if (!twoFaceCatch(answer)) continue;
  rallies++;
  if (Math.abs(receiver(answer) - shot.setup.originX) <= 0.5) closed++;
}
const localResults = { tried: local.length, firstCatch: catches.length, twoCatches: rallies, withinOneOriginStep: closed, uniqueReplyShots: answers.length };
const powerRows = await fire(Array.from({ length: 35 }, (_, i) => ({ ...opening, charge: (54 + i) / 100 })));
const catchPercentages = powerRows.filter(twoFaceCatch).map(row => Math.round(row.setup.charge * 100));

// Endpoint-only comparison across the same yaw/power grid. The simpler
// controls get full credit for actual returns made by one wall.
const [west, east] = preset.objects;
const shots = [];
for (let yaw = -20; yaw <= 20; yaw += 0.5) {
  for (let pct = 52; pct <= 76; pct += 2) {
    shots.push({ ...serve, yaw, charge: pct / 100 });
  }
}
const comparisons = {};
for (const [label, objects] of Object.entries({
  pair: [west, east], westOnly: [west], flat: [{ ...west, x: 0, yaw: 0 }], empty: [],
})) {
  const document = { ...preset, objects, rules: { ...preset.rules, fixed: objects.some(o => o.id === west.id) ? [west.id] : [] } };
  const [sameServe, ...grid] = await fire([serve, ...shots], document);
  const good = grid.filter(row => receiver(row) !== null);
  comparisons[label] = {
    sameServe: receipt(sameServe), gridSize: grid.length, oppositeDeck: good.length,
    anyDownrangeFace: good.filter(row => row.contacts.some(contact => contact.body.startsWith('worldcraft-object-'))).length,
    example: good.length ? receipt(good[Math.floor(good.length / 2)]) : null,
  };
}

// Give the flat control a separately aimed return and let it serve back too.
const flat = { ...preset, objects: [{ ...west, x: 0, yaw: 0 }] };
const [flatServe] = await fire([{ ...serve, yaw: 14.5, charge: 0.58 }], flat);
const [flatReply] = await fire([replyTo(flatServe)], flat);
assert.equal(receiver(flatServe), 4);
assert.equal(receiver(flatReply), -4);
const flatRally = [receipt(flatServe), receipt(flatReply)];

const pieceSteps = {};
for (const [label, edit] of Object.entries({
  left: { x: east.x - 0.5 }, right: { x: east.x + 0.5 },
  near: { z: east.z - 0.5 }, far: { z: east.z + 0.5 },
  clockwise: { yaw: east.yaw + 5 }, counterclockwise: { yaw: east.yaw - 5 },
})) {
  const document = { ...preset, objects: [west, { ...east, ...edit }] };
  const [row] = await fire([serve], document);
  pieceSteps[label] = { catch: twoFaceCatch(row), ...receipt(row) };
}
console.log(JSON.stringify({ seed, cases, localResults, catchPercentages, comparisons, flatRally, pieceSteps }, null, 2));
