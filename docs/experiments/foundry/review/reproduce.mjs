// Independent Havok reproduction for the six Foundry v0 candidates.
// Same step loop the game uses (scripts/range/run.mjs createRangeHarness):
// 120 Hz, substep 1000/120, first-ground termination unchanged.
// This file does not call the authors' sweep scripts.
//
//   node docs/experiments/foundry/review/reproduce.mjs
//   node docs/experiments/foundry/review/reproduce.mjs --only return-address,bell-loft
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { validateWorldcraftShot } from '../../../../lib/worldcraft-model.js';
import { adaptRangePreset, validateRangePreset } from '../../../../lib/worldcraft-range.js';
import { createRangeHarness } from '../../../../scripts/range/run.mjs';

Logger.LogLevels = 0;

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, 'fixtures');
const OUT = resolve(HERE, 'results');
const SEED = 20261109;
const KIT = '1ad3166d0839ea042379f5a861ed7523cb46d47e';
const WORLDS = {
  'the-other-way': '40e805546277e9b328db280374f5957dfac99936',
  'open-contacts': 'a3c719c5ba660d48f8ee954855a038508dc4fecc',
  'right-angle': '57b82bd95d3d726ebb559e7f8533fab52e58ba32',
  'the-carry': '5b8244389bde44ffbd8ee2d553cbefa0f4b6ea37',
  'return-address': '4041bb67cd9051a3b7e265ed6512e88c6ac2e5b0',
  'bell-loft': '8c2df88b4f5b7ea81dcf3ce3a59ba5c95aefec2b',
};

const only = new Set((process.argv.find((arg, index) => process.argv[index - 1] === '--only') ?? '').split(',').filter(Boolean));
const want = id => only.size === 0 || only.has(id);

const shot = (originX, yaw, elevation, charge) => ({
  railIndex: 1,
  originX: Math.round(originX * 2) / 2,
  yaw: Math.round(yaw * 2) / 2,
  elevation: Math.round(elevation * 2) / 2,
  charge: Math.round(charge * 100) / 100,
});
const range = (from, to, step) => {
  const values = [];
  const n = Math.round((to - from) / step);
  for (let i = 0; i <= n; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
};
const hypot2 = (x, z) => Math.hypot(x, z);
const pieceId = body => (typeof body === 'string' && body.startsWith('worldcraft-object-') ? body.slice('worldcraft-object-'.length) : null);

let session = null;
let fired = 0;
const started = performance.now();

function log(message) {
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  process.stderr.write(`[${seconds}s ${fired}] ${message}\n`);
}

async function loadPair(id) {
  const presetText = await readFile(resolve(FIXTURES, `${id}.preset.json`), 'utf8');
  const manifestText = await readFile(resolve(FIXTURES, `${id}.manifest.json`), 'utf8');
  return {
    id,
    sha: WORLDS[id],
    presetHash: createHash('sha256').update(presetText).digest('hex'),
    preset: validateRangePreset(JSON.parse(presetText)),
    manifest: JSON.parse(manifestText),
  };
}

function edit(preset, mutate) {
  try {
    return { ok: true, preset: validateRangePreset(mutate(structuredClone(preset))) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
function move(preset, id, patch) {
  return edit(preset, draft => {
    draft.objects = draft.objects.map(object => (object.id === id ? { ...object, ...patch } : object));
    return draft;
  });
}
function drop(preset, ids) {
  const gone = new Set(ids);
  return edit(preset, draft => {
    draft.objects = draft.objects.filter(object => !gone.has(object.id));
    draft.rules.fixed = draft.rules.fixed.filter(id => !gone.has(id));
    return draft;
  });
}
function replaceObjects(preset, objects, fixed = []) {
  return edit(preset, draft => {
    draft.objects = objects;
    draft.rules.fixed = fixed;
    return draft;
  });
}
function unlockLauncher(preset) {
  return edit(preset, draft => {
    draft.rules.launcher = { ...draft.rules.launcher, fixed: false };
    return draft;
  });
}

function summarize(last) {
  const contacts = (last.contacts ?? []).map(contact => ({
    body: contact.body,
    piece: pieceId(contact.body),
    first: contact.first,
    count: contact.count,
    x: contact.point.x,
    y: contact.point.y,
    z: contact.point.z,
  }));
  const tee = contacts.find(contact => contact.body === 'worldcraft-tee') ?? null;
  const notes = (last.resonance?.impacts ?? []).map(impact => ({
    piece: impact.piece,
    role: impact.role,
    note: impact.note,
    material: impact.material,
    time: impact.time,
    gain: impact.gain,
  }));
  return {
    reason: last.terminal.reason,
    elapsed: last.terminal.elapsed,
    position: [...last.terminal.position],
    outcome: last.goalResult ? { kind: last.goalResult.kind, status: last.goalResult.status, distance: last.goalResult.distance ?? null } : null,
    order: contacts.filter(contact => contact.piece).map(contact => contact.piece),
    contacts,
    tee: tee ? { x: tee.x, y: tee.y, z: tee.z, first: tee.first } : null,
    notes,
  };
}

function fire(preset, setup) {
  const world = adaptRangePreset(preset).world;
  let validated;
  try {
    validated = validateWorldcraftShot(world, setup);
  } catch (error) {
    return { rejected: true, error: error.message, setup };
  }
  fired += 1;
  const last = session.shoot(world, validated);
  return { rejected: false, setup: validated, ...summarize(last) };
}

function sameTerminal(actual, expected) {
  return !actual.rejected
    && actual.reason === expected.reason
    && Object.is(actual.elapsed, expected.elapsed)
    && actual.position.length === expected.position.length
    && actual.position.every((value, index) => Object.is(value, expected.position[index]))
    && actual.outcome?.kind === expected.outcome.kind
    && actual.outcome?.status === expected.outcome.status;
}

function replayManifest(pair) {
  return pair.manifest.testedShots.map(expected => {
    const actual = fire(pair.preset, expected.setup);
    const wanted = {
      reason: expected.terminal.reason,
      elapsed: expected.terminal.elapsed,
      position: expected.terminal.position,
      outcome: expected.outcome,
    };
    return { id: expected.id, match: sameTerminal(actual, wanted), expected: wanted, actual: compact(actual) };
  });
}

function compact(row) {
  if (!row) return null;
  if (row.rejected) return { rejected: true, error: row.error, setup: row.setup };
  const [x, y, z] = row.position;
  return {
    setup: row.setup,
    reason: row.reason,
    elapsed: row.elapsed,
    elapsedExact: Number.isFinite(row.elapsed) ? row.elapsed.toPrecision(17) : null,
    position: row.position,
    outcome: row.outcome,
    order: row.order,
    notes: row.notes.map(note => `${note.piece}:${note.note}@${note.time.toFixed(3)}/${note.gain.toFixed(3)}`),
    tee: row.tee,
    carriage: row.tee ? carriageOf(row.tee.x) : null,
    horizontal: hypot2(x, z),
    y,
    z,
  };
}

function carriageOf(x) {
  const nearest = Math.round(x * 2) / 2;
  return { contactX: x, nearest, reachable: nearest >= -10 && nearest <= 10 };
}

function axisNeighbors(setup, { origin = false } = {}) {
  const rows = [
    ['yaw-0.5', shot(setup.originX, setup.yaw - 0.5, setup.elevation, setup.charge)],
    ['yaw+0.5', shot(setup.originX, setup.yaw + 0.5, setup.elevation, setup.charge)],
    ['elev-0.5', shot(setup.originX, setup.yaw, setup.elevation - 0.5, setup.charge)],
    ['elev+0.5', shot(setup.originX, setup.yaw, setup.elevation + 0.5, setup.charge)],
    ['charge-0.01', shot(setup.originX, setup.yaw, setup.elevation, setup.charge - 0.01)],
    ['charge+0.01', shot(setup.originX, setup.yaw, setup.elevation, setup.charge + 0.01)],
  ];
  if (origin) {
    rows.push(
      ['origin-0.5', shot(setup.originX - 0.5, setup.yaw, setup.elevation, setup.charge)],
      ['origin+0.5', shot(setup.originX + 0.5, setup.yaw, setup.elevation, setup.charge)],
    );
  }
  return rows;
}

function box26(setup) {
  const rows = [];
  for (const yaw of [-0.5, 0, 0.5]) {
    for (const elevation of [-0.5, 0, 0.5]) {
      for (const charge of [-0.01, 0, 0.01]) {
        if (yaw === 0 && elevation === 0 && charge === 0) continue;
        rows.push(shot(setup.originX, setup.yaw + yaw, setup.elevation + elevation, setup.charge + charge));
      }
    }
  }
  return rows;
}

function otherKind(row) {
  if (row.rejected) return 'rejected';
  if (row.reason !== 'first-ground-contact') return row.reason;
  const blocks = row.order.filter(id => id.endsWith('-stop'));
  const past = row.position[2] > 39;
  if (blocks.length === 0 && past) return 'clear';
  if (blocks.length && past) return 'clip';
  if (blocks.length) return `stop:${blocks.join('+')}`;
  return 'short';
}

function carryClear(row) {
  if (row.rejected || row.reason !== 'first-ground-contact') return false;
  return hypot2(row.position[0], row.position[2] - 53) <= 2.5 + 1e-9;
}

function twoFace(row, { maxDistance = Infinity } = {}) {
  if (row.rejected || row.reason !== 'first-ground-contact') return false;
  const faces = new Set(row.order);
  if (!faces.has('side-face') || !faces.has('back-face')) return false;
  return hypot2(row.position[0] - row.setup.originX, row.position[2]) <= maxDistance;
}

function oppositeDeck(row, originX) {
  if (row.rejected || row.reason !== 'first-ground-contact' || !row.tee) return false;
  const side = Math.sign(row.tee.x) !== Math.sign(originX) && row.tee.x !== 0;
  const carriage = carriageOf(row.tee.x);
  return side && carriage.reachable && row.contacts.at(-1)?.body === 'worldcraft-tee';
}

function twoFaceCatch(row, originX) {
  if (!oppositeDeck(row, originX)) return false;
  const pieces = row.order;
  const westFirst = originX < 0 && pieces.length === 2 && pieces[0] === 'west' && pieces[1] === 'east';
  const eastFirst = originX > 0 && pieces.length === 2 && pieces[0] === 'east' && pieces[1] === 'west';
  return westFirst || eastFirst;
}

function rally(preset, start, turns = 3) {
  const rows = [];
  let setup = { ...start };
  for (let exchange = 1; exchange <= turns; exchange += 1) {
    const row = fire(preset, setup);
    const sameAs = rows.find(item => item.setup && item.setup.originX === setup.originX && item.setup.yaw === setup.yaw && item.setup.elevation === setup.elevation && item.setup.charge === setup.charge);
    const carriage = row.tee ? carriageOf(row.tee.x) : null;
    rows.push({
      exchange,
      sameSetupAs: sameAs?.exchange ?? null,
      ...compact(row),
      twoFace: twoFaceCatch(row, setup.originX),
      opposite: oppositeDeck(row, setup.originX),
    });
    if (!carriage?.reachable) break;
    setup = shot(carriage.nearest, -setup.yaw, setup.elevation, setup.charge);
  }
  return rows;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const wasm = await readFile(new URL('../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  const havok = await Havok({ wasmBinary: wasm });
  const boot = await loadPair('the-other-way');
  session = createRangeHarness(havok, adaptRangePreset(boot.preset).world, 'foundry-review');
  const reports = {};
  try {
    if (want('the-other-way')) reports['the-other-way'] = runOther(boot);
    if (want('open-contacts')) reports['open-contacts'] = runContacts(await loadPair('open-contacts'));
    if (want('right-angle')) reports['right-angle'] = runAngle(await loadPair('right-angle'));
    if (want('the-carry')) reports['the-carry'] = runCarry(await loadPair('the-carry'));
    if (want('return-address')) reports['return-address'] = runReturn(await loadPair('return-address'));
    if (want('bell-loft')) reports['bell-loft'] = runBell(await loadPair('bell-loft'));
  } finally {
    session.dispose();
  }
  const index = {
    seed: SEED,
    kit: KIT,
    node: process.version,
    shots: fired,
    seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
    worlds: Object.fromEntries(Object.entries(reports).map(([id, report]) => [id, { sha: report.sha, presetHash: report.presetHash, manifestMatches: report.manifest.every(item => item.match) }])),
  };
  await writeFile(resolve(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  log(`wrote ${fired} shots`);
}

function runOther(pair) {
  log('the-other-way');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const opening = shot(0, 0, 16, 0.55);
  const left = shot(0, -10.5, 16, 0.55);
  const right = shot(0, 10.5, 16, 0.55);
  const carry = shot(0, 0, 24, 0.55);
  const neighbours = {
    opening: axisNeighbors(opening, { origin: true }).map(([label, setup]) => ({ label, kind: otherKind(fire(preset, setup)) })),
    left: axisNeighbors(left, { origin: true }).map(([label, setup]) => ({ label, kind: otherKind(fire(preset, setup)) })),
    right: axisNeighbors(right, { origin: true }).map(([label, setup]) => ({ label, kind: otherKind(fire(preset, setup)) })),
    carry: axisNeighbors(carry, { origin: true }).map(([label, setup]) => ({ label, kind: otherKind(fire(preset, setup)) })),
  };
  const yawEdges = [-48.5, -27.5, -18, -17.5, -15.5, -15, -6, -5.5, 0, 5.5, 6, 15, 15.5, 17.5, 18, 27.5, 48.5]
    .map(yaw => ({ yaw, kind: otherKind(fire(preset, shot(0, yaw, 16, 0.55))) }));
  const elevationEdges = [5, 9.5, 10.5, 17, 17.5, 19.5, 20, 24, 45, 70, 70.5, 71, 74, 74.5, 85]
    .map(elevation => ({ elevation, kind: otherKind(fire(preset, shot(0, 0, elevation, 0.55))) }));
  const chargeEdges = [0.2, 0.42, 0.43, 0.44, 0.55, 0.58, 0.59, 0.64, 0.65, 1]
    .map(charge => ({ charge, kind: otherKind(fire(preset, shot(0, 0, 16, charge))) }));
  const origins = [-10, -3.5, -3, 0, 3, 3.5, 10]
    .map(originX => ({ originX, kind: otherKind(fire(preset, shot(originX, 0, 16, 0.55))) }));
  const middleOnly = drop(preset, ['left-stop', 'right-stop']);
  const empty = drop(preset, ['left-stop', 'middle-stop', 'right-stop']);
  const simpler = {
    middleOnly: middleOnly.ok ? [opening, left, right, carry].map(setup => ({ setup, kind: otherKind(fire(middleOnly.preset, setup)) })) : middleOnly,
    empty: empty.ok ? [opening, left, carry].map(setup => {
      const row = fire(empty.preset, setup);
      return { setup, kind: otherKind(row), z: row.position?.[2] ?? null };
    }) : empty,
  };
  const report = { id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest, neighbours, yawEdges, elevationEdges, chargeEdges, origins, simpler };
  return finish(pair.id, report);
}

function runContacts(pair) {
  log('open-contacts');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const opening = shot(0, 0, 18, 0.55);
  const two = shot(0, 4, 18, 0.55);
  const rattle = shot(0, 6, 18, 0.55);
  const lob = shot(0, 0, 26, 0.55);
  const kind = row => (row.rejected ? 'rejected' : row.order.join('>') || 'silent');
  const neighbours = {
    opening: axisNeighbors(opening, { origin: true }).map(([label, setup]) => ({ label, order: kind(fire(preset, setup)) })),
    twoNote: axisNeighbors(two).map(([label, setup]) => ({ label, order: kind(fire(preset, setup)) })),
    rattle: axisNeighbors(rattle).map(([label, setup]) => ({ label, order: kind(fire(preset, setup)) })),
    lob: axisNeighbors(lob).map(([label, setup]) => ({ label, order: kind(fire(preset, setup)) })),
  };
  const aimFamily = range(-14, 14, 0.5).map(yaw => ({ yaw, order: kind(fire(preset, shot(0, yaw, 18, 0.55))) }));
  const bankTurns = range(-30, 30, 5).map(yaw => {
    const layout = move(preset, 'bank-timber', { yaw });
    if (!layout.ok) return { yaw, error: layout.error };
    return { yaw, order: kind(fire(layout.preset, opening)) };
  });
  const lobs = [20, 23, 23.5, 26, 28, 28.5, 32].map(elevation => ({ elevation, order: kind(fire(preset, shot(0, 0, elevation, 0.55))) }));
  const lobCharge = [0.5, 0.51, 0.52, 0.55, 0.57, 0.58, 0.6].map(charge => ({ charge, order: kind(fire(preset, shot(0, 0, 26, charge))) }));
  const directPlates = [
    shot(0, 6, 12, 0.55), shot(0, 10, 12, 0.55), shot(0, 16, 12, 0.55), shot(0, 16.5, 12, 0.55),
    shot(0, 27, 10, 0.55), shot(0, 30, 10, 0.55), shot(0, 35, 10, 0.55), shot(0, -30, 10, 0.55),
  ].map(setup => ({ setup, order: kind(fire(preset, setup)) }));
  const noBank = drop(preset, ['bank-timber']);
  const noPlates = drop(preset, ['plate-return-left', 'plate-return-right', 'plate-aim-left', 'plate-aim-right', 'plate-deep']);
  const simpler = {
    noBank: noBank.ok ? [opening, two, rattle, lob, shot(0, 10, 12, 0.55)].map(setup => ({ setup, order: kind(fire(noBank.preset, setup)) })) : noBank,
    bankOnly: noPlates.ok ? [opening, two, rattle, lob].map(setup => ({ setup, order: kind(fire(noPlates.preset, setup)) })) : noPlates,
  };
  const lowThird = fire(preset, rattle);
  const third = lowThird.contacts?.filter(contact => contact.piece === 'bank-timber') ?? [];
  return finish(pair.id, {
    id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest, neighbours, aimFamily, bankTurns, lobs, lobCharge, directPlates, simpler,
    rattleBankHeights: third.map(contact => ({ y: contact.y, first: contact.first, count: contact.count })),
  });
}

function runAngle(pair) {
  log('right-angle');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const recorded = shot(0, 38.5, 14.5, 0.86);
  const opening = shot(0, 0, 18, 0.55);
  const classify = row => {
    if (row.rejected) return { rejected: true, error: row.error };
    const distance = hypot2(row.position[0] - row.setup.originX, row.position[2]);
    return {
      order: row.order,
      distance: Number(distance.toFixed(3)),
      both: row.order.includes('side-face') && row.order.includes('back-face'),
      inside14: distance <= 14,
      inside16: distance <= 16,
      reason: row.reason,
      position: row.position,
    };
  };
  const recordedRow = fire(preset, recorded);
  const neighbours26 = box26(recorded).map(setup => classify(fire(preset, setup)));
  const openingNeighbours = [shot(0, -0.5, 18, 0.55), shot(0, 0.5, 18, 0.55), shot(0, -1, 18, 0.55), shot(0, 1, 18, 0.55), shot(0, 5, 18, 0.55)]
    .map(setup => ({ setup, ...classify(fire(preset, setup)) }));
  const origins = range(-2, 2, 0.5).map(originX => ({ originX, ...classify(fire(preset, shot(originX, 38.5, 14.5, 0.86))) }));
  const yaws = [32, 36, 38.5, 42, 46];
  const elevations = [12, 14.5, 18, 24];
  const charges = [0.6, 0.7, 0.8, 0.86, 0.9];
  const sample = [];
  let sampleReturns = 0;
  let sampleRobust = 0;
  for (const yaw of yaws) {
    for (const elevation of elevations) {
      for (const charge of charges) {
        const setup = shot(0, yaw, elevation, charge);
        const row = classify(fire(preset, setup));
        const returned = row.both && row.inside14 && row.order.length === 2;
        let robust = null;
        if (returned) {
          sampleReturns += 1;
          const neighbours = box26(setup).map(next => classify(fire(preset, next)));
          robust = neighbours.every(item => item.both && item.inside16);
          if (robust) sampleRobust += 1;
        }
        sample.push({ setup, order: row.order, distance: row.distance, returned, robust });
      }
    }
  }
  const edges = [shot(0, 28, 14.5, 0.86), shot(0, 50, 14.5, 0.86), shot(0, 54, 14, 0.7)]
    .map(setup => ({ setup, ...classify(fire(preset, setup)) }));
  const sideOnly = drop(preset, ['back-face']);
  const backOnly = drop(preset, ['side-face']);
  const oneWall = replaceObjects(preset, [{ id: 'only-face', kind: 'bank', x: 16, z: 28.5, yaw: 45, voice: { material: 'timber', degree: 0 } }], ['only-face']);
  const simpler = {
    sideOnly: sideOnly.ok ? { recorded: classify(fire(sideOnly.preset, recorded)), opening: classify(fire(sideOnly.preset, opening)) } : sideOnly,
    backOnly: backOnly.ok ? { recorded: classify(fire(backOnly.preset, recorded)), opening: classify(fire(backOnly.preset, opening)) } : backOnly,
    angledSingle: oneWall.ok ? classify(fire(oneWall.preset, recorded)) : oneWall,
  };
  const robust26 = neighbours26.filter(item => item.both && item.inside16).length;
  return finish(pair.id, {
    id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest,
    recorded: classify(recordedRow),
    recordedContacts: recordedRow.contacts,
    neighbours26,
    robust26,
    neighbourCount: neighbours26.length,
    openingNeighbours,
    origins,
    sample: { cells: sample.length, returnsInside14ExactlyTwo: sampleReturns, robustAll26Inside16: sampleRobust, rows: sample },
    edges,
    simpler,
    note: 'Sample is an independent 5×4×5 lattice inside the claimed 32–46° / 12–24° / 0.60–0.90 window. It is not a recount of 4263 or 2650.',
  });
}

function runCarry(pair) {
  log('the-carry');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const locked = shot(0, 0, 18, 0.45);
  const rejected = [shot(0, 0.5, 18, 0.45), shot(0, 0, 18.5, 0.45), shot(0, 0, 18, 0.46), shot(0, 0, 19, 0.6)]
    .map(setup => compact(fire(preset, setup)));
  const moved = move(preset, 'ramp-yours', { z: 18.5 });
  const neighbour = moved.ok ? compact(fire(moved.preset, locked)) : moved;
  const examples = [
    [0, 24, 0], [0, 32, 0], [0, 36, 0], [0, 40, 0], [4, 32, 0], [0, 32, 5], [0, 32, 10], [4.5, 32, 0], [5, 32, 0], [0, 20, 0], [0, 20.5, 0],
  ].map(([x, z, yaw]) => {
    const layout = move(preset, 'ramp-yours', { x, z, yaw });
    if (!layout.ok) return { pose: [x, z, yaw], error: layout.error };
    const row = fire(layout.preset, locked);
    return { pose: [x, z, yaw], clear: carryClear(row), distance: row.outcome?.distance ?? null, order: row.order, elapsed: row.elapsed, position: row.position };
  });
  const xRun = range(-6, 6, 0.5).map(x => {
    const layout = move(preset, 'ramp-yours', { x, z: 36, yaw: 0 });
    const row = layout.ok ? fire(layout.preset, locked) : null;
    return { x, ok: Boolean(layout.ok), clear: row ? carryClear(row) : false, error: layout.ok ? null : layout.error };
  });
  const zRun = range(20, 41, 0.5).map(z => {
    const layout = move(preset, 'ramp-yours', { x: 0, z, yaw: 0 });
    const row = layout.ok ? fire(layout.preset, locked) : null;
    return { z, ok: Boolean(layout.ok), clear: row ? carryClear(row) : false };
  });
  const yawRun = range(-20, 20, 5).map(yaw => {
    const layout = move(preset, 'ramp-yours', { x: 0, z: 36, yaw });
    const row = layout.ok ? fire(layout.preset, locked) : null;
    return { yaw, ok: Boolean(layout.ok), clear: row ? carryClear(row) : false };
  });
  const free = unlockLauncher(preset);
  const direct = shot(0, 0, 19, 0.6);
  const directRow = free.ok ? fire(free.preset, direct) : null;
  const directNeighbours = free.ok ? axisNeighbors(direct).map(([label, setup]) => {
    const row = fire(free.preset, setup);
    return { label, clear: carryClear(row), distance: row.outcome?.distance ?? null, order: row.order, rejected: row.rejected, error: row.error ?? null };
  }) : null;
  const directWidths = free.ok ? {
    yaw: range(-4, 4, 0.5).map(yaw => ({ yaw, clear: carryClear(fire(free.preset, shot(0, yaw, 19, 0.6))) })),
    elevation: range(17, 22, 0.5).map(elevation => ({ elevation, clear: carryClear(fire(free.preset, shot(0, 0, elevation, 0.6))) })),
    charge: range(0.56, 0.64, 0.01).map(charge => ({ charge, clear: carryClear(fire(free.preset, shot(0, 0, 19, charge))) })),
  } : null;
  const empty = drop(preset, ['ramp-yours']);
  const block = replaceObjects(preset, [{ id: 'block-try', kind: 'block', x: -1, z: 28, yaw: 0 }]);
  const bank = replaceObjects(preset, [{ id: 'bank-try', kind: 'bank', x: 0, z: 32, yaw: 0, voice: { material: 'timber', degree: 0 } }]);
  const firedSimpler = layout => {
    if (!layout.ok) return layout;
    const row = fire(layout.preset, locked);
    return { ...compact(row), clear: carryClear(row) };
  };
  const simpler = {
    empty: firedSimpler(empty),
    blockNearestClaim: firedSimpler(block),
    bankWhereRampClears: firedSimpler(bank),
  };
  return finish(pair.id, {
    id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest, rejected, neighbour, examples,
    xRun, zRun, yawRun,
    direct: directRow ? { ...compact(directRow), clear: carryClear(directRow), onShippedPreset: compact(fire(preset, direct)) } : free,
    directNeighbours, directWidths, simpler,
  });
}

function runReturn(pair) {
  log('return-address');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const serve = shot(-4, 4, 13, 0.68);
  const opening = shot(-4, 4, 13, 0.58);
  const serveRow = fire(preset, serve);
  log(`serve order=${(serveRow.order ?? []).join('>')} tee=${serveRow.tee?.x ?? 'none'} last=${serveRow.contacts?.at(-1)?.body ?? 'none'}`);
  const neighbours = axisNeighbors(serve, { origin: true }).map(([label, setup]) => {
    const row = fire(preset, setup);
    return { label, twoFace: twoFaceCatch(row, setup.originX), opposite: oppositeDeck(row, setup.originX), tee: row.tee, terminalX: row.position?.[0] ?? null, order: row.order, rejected: row.rejected };
  });
  const chain = rally(preset, serve, 4);
  const drifted = rally(preset, shot(-4, 4.5, 13, 0.68), 4);
  const power = range(0.54, 0.88, 0.01).map(charge => {
    const row = fire(preset, shot(-4, 4, 13, charge));
    return { charge, twoFace: twoFaceCatch(row, -4), opposite: oppositeDeck(row, -4), order: row.order, teeX: row.tee?.x ?? null, terminalZ: row.position?.[2] ?? null };
  });
  const faceEdits = [
    ['x+0.5', { x: 5.5 }], ['x-0.5', { x: 4.5 }], ['z+0.5', { z: 16.5 }], ['z-0.5', { z: 15.5 }], ['yaw+5', { yaw: 50 }], ['yaw-5', { yaw: 40 }],
  ].map(([label, patch]) => {
    const layout = move(preset, 'east', patch);
    if (!layout.ok) return { label, error: layout.error };
    const row = fire(layout.preset, serve);
    return { label, twoFace: twoFaceCatch(row, -4), teeX: row.tee?.x ?? null, terminal: row.position, order: row.order };
  });
  const origins = [-5, -4.5, -4, -3.5, -3];
  const yaws = [2.5, 3, 3.5, 4, 4.5, 5, 5.5];
  const elevations = [12, 12.5, 13, 13.5, 14];
  const charges = [0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.71];
  let firstCatch = 0;
  let secondCatch = 0;
  let backToSender = 0;
  const firstMisses = [];
  for (const originX of origins) {
    for (const yaw of yaws) {
      for (const elevation of elevations) {
        for (const charge of charges) {
          const row = fire(preset, shot(originX, yaw, elevation, charge));
          const caught = twoFaceCatch(row, originX);
          if (!caught) {
            if (firstMisses.length < 8) firstMisses.push({ setup: shot(originX, yaw, elevation, charge), order: row.order, teeX: row.tee?.x ?? null, reason: row.reason });
            continue;
          }
          firstCatch += 1;
          const carriage = carriageOf(row.tee.x);
          const reply = fire(preset, shot(carriage.nearest, -yaw, elevation, charge));
          if (!twoFaceCatch(reply, carriage.nearest)) continue;
          secondCatch += 1;
          const back = carriageOf(reply.tee.x);
          if (Math.abs(back.nearest - originX) <= 0.5) backToSender += 1;
        }
      }
    }
  }
  const westOnly = drop(preset, ['east']);
  const flat = replaceObjects(preset, [{ id: 'flat', kind: 'bank', x: 0, z: 16, yaw: 0, voice: { material: 'timber', degree: 0 } }], ['flat']);
  const empty = drop(preset, ['west', 'east']);
  const controlSetups = range(-20, 20, 2).flatMap(yaw => range(0.52, 0.76, 0.04).map(charge => shot(-4, yaw, 13, charge)));
  const control = layout => {
    if (!layout.ok) return layout;
    let opposite = 0;
    let anyPiece = 0;
    for (const setup of controlSetups) {
      const row = fire(layout.preset, setup);
      if (oppositeDeck(row, -4)) opposite += 1;
      if (row.order?.length) anyPiece += 1;
    }
    return { fired: controlSetups.length, opposite, withPieceContact: anyPiece };
  };
  const flatServe = flat.ok ? fire(flat.preset, shot(-4, 14.5, 13, 0.58)) : null;
  const flatReply = flatServe?.tee ? fire(flat.preset, shot(carriageOf(flatServe.tee.x).nearest, -14.5, 13, 0.58)) : null;
  const lob = fire(preset, shot(-4, 70, 65, 0));
  return finish(pair.id, {
    id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest,
    serveDetail: {
      terminal: serveRow.position,
      tee: serveRow.tee,
      carriage: serveRow.tee ? carriageOf(serveRow.tee.x) : null,
      order: serveRow.order,
      contacts: serveRow.contacts,
      readableFromExistingLedger: Boolean(serveRow.tee && Number.isFinite(serveRow.tee.x)),
    },
    neighbours,
    chain,
    drifted,
    power,
    faceEdits,
    localBox: { fired: origins.length * yaws.length * elevations.length * charges.length, firstCatch, secondCatch, backToSender, firstMisses },
    controls: {
      westOnly: control(westOnly),
      flat: control(flat),
      empty: control(empty),
      serveOnWestOnly: westOnly.ok ? compact(fire(westOnly.preset, serve)) : westOnly,
      serveOnFlat: flat.ok ? compact(fire(flat.preset, serve)) : flat,
      serveOnEmpty: empty.ok ? compact(fire(empty.preset, serve)) : empty,
      flatRally: flatServe ? { serve: compact(flatServe), reply: flatReply ? compact(flatReply) : null } : flat,
      directLob: { ...compact(lob), opposite: oppositeDeck(lob, -4), order: lob.order },
      openingStillShort: compact(fire(preset, opening)),
    },
    controlGrid: 'yaw -20..20 step 2, charge 0.52..0.76 step 0.04, elevation 13, origin -4. Not the author 1053-shot grid.',
  });
}

function runBell(pair) {
  log('bell-loft');
  const preset = pair.preset;
  const manifest = replayManifest(pair);
  const setups = [
    ['opening', shot(0, 0, 12, 0.49)],
    ['charge-down', shot(0, 0, 12, 0.48)],
    ['charge-up', shot(0, 0, 12, 0.5)],
    ['yaw-down', shot(0, -0.5, 12, 0.49)],
    ['yaw-up', shot(0, 0.5, 12, 0.49)],
    ['elev-down', shot(0, 0, 11.5, 0.49)],
    ['elev-up', shot(0, 0, 12.5, 0.49)],
    ['lob', shot(0, 0, 50, 0.5)],
    ['slam', shot(0, 0, 30, 0.57)],
    ['stock', shot(0, 0, 18, 0.55)],
    ['across', shot(8, -10, 12, 0.49)],
  ];
  const shut = move(preset, 'door', { x: -4, z: 49, yaw: 0 });
  const describe = row => ({
    reason: row.reason,
    elapsed: row.elapsed,
    position: row.position,
    order: row.order,
    notes: row.notes?.map(note => `${note.note}@${note.time.toFixed(2)}/${note.gain.toFixed(2)}`) ?? [],
    floors: (row.contacts ?? []).filter(contact => contact.piece?.startsWith('floor-')).map(contact => contact.piece),
  });
  const compare = setups.map(([label, setup]) => ({
    label,
    open: describe(fire(preset, setup)),
    shut: shut.ok ? describe(fire(shut.preset, setup)) : shut,
  }));
  const oneStep = move(preset, 'door', { x: 8.5, z: 49, yaw: 0 });
  const partial = [8.5, 4, 0, -4].map(x => {
    const layout = move(preset, 'door', { x, z: 49, yaw: 0 });
    if (!layout.ok) return { x, error: layout.error };
    return { x, ...describe(fire(layout.preset, shot(0, 0, 12, 0.49))) };
  });
  const noBells = drop(shut.ok ? shut.preset : preset, ['bell-west', 'bell-east', 'bell-back']);
  const noStair = shut.ok ? drop(shut.preset, ['stair']) : shut;
  const floorsOnly = drop(preset, ['bell-west', 'bell-east', 'bell-back', 'door', 'stair']);
  const simpler = {
    doorOneStep: oneStep.ok ? describe(fire(oneStep.preset, shot(0, 0, 12, 0.49))) : oneStep,
    doorPositions: partial,
    shutWithoutBellWalls: noBells.ok ? describe(fire(noBells.preset, shot(0, 0, 12, 0.49))) : noBells,
    shutWithoutStair: noStair.ok ? describe(fire(noStair.preset, shot(0, 0, 12, 0.49))) : noStair,
    floorsOnly: floorsOnly.ok ? describe(fire(floorsOnly.preset, shot(0, 0, 12, 0.49))) : floorsOnly,
  };
  const openingShut = compare.find(item => item.label === 'opening');
  return finish(pair.id, {
    id: pair.id, sha: pair.sha, presetHash: pair.presetHash, manifest, shutLegal: shut.ok, shutError: shut.ok ? null : shut.error, compare, simpler,
    openingShutRest: openingShut?.shut ?? null,
  });
}

function finish(id, report) {
  log(`${id} done`);
  writeFileSync(resolve(OUT, `${id}.json`), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

await main();
