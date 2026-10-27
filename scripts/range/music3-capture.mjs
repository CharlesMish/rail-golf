// Bank voice study (music3): re-fire the real Musical Workshop shots through the
// unchanged PR #55 runtime and keep each impact's measured strike data.
// Physics, colliders and launch rules are untouched; this only records contacts.
//
//   node scripts/range/music3-capture.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { adaptRangePreset, createMusicalWorkshopPreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from './run.mjs';

Logger.LogLevels = 0;
const base = createMusicalWorkshopPreset();
const timber = { material: 'timber', degree: 0 }, d4 = { material: 'metal', degree: 1 }, e4 = { material: 'metal', degree: 2 };
const parked = {
  ramp: { id: 'ramp-yours', kind: 'ramp', x: -20, z: 78, yaw: 0, voice: d4 },
  bank: { id: 'bank-yours', kind: 'bank', x: 20, z: 78, yaw: 0, voice: timber },
  plate: { id: 'plate-yours', kind: 'plate', x: 0, z: 86, yaw: 0, voice: e4 },
};
const bank = (x, z, yaw) => ({ id: 'bank-yours', kind: 'bank', x, z, yaw, voice: timber });
const ramp = (x, z, yaw) => ({ id: 'ramp-yours', kind: 'ramp', x, z, yaw, voice: d4 });
const plate = (x, z, yaw) => ({ id: 'plate-yours', kind: 'plate', x, z, yaw, voice: e4 });
const low = { railIndex: 1, originX: 0, yaw: 0, elevation: 12, charge: 0.5 };
const lofted = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };

// Source of each layout: PR #55 contacts.json (bank grid, graze-ramp) and PR #54
// arrangements (late-catch-4, early-plate-14, opening).
export const MUSIC3_SHOTS = [
  { id: 'graze-85', group: 'single', label: 'Bank graze, 85°', objects: [parked.ramp, bank(1, 24, 85), parked.plate], setup: low },
  { id: 'graze-80', group: 'single', label: 'Bank graze, 80°', objects: [parked.ramp, bank(0, 24, 80), parked.plate], setup: low },
  { id: 'glance-70', group: 'single', label: 'Bank glance, 70°', objects: [parked.ramp, bank(0, 24, 70), parked.plate], setup: low },
  { id: 'angled-55', group: 'single', label: 'Bank angled, 55°', objects: [parked.ramp, bank(0, 24, 55), parked.plate], setup: low },
  { id: 'square-040', group: 'single', label: 'Bank square, charge 0.40', objects: [parked.ramp, bank(0, 24, 0), parked.plate], setup: { ...low, charge: 0.4 } },
  { id: 'square-055', group: 'single', label: 'Bank square, charge 0.55', objects: [parked.ramp, bank(0, 24, 0), parked.plate], setup: { ...low, charge: 0.55 } },
  { id: 'square-085', group: 'single', label: 'Bank square, charge 0.85', objects: [parked.ramp, bank(0, 24, 0), parked.plate], setup: { ...low, charge: 0.85 } },
  { id: 'phrase-graze-ramp', group: 'phrase', label: 'Bank graze → Ramp (C4 → D4)', objects: [ramp(0, 36, 0), bank(1, 22, 85), parked.plate], setup: low },
  { id: 'phrase-early-plate', group: 'phrase', label: 'Bank → Ramp → Plate (C4 → D4 → E4)', objects: [ramp(-8, 40, 0), bank(0, 16, 80), plate(-24, 58, 0)], setup: lofted },
  { id: 'phrase-late-catch', group: 'phrase', label: 'Ramp → Bank → Plate (D4 → C4 → E4)', objects: [ramp(-1, 42, 20), bank(-6, 68, 20), plate(-28, 58, 0)], setup: lofted },
  { id: 'phrase-opening', group: 'phrase', label: 'Ramp → Plate, no bank (D4 → E4)', objects: [ramp(0, 42, 0), bank(14, 28, 0), plate(0, 68, 0)], setup: lofted },
];

const round = (v, d = 4) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const worldFrom = objects => adaptRangePreset(validateRangePreset({ ...base, objects })).world;

if (import.meta.url === `file://${process.argv[1]}`) {
  const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const session = createRangeHarness(havok, worldFrom(MUSIC3_SHOTS[0].objects), 'music3');
  session.runtime.setDynamics('normal-speed');
  const out = [];
  for (const shot of MUSIC3_SHOTS) {
    const last = session.shoot(worldFrom(shot.objects), shot.setup);
    const impacts = (last.resonance?.impacts ?? []).filter(i => ['bank', 'ramp', 'plate'].includes(i.role)).map(i => ({
      piece: i.piece, role: i.role, note: i.note, material: i.material, degree: i.degree, hz: i.hz,
      time: round(i.time), speed: round(i.speed), normalSpeed: round(i.normalSpeed), callbacks: i.callbacks,
    }));
    out.push({ id: shot.id, group: shot.group, label: shot.label, setup: shot.setup, objects: shot.objects, order: impacts.map(i => i.note), impacts });
    console.log(shot.id.padEnd(20), impacts.map(i => `${i.note}@${i.time}s face ${i.normalSpeed}`).join('  '));
  }
  session.dispose();
  const dir = new URL('../../docs/experiments/range/appendix/music3/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('contacts.json', dir), JSON.stringify({ branch: 'lab/wc-range-music3-bank-voice', parent: '9d8278ba9126a0579cfce35104417aba704248cd', gitSha: rangeGitSha(), dynamics: 'normal-speed', physicsChanged: false, shots: out }, null, 1) + '\n');
}
