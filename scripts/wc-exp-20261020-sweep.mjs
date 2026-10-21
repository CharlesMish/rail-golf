// Deterministic Havok sweep for the Two-piece pitch challenge.
// Every layout is an explicit grid point. There is no random sample.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, DirectionalLight, ShadowGenerator, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { createTwoPiecePitchWorld, validateWorld, worldcraftFixedSetup } from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const GRID = Object.freeze({
  rampX: Object.freeze([-4, 0, 4]),
  rampZ: Object.freeze([30, 40]),
  rampYaw: Object.freeze([-45, 0, 45]),
  rampPitch: Object.freeze([-20, -10, 0]),
  bankX: Object.freeze([-16, -8, 8, 16]),
  bankZ: Object.freeze([52, 76]),
  bankYaw: Object.freeze([-40, 0, 40]),
});
const havokPkg = JSON.parse(await readFile(new URL('../node_modules/@babylonjs/havok/package.json', import.meta.url), 'utf8'));
const babylonPkg = JSON.parse(await readFile(new URL('../node_modules/@babylonjs/core/package.json', import.meta.url), 'utf8'));
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createTwoPiecePitchWorld();
const setup = worldcraftFixedSetup(base);
const engine = new NullEngine();
const scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
const physics = scene.getPhysicsEngine();
physics.setTimeStep(1 / 120);
physics.setSubTimeStep(1000 / 120);
const light = new DirectionalLight('sweep-sun', new Vector3(-.4, -1, .3), scene);
const runtime = createWorldcraftRuntime(scene, { world: base, shadows: new ShadowGenerator(256, light), build: 'wc-exp-20261020' });

function layout(ramp, bank) {
  const objects = [];
  if (ramp) objects.push({ id: 'ramp-yours', kind: 'ramp', x: ramp.x, z: ramp.z, yaw: ramp.yaw, pitch: ramp.pitch });
  if (bank) objects.push({ id: 'bank-yours', kind: 'bank', x: bank.x, z: bank.z, yaw: bank.yaw });
  return validateWorld({ ...base, objects });
}
function shoot(world) {
  runtime.setMode('build');
  const replaced = runtime.replaceWorld(world, { intent: 'load' });
  if (!replaced.ok) throw new Error(replaced.error);
  runtime.setMode('play');
  if (!runtime.launch(setup)) throw new Error(runtime.error);
  for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
    runtime.beforeStep();
    physics._step(1 / 120);
    runtime.afterStep();
  }
  const last = runtime.last;
  const contacts = [...last.contacts].sort((a, b) => a.first - b.first).map(contact => contact.body);
  return {
    status: last.pinResult?.status ?? 'unfinished',
    distance: last.pinResult?.distance ?? null,
    position: last.position.map(value => value),
    reason: last.reason,
    elapsed: last.elapsed,
    contacts,
  };
}
const t0 = performance.now();
const trials = [];
let index = 0;
for (const x of GRID.rampX) for (const z of GRID.rampZ) for (const yaw of GRID.rampYaw) for (const pitch of GRID.rampPitch)
  for (const bx of GRID.bankX) for (const bz of GRID.bankZ) for (const by of GRID.bankYaw) {
    const ramp = { x, z, yaw, pitch }, bank = { x: bx, z: bz, yaw: by };
    const id = index++;
    let world;
    try { world = layout(ramp, bank); }
    catch (error) {
      trials.push({ id, ramp, bank, status: 'invalid', error: error.message });
      continue;
    }
    trials.push({ id, ramp, bank, ...shoot(world) });
  }
const direct = shoot(layout(null, null));
const authored = base.objects;
const defaultRamp = authored.find(object => object.kind === 'ramp');
const defaultBank = authored.find(object => object.kind === 'bank');
const defaultRepeat = shoot(layout(
  { x: defaultRamp.x, z: defaultRamp.z, yaw: defaultRamp.yaw, pitch: defaultRamp.pitch },
  { x: defaultBank.x, z: defaultBank.z, yaw: defaultBank.yaw },
));
const defaultTrial = trials.find(trial => trial.status !== 'invalid' && trial.ramp.x === defaultRamp.x && trial.ramp.z === defaultRamp.z && trial.ramp.yaw === defaultRamp.yaw && trial.ramp.pitch === defaultRamp.pitch && trial.bank.x === defaultBank.x && trial.bank.z === defaultBank.z && trial.bank.yaw === defaultBank.yaw);
const repeatDelta = Math.max(...defaultTrial.position.map((value, i) => Math.abs(value - defaultRepeat.position[i])));

const clears = trials.filter(trial => trial.status === 'clear');
function adjacent(a, b) {
  const keys = [['ramp', 'x', GRID.rampX], ['ramp', 'z', GRID.rampZ], ['ramp', 'yaw', GRID.rampYaw], ['ramp', 'pitch', GRID.rampPitch], ['bank', 'x', GRID.bankX], ['bank', 'z', GRID.bankZ], ['bank', 'yaw', GRID.bankYaw]];
  let diffs = 0;
  for (const [group, key, values] of keys) {
    if (a[group][key] === b[group][key]) continue;
    const ia = values.indexOf(a[group][key]), ib = values.indexOf(b[group][key]);
    if (Math.abs(ia - ib) !== 1) return false;
    diffs++;
  }
  return diffs === 1;
}
const clusters = [];
const seen = new Set();
for (const trial of clears) {
  if (seen.has(trial.id)) continue;
  const members = [];
  const queue = [trial];
  seen.add(trial.id);
  while (queue.length) {
    const current = queue.pop();
    members.push(current);
    for (const other of clears) if (!seen.has(other.id) && adjacent(current, other)) { seen.add(other.id); queue.push(other); }
  }
  clusters.push(members);
}
clusters.sort((a, b) => b.length - a.length);

const nudgePlan = [
  ['ramp', 'x', .5], ['ramp', 'x', -.5], ['ramp', 'z', .5], ['ramp', 'z', -.5], ['ramp', 'yaw', 5], ['ramp', 'yaw', -5], ['ramp', 'pitch', 5], ['ramp', 'pitch', -5],
  ['bank', 'x', .5], ['bank', 'x', -.5], ['bank', 'z', .5], ['bank', 'z', -.5], ['bank', 'yaw', 5], ['bank', 'yaw', -5],
];
const fragility = [];
for (const trial of clears) {
  const nudges = nudgePlan.map(([group, key, delta]) => {
    const ramp = { ...trial.ramp }, bank = { ...trial.bank };
    (group === 'ramp' ? ramp : bank)[key] += delta;
    let result;
    try { result = { ok: true, ...shoot(layout(ramp, bank)) }; }
    catch (error) { result = { ok: false, error: error.message }; }
    return { group, key, delta, valid: result.ok, status: result.ok ? result.status : 'invalid', distance: result.distance ?? null, position: result.position ?? null };
  });
  fragility.push({ id: trial.id, flips: nudges.filter(nudge => nudge.valid && nudge.status !== 'clear').length, nudges });
}
const nudgeRows = fragility.flatMap(row => row.nudges);
const summary = {
  seconds: +((performance.now() - t0) / 1000).toFixed(2),
  cells: trials.length,
  invalid: trials.filter(trial => trial.status === 'invalid').length,
  simulated: trials.filter(trial => trial.status !== 'invalid').length,
  clear: clears.length,
  miss: trials.filter(trial => trial.status === 'miss').length,
  unfinished: trials.filter(trial => trial.status === 'unfinished').length,
  clearFraction: clears.length / trials.filter(trial => trial.status !== 'invalid').length,
  clusters: clusters.length,
  clusterSizes: clusters.map(members => members.length),
  fragility: {
    clears: fragility.length,
    clearsWithAFlip: fragility.filter(row => row.flips > 0).length,
    nudges: nudgeRows.length,
    validNudges: nudgeRows.filter(row => row.valid).length,
    invalidNudges: nudgeRows.filter(row => !row.valid).length,
    flips: nudgeRows.filter(row => row.valid && row.status !== 'clear').length,
    byControl: Object.fromEntries(['x', 'z', 'yaw', 'pitch'].map(key => [key, {
      valid: nudgeRows.filter(row => row.key === key && row.valid).length,
      flips: nudgeRows.filter(row => row.key === key && row.valid && row.status !== 'clear').length,
    }])),
  },
  direct,
  default: defaultTrial,
  defaultRepeat,
  repeatDelta,
  clustersDetail: clusters.map((members, cluster) => ({
    cluster, size: members.length,
    yawSigns: [...new Set(members.map(trial => Math.sign(trial.ramp.yaw)))],
    pitches: [...new Set(members.map(trial => trial.ramp.pitch))],
    example: members[0],
  })),
};
const record = {
  seed: { environment: base.environment.seed, rng: null, note: 'Each trial is seeded by its exact layout. Havok is stepped with no random input.' },
  physics: {
    havok: havokPkg.version,
    babylon: babylonPkg.version,
    gravity: RAIL_RULES.gravity,
    timestepHz: 120,
    substepHz: 120,
    maxSteps: 7300,
    projectileMass: RAIL_RULES.projectileMass,
    projectileRadius: RAIL_RULES.projectileRadius,
  },
  world: { id: base.id, name: base.name, pin: base.rules.pin, rail: setup, launcherX: base.launcher.x },
  grid: GRID,
  summary,
  trials,
  fragility,
};
await mkdir(new URL('../docs/experiments/', import.meta.url), { recursive: true });
const singleRamp = { x: [-6, -4, -2, 0, 2, 4, 6], z: [30, 34, 38, 42, 46], yaw: [-40, -30, -20, -10, 0, 10, 20, 30, 40], pitch: [-30, -20, -10, 0, 10] };
const singleBank = { x: [-16, -8, 0, 8, 16], z: [48, 60, 72, 84], yaw: [-60, -30, 0, 30, 60] };
let singleBest = { distance: Infinity }, singleShots = 0, singleInside = 0;
for (const x of singleRamp.x) for (const z of singleRamp.z) for (const yaw of singleRamp.yaw) for (const pitch of singleRamp.pitch) {
  let row; try { row = shoot(layout({ x, z, yaw, pitch }, null)); } catch { continue; }
  singleShots++;
  if (Number.isFinite(row.distance) && row.distance <= base.rules.pin.r) singleInside++;
  if (Number.isFinite(row.distance) && row.distance < singleBest.distance) singleBest = { ...row, ramp: { x, z, yaw, pitch }, bank: null };
}
for (const x of singleBank.x) for (const z of singleBank.z) for (const yaw of singleBank.yaw) {
  let row; try { row = shoot(layout(null, { x, z, yaw })); } catch { continue; }
  singleShots++;
  if (Number.isFinite(row.distance) && row.distance <= base.rules.pin.r) singleInside++;
  if (Number.isFinite(row.distance) && row.distance < singleBest.distance) singleBest = { ...row, ramp: null, bank: { x, z, yaw } };
}
record.singlePieceSample = { ramp: singleRamp, bank: singleBank, shots: singleShots, insidePin: singleInside, closest: singleBest };
await writeFile(new URL('../docs/experiments/wc-exp-20261020-two-piece-pitch.json', import.meta.url), JSON.stringify(record));
await writeFile(new URL('../docs/experiments/wc-exp-20261020-two-piece-pitch.md', import.meta.url), render(record));
console.log(JSON.stringify({ ...summary, singleInside, singleBestDistance: singleBest.distance }, null, 2));
runtime.dispose(); scene.dispose(); engine.dispose();

function render(data) {
  const s = data.summary, pin = data.world.pin, rail = data.world.rail;
  const fmt = value => value === null || value === undefined ? '' : value;
  const csv = ['id,rx,rz,ry,rp,bx,bz,by,status,distance,x,y,z,reason,contacts'];
  for (const trial of data.trials) {
    const p = trial.position ?? [];
    csv.push([trial.id, trial.ramp.x, trial.ramp.z, trial.ramp.yaw, trial.ramp.pitch, trial.bank.x, trial.bank.z, trial.bank.yaw, trial.status, fmt(trial.distance), fmt(p[0]), fmt(p[1]), fmt(p[2]), trial.reason ?? '', (trial.contacts ?? []).join('|')].join(','));
  }
  const nudgeCsv = ['clearId,piece,control,delta,valid,status,distance'];
  for (const row of data.fragility) for (const nudge of row.nudges) nudgeCsv.push([row.id, nudge.group, nudge.key, nudge.delta, nudge.valid, nudge.status, fmt(nudge.distance)].join(','));
  const clears = data.trials.filter(trial => trial.status === 'clear').map(trial => `- Trial ${trial.id}: ramp (${trial.ramp.x}, ${trial.ramp.z}, yaw ${trial.ramp.yaw}, pitch ${trial.ramp.pitch}), bank (${trial.bank.x}, ${trial.bank.z}, yaw ${trial.bank.yaw}). First kiss ${trial.position.map(v => v.toString()).join(', ')}. Distance ${trial.distance}. Contacts ${trial.contacts.join(' → ')}. Elapsed ${trial.elapsed} s.`);
  return `# Two-piece pitch

Experiment A on \`/lab/worldcraft\`. Branch \`lab/wc-exp-20261020-two-piece-pitch\`. House Shot stays in the lab.

## Question

What kind of goal makes a player want to revise a multi-piece layout?

House Shot fixes the rail and leaves one ramp yaw as the lever. Its opening ramp already kisses about 10 m from the pin, and a pass through ±15° did not score. That goal does not pay the player for looking around.

This challenge keeps the fixed rail and asks for a revision of two pieces. The gold circle is off the open shot. The ramp gains a pitch control, in 5° steps, that is the incline of the real Havok box.

## How to open

1. Open \`/lab/worldcraft\`. The lab still starts on House Shot.
2. In Build, use **Open Two-piece pitch** in the fixed-goal panel. The same button is in Worlds & lines.
3. Select the ramp. Move it in 0.5 m steps, turn it in 5° steps, and change **Pitch** in 5° steps from −45° to +15°. Select the bank to move and turn it. The rail stays at origin 0 m, yaw 0°, elevation 18°, power 55%.
4. Play, then Fire line. A clear is the measured round centre inside the gold circle at first ground contact.

**Reset Two-piece pitch** restores the opening layout. **Open House Shot** is still next to it.

## Authority

Pitch is stored on the ramp and applied in \`buildWorldcraftScene\` before the static Havok box is created. The shot still goes through \`createWorldcraftRuntime\` → \`createSpatialSession\` → the incumbent mechanism session. No shot-physics file was changed. Catalog ramps that omit \`pitch\` keep the old −20° box and center height, so House Shot is unchanged.

The opening ramp is flat (pitch 0) at (0, 30). The opening bank is at (−16, 52), yaw 0. Neither piece meets the open shot.

## Seeds

| Item | Value |
| --- | --- |
| Environment seed | ${data.seed.environment} |
| RNG seed | none |
| Trial seed | the layout tuple below |
| Havok | ${data.physics.havok} |
| Babylon | ${data.physics.babylon} |
| Gravity | ${data.physics.gravity} |
| Step | ${data.physics.timestepHz} Hz, substep ${data.physics.substepHz} Hz, cap ${data.physics.maxSteps} |
| Projectile | mass ${data.physics.projectileMass}, radius ${data.physics.projectileRadius} |
| Rail | origin ${rail.originX}, yaw ${rail.yaw}, elevation ${rail.elevation}, charge ${rail.charge}, railIndex ${rail.railIndex} |
| Pin | (${pin.x}, ${pin.z}), radius ${pin.r} m |
| Repeat of the opening layout | max abs position delta ${s.repeatDelta} |

${data.seed.note}

## Grid

Cartesian product, ${s.cells} layouts, every cell simulated:

- ramp x: ${data.grid.rampX.join(', ')}
- ramp z: ${data.grid.rampZ.join(', ')}
- ramp yaw: ${data.grid.rampYaw.join(', ')}
- ramp pitch: ${data.grid.rampPitch.join(', ')}
- bank x: ${data.grid.bankX.join(', ')}
- bank z: ${data.grid.bankZ.join(', ')}
- bank yaw: ${data.grid.bankYaw.join(', ')}

A cluster is a connected component of clears. Two clears are neighbors when they differ by one step on exactly one of those axes. Runtime ${s.seconds} s.

## Sweep results

| Measure | Value |
| --- | --- |
| Layouts | ${s.cells} |
| Invalid | ${s.invalid} |
| Simulated | ${s.simulated} |
| Clear | ${s.clear} |
| Miss | ${s.miss} |
| Unfinished | ${s.unfinished} |
| Fraction clear | ${s.clear} / ${s.simulated} = ${s.clearFraction} |
| Solution clusters | ${s.clusters} |
| Cluster sizes | ${s.clusterSizes.join(', ')} |

Opening layout, trial ${s.default.id}: miss, distance ${s.default.distance} m, landing (${s.default.position.join(', ')}), contacts ${s.default.contacts.join(' → ')}.

Direct shot, no pieces: miss, distance ${s.direct.distance} m, landing (${s.direct.position.join(', ')}), contacts ${s.direct.contacts.join(' → ')}.

The opening layout and the empty yard land on the same point. The gold circle is ${s.direct.distance} m from that kiss.

## The two clusters

Both clears touch the ramp and then the bank. Pitch on every clear is −10°.

${clears.join('\n')}

Cluster 0 is the positive-yaw family: the ramp yaws +45° and the bank sits on the negative-x side at yaw −40°. Its two members differ only by ramp x (−4 and 0). Cluster 1 is the mirror: ramp yaw −45°, bank on the positive-x side at yaw +40°, ramp x 0 or +4. The families are not grid-neighbors of each other.

## Fragility

Every clear was re-shot with one control moved by a single player step: ±0.5 m in x or z, ±5° of yaw, and ±5° of ramp pitch.

| Measure | Value |
| --- | --- |
| Clears tested | ${s.fragility.clears} |
| Clears with at least one flip to a miss | ${s.fragility.clearsWithAFlip} |
| Nudges | ${s.fragility.nudges} |
| Valid nudges | ${s.fragility.validNudges} |
| Invalid nudges | ${s.fragility.invalidNudges} |
| Nudges that miss | ${s.fragility.flips} |
| x ±0.5 m flips | ${s.fragility.byControl.x.flips} / ${s.fragility.byControl.x.valid} |
| z ±0.5 m flips | ${s.fragility.byControl.z.flips} / ${s.fragility.byControl.z.valid} |
| yaw ±5° flips | ${s.fragility.byControl.yaw.flips} / ${s.fragility.byControl.yaw.valid} |
| pitch ±5° flips | ${s.fragility.byControl.pitch.flips} / ${s.fragility.byControl.pitch.valid} |

Every ±5° pitch nudge missed. Half-metre slides and yaw steps held on the tighter member of each family and flipped some of the looser member. Pitch is the control that breaks a found clear. The two families are not the same layout nudged by one step.

## Single-piece sample

Separate from the 1,296-layout grid. One ramp only, then one bank only, same rail and pin. This is not a proof that no single piece can ever clear.

- Ramp axes: x ${singleRamp.x.join(', ')}; z ${singleRamp.z.join(', ')}; yaw ${singleRamp.yaw.join(', ')}; pitch ${singleRamp.pitch.join(', ')}
- Bank axes: x ${singleBank.x.join(', ')}; z ${singleBank.z.join(', ')}; yaw ${singleBank.yaw.join(', ')}
- Shots: ${singleShots}
- Landings inside the ${pin.r} m circle: ${singleInside}
- Closest: distance ${singleBest.distance} m, status ${singleBest.status}, landing (${(singleBest.position ?? []).join(', ')}), ramp ${JSON.stringify(singleBest.ramp)}, bank ${JSON.stringify(singleBest.bank)}

## Exact grid record

\`\`\`csv
${csv.join('\n')}
\`\`\`

## Exact nudge record

\`\`\`csv
${nudgeCsv.join('\n')}
\`\`\`

Reproduce with \`node scripts/wc-exp-20261020-sweep.mjs\`. The same numbers are in \`docs/experiments/wc-exp-20261020-two-piece-pitch.json\`.

## Checks

<!-- CHECKS -->
Filled by hand in docs/experiments/wc-exp-20261020-two-piece-pitch.md after typecheck, the verified build, and the full test suite. This generator does not re-run those commands. Re-running the sweep overwrites that section with this note; paste the latest check results back in.
<!-- /CHECKS -->

## Not verified

- No player sat this goal. The sweep says two families exist and the opening shot misses by ${s.direct.distance} m. It does not say anyone will enjoy looking for them.
- The fraction is for this grid, not for every legal pose of the two pieces.
- The single-piece sample is the grid above, not every 0.5 m / 5° pose.
- Browser rendering is checked separately from this headless Havok run. A WebGL shot was not compared bit-for-bit with these landings.
- Phone, SwiftShader frame time, and a Cloudflare preview URL were not part of this run.
`;
}

