// Run from the repository root. --scan repeats the two bounded discovery grids.
// --write-manifest updates measured fixtures only; review the evidence first.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadHavok, sweep } from '../../../../scripts/foundry/contact-sweep.mjs';
import { validateRangePreset } from '../../../../lib/worldcraft-range.js';
import { RAIL_RULES } from '../../../../lib/rail-golf-v02.js';
import { createReturnHarness } from './harness.mjs';

const readPreset = async id => validateRangePreset(JSON.parse(await readFile(new URL(`../../../../worlds/foundry/${id}/preset.json`, import.meta.url), 'utf8')));
const original = await readPreset('radial-return');
const stone = await readPreset('amphitheater-place');
const derive = (id, ids) => validateRangePreset({ ...original, id, name: id, objects: original.objects.filter(o => ids.includes(o.id)), rules: { ...original.rules, fixed: ids } });
const worlds = { original, 'no-wall': derive('return-no-wall', ['middle', 'inner']), 'wall-only': derive('return-wall-only', ['wall']), stone };
const setup = (elevation, charge, yaw = 0) => ({ railIndex: 1, originX: 0, yaw, elevation, charge });
export const shots = { 'proposed-skip': setup(30, .25), 'top-descent': setup(32, .22), 'edge-detour': setup(34, .21), overflight: setup(30, .39) };
const neighbors = input => [
  ['yaw', -.5], ['yaw', .5], ['elevation', -.5], ['elevation', .5], ['charge', -.01], ['charge', .01], ['originX', -.5], ['originX', .5],
].map(([axis, delta]) => ({ axis, delta, setup: { ...input, [axis]: Math.round((input[axis] + delta) * 1000) / 1000 } }));
const compact = row => { const rest = { ...row }; delete rest.samples; return rest; };
const physical = row => row.episodes.filter(e => e.body !== 'worldcraft-ground');
const classify = row => {
  const contacts = physical(row), order = contacts.map(e => e.body.replace('worldcraft-object-', ''));
  const clean = order[0] === 'wall' && contacts.slice(1).every(e => e.normal[1] < -.999 && e.incoming[1] < 0 && e.outgoing[1] > 0);
  return { order, cleanTopReturn: clean && order.includes('middle'), topDescent: clean && order.join('>') === 'wall>middle>inner' };
};
const havok = await loadHavok();
const report = {
  provenance: { startSha: '6ebb2f2b370656c7e70b108ad04d0369b78cf89c', branch: 'research/horizons-return-20261119', measuredHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), runtime: 'Node NullEngine + actual Havok', timestepHz: 120, seed: 20261119, seedAppliedToSolver: false, gravity: RAIL_RULES.gravity, mass: RAIL_RULES.projectileMass, radius: RAIL_RULES.projectileRadius },
  definitions: { normal: 'Raw Havok event normal (on these surfaces points into the other body); top contact has ny approximately -1.', incoming: 'Projectile linear velocity before the 1/120 s solver step of first callback.', outgoing: 'Projectile velocity after the final callback step in a contiguous contact episode, before session terminal handling.', time: 'Session elapsed at callback; solver interval ends 1/120 s later.', freeFlightSincePrior: 'First callback time minus previous episode final callback time. Discrete solver timing, not analytic intersection time.', meshes: 'World runtime counts only; no launcher, scenery, camera or HUD. Mock shadow registrations, not rendered draw calls.' },
  shots: {}, neighbors: {}, controls: {}, resources: {}, scans: null,
};
const h = createReturnHarness(havok, original);
for (const [id, input] of Object.entries(shots)) {
  const row = h.shoot(input); report.shots[id] = { ...compact(row), classification: classify(row) };
  if (id === 'proposed-skip' || id === 'top-descent') {
    report.shots[id].samples = row.samples;
    report.neighbors[id] = neighbors(input).map(neighbor => {
      const next = h.shoot(neighbor.setup);
      return { ...neighbor, ...classify(next), terminal: next.terminal };
    });
  }
}
const first = h.shoot(shots['proposed-skip']), again = h.shoot(shots['proposed-skip']);
report.exactReplay = JSON.stringify(compact(first)) === JSON.stringify(compact(again));
h.dispose();
for (const [name, preset] of Object.entries(worlds)) {
  const control = createReturnHarness(havok, preset);
  report.controls[name] = Object.fromEntries(['proposed-skip', 'top-descent'].map(id => {
    const row = control.shoot(shots[id]); return [id, { ...compact(row), classification: classify(row) }];
  }));
  if (name === 'stone') report.controls[name].opening = compact(control.shoot(setup(8, .45)));
  const initial = control.diagnostics(), reloads = [], counts = [];
  for (let i = 0; i < 6; i++) {
    const result = control.replace(preset); if (!result.ok) throw Error(result.error);
    control.shoot(name === 'stone' ? setup(8, .45) : shots['proposed-skip']);
    const diag = control.diagnostics(); reloads.push(diag.rebuildMs);
    counts.push([diag.physicsBodies, diag.sceneMeshes, diag.materials, diag.textures, diag.shadowCasters]);
  }
  report.resources[name] = { initial, reloadMs: reloads, resourceCountsAfterEachLoadAndShot: counts, disposal: control.dispose().after };
}
const lifecycle = createReturnHarness(havok, original);
report.switchLifecycle = [];
for (let i = 0; i < 4; i++) for (const name of ['stone', 'original', 'no-wall']) {
  const result = lifecycle.replace(worlds[name]); if (!result.ok) throw Error(result.error);
  lifecycle.shoot(name === 'stone' ? setup(8, .45) : shots['proposed-skip']);
  const diag = lifecycle.diagnostics(); report.switchLifecycle.push({ world: name, bodies: diag.physicsBodies, meshes: diag.sceneMeshes, materials: diag.materials, shadowCasters: diag.shadowCasters });
}
report.switchDisposal = lifecycle.dispose().after;
if (process.argv.includes('--scan')) {
  const coarse = [18,22,26,30,34,38,42].flatMap(elevation => [.15,.18,.21,.24,.25,.27,.30,.33,.36,.39].map(charge => setup(elevation,charge)));
  const local = Array.from({length:21},(_,i)=>28+i*.5).flatMap(elevation=>Array.from({length:7},(_,i)=>setup(elevation,(19+i)/100)));
  report.scans = {};
  for (const [name, aims] of Object.entries({coarse,local})) {
    const result = await sweep({ preset: original, aims, havok });
    report.scans[name] = result.rows.map(r=>({elevation:r.elevation,charge:r.charge,order:r.order,terminal:r.terminal}));
  }
}
await writeFile(new URL('./evidence.json', import.meta.url), JSON.stringify(report,null,2)+'\n');
if (process.argv.includes('--write-manifest')) {
  const manifest = JSON.parse(await readFile(new URL('../../../../worlds/foundry/radial-return/manifest.json',import.meta.url),'utf8'));
  manifest.testedShots = ['proposed-skip','top-descent','edge-detour','overflight'].map(id=>{
    const r=report.shots[id];
    return {id,setup:r.setup,launchPhase:null,terminal:r.terminal,outcome:{kind:'none',status:'none'},...(r.ledger.some(e=>e.body!=='worldcraft-ground')?{contacts:r.ledger.filter(e=>e.body!=='worldcraft-ground').map(e=>e.body)}:{})};
  });
  await writeFile(new URL('../../../../worlds/foundry/radial-return/manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
}
console.log(JSON.stringify({shots:Object.fromEntries(Object.entries(report.shots).map(([id,r])=>[id,{...r.classification,terminal:r.terminal}])),neighbors:report.neighbors,exactReplay:report.exactReplay,resources:Object.fromEntries(Object.entries(report.resources).map(([id,r])=>[id,{bodies:r.initial.physicsBodies,meshes:r.initial.sceneMeshes,casters:r.initial.shadowCasters,reloadMs:r.reloadMs,disposal:r.disposal}]))},null,2));
