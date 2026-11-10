// The arrangements that were sketched before the kept one, on coarse aim sets.
// None of these is registered. They are here so the rejected ideas can be re-run.
//
//   node docs/experiments/foundry/descending-resonance/repro/explore.mjs
//
// Coarse lattice: yaw -6..6 step 1, elevation 10..26 step 1, charge 0.45..0.65 step 0.05.
// It samples the same block as the slider lattice in reproduce.mjs at one cell in eighty.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRangePreset, validateRangePreset } from '../../../../../lib/worldcraft-range.js';
import { gridAims, loadHavok, series, summarize, sweep } from '../../../../../scripts/foundry/contact-sweep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const BROAD = gridAims({ yaws: series(-24, 24, 2), elevations: [8, 12, 16, 20, 24, 30, 40], charges: [0.35, 0.45, 0.55, 0.65, 0.8] });
const COARSE = gridAims({ yaws: series(-6, 6, 1), elevations: series(10, 26, 1), charges: [0.45, 0.5, 0.55, 0.6, 0.65] });

const M = degree => ({ material: 'metal', degree }), T = degree => ({ material: 'timber', degree });
const bank = (id, x, z, voice) => ({ id, kind: 'bank', x, z, yaw: 0, voice });
const ramp = (id, x, z, voice) => ({ id, kind: 'ramp', x, z, yaw: 0, voice });
const plate = (id, x, z, lift, tilt, voice) => (lift || tilt ? { id, kind: 'plate', x, z, yaw: 0, lift, tilt, voice } : { id, kind: 'plate', x, z, yaw: 0, voice });
const row = (prefix, xs, z, lift, tilt, voices) => xs.map((x, index) => plate(`${prefix}-${index}`, x, z, lift, tilt, voices[index % voices.length]));
const document = (id, objects) => validateRangePreset({
  format: 'rail-golf-worldcraft-range-preset', version: 1, id, name: id, environment: { preset: 'forest-clearing-v1', seed: 1 }, launcher: { x: 0 }, objects,
  rules: { launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 }, fixed: objects.map(object => object.id), allowance: {}, goal: { kind: 'none' } },
});
const backWall = z => [bank('back-w', -6, z, T(0)), bank('back-e', 6, z, T(1))];
const six = [-10, -6, -2, 2, 6, 10], five = [-8, -4, 0, 4, 8], four = [-6, -2, 2, 6], three = [-4, 0, 4];

const SKETCHES = {
  // v1 pieces only. A row of plates 6 m in front of a wall.
  'flat-gap': { note: 'A 4 m row in front of a 7 m wall. v1 pieces only.', objects: [...backWall(32), ...row('row', six, 26, 0, 0, [M(0), T(3), M(1), T(4), M(2), T(0)])] },
  // The same gap with plates hung straight above the wall. Balls that reach them fly back over the row.
  'gap-with-hung-tier': { note: 'flat-gap plus four plates hung upright above the wall.', objects: [...backWall(32), ...row('up', four, 32, 7.5, 0, [M(4), M(2), M(3), M(1)]), ...row('row', six, 26, 0, 0, [M(0), T(3), M(1), T(4), M(2), T(0)])] },
  // The row hung at 3.5 m so low balls pass under it. Entry needs more height than most shots have.
  'hung-row': { note: 'The front row hung at 3.5 m, upright tier above the wall.', objects: [...backWall(38), ...row('up', four, 38, 7.5, 0, [M(4), M(2), M(3), M(1)]), ...row('row', six, 32, 3.5, 0, [M(0), T(3), M(1), T(4), M(2), T(0)])] },
  // A lower tier leaning back 20 degrees throws low balls up into a hung row. Long pile-ups, unstable.
  'kicker': { note: 'Leaning lower tier (20°) as the back wall, upright tier above it, hung row in front.', objects: [...row('kick', four, 38, 0, 20, [T(0), T(1), T(2), T(3)]), ...row('high', four, 39, 4, 0, [M(4), M(3), M(2), M(1)]), ...row('near', four, 32, 2.5, 0, [M(2), M(0), M(4), M(1)])] },
  // Three rows: a hung outer row, a standing row, the wall. The hung row blocks ordinary shots.
  'three-rows': { note: 'A row hung at 3 m, 5 m in front of flat-gap with five plates.', objects: [...backWall(38), ...row('mid', five, 32, 0, 0, [M(3), T(2), M(4), T(1), M(3)]), ...row('hang', five, 27, 3, 0, [M(1), M(4), M(0), M(2), M(4)])] },
  // Row, wall, then a second wall with an upright tier on it. No ramps. Low shots only knock the row.
  'two-gaps': { note: 'Row, 7 m wall, then a 7 m wall carrying an upright tier to 11 m.', objects: [...row('near', four, 24, 0, 0, [M(2), M(0), M(3), M(1)]), bank('mid-w', -6, 30, T(1)), bank('mid-e', 6, 30, T(3)), bank('far-w', -6, 37, T(0)), bank('far-e', 6, 37, T(2)), ...row('high', four, 37, 7, 0, [M(4), M(3), M(4), M(2)])] },
  'two-gaps-leaning': { note: 'two-gaps with the tier leaning 10° toward the tee.', objects: [...row('near', four, 24, 0, 0, [M(2), M(0), M(3), M(1)]), bank('mid-w', -6, 30, T(1)), bank('mid-e', 6, 30, T(3)), bank('far-w', -6, 37, T(0)), bank('far-e', 6, 37, T(2)), ...row('high', four, 36.5, 7, -10, [M(4), M(3), M(4), M(2)])] },
  // Ramps in front for the low shots, one leaning tier.
  'ramps-one-tier': { note: 'Two ramps, a three-plate row, two walls, one tier leaning 10°.', objects: [ramp('ramp-0', -5, 15.5, T(4)), ramp('ramp-1', 5, 15.5, T(2)), ...row('near', three, 22, 0, 0, [M(2), M(0), M(3)]), bank('mid-w', -6, 28, T(1)), bank('mid-e', 6, 28, T(3)), bank('far-w', -6, 35, T(0)), bank('far-e', 6, 35, T(2)), ...row('high', three, 34.5, 7, -10, [M(4), M(3), M(4)])] },
};

async function main() {
  const havok = await loadHavok();
  const read = async id => parseRangePreset(await readFile(resolve(root, `worlds/foundry/${id}/preset.json`), 'utf8'));
  const entries = [
    ...Object.entries(SKETCHES).map(([id, sketch]) => ({ id, note: sketch.note, preset: document(`sketch-${id}`, sketch.objects) })),
    { id: 'kept-flat-control', note: 'worlds/foundry/descending-resonance-flat', preset: await read('descending-resonance-flat') },
    { id: 'kept-elevated', note: 'worlds/foundry/descending-resonance', preset: await read('descending-resonance') },
    { id: 'ricochet-garden-loop', note: 'worlds/foundry/ricochet-garden-loop', preset: await read('ricochet-garden-loop') },
  ];
  const report = { aimSets: { broad: BROAD.length, coarseLattice: COARSE.length }, sketches: {} };
  for (const entry of entries) {
    const pieces = entry.preset.objects.map(object => object.id);
    const line = async aims => {
      const s = summarize((await sweep({ preset: entry.preset, aims, havok })).rows, pieces);
      return { shots: s.shots, silent: s.silent, one: s.one, two: s.twoPlus - s.threePlus, threeToFive: s.threeToFive, sixPlus: s.sixPlus, maxBeats: s.maxNotes, distinctThreePlusPhrases: s.distinctThreePlusPhrases };
    };
    report.sketches[entry.id] = { note: entry.note, pieces: pieces.length, elevatedPieces: entry.preset.objects.filter(object => Object.hasOwn(object, 'lift')).length, broad: await line(BROAD), coarseLattice: await line(COARSE) };
  }
  await writeFile(resolve(here, 'exploration.json'), `${JSON.stringify(report, null, 1)}\n`);
  for (const [id, item] of Object.entries(report.sketches)) {
    const b = item.broad, c = item.coarseLattice;
    process.stdout.write(`${id.padEnd(22)} broad silent ${String(b.silent).padStart(3)} 3-5 ${String(b.threeToFive).padStart(3)} 6+ ${String(b.sixPlus).padStart(2)} | coarse silent ${String(c.silent).padStart(4)} one ${String(c.one).padStart(4)} two ${String(c.two).padStart(4)} 3-5 ${String(c.threeToFive).padStart(4)} 6+ ${String(c.sixPlus).padStart(3)} max ${c.maxBeats}\n`);
  }
}

main().catch(error => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
