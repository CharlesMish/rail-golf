// Fill direct-fire parameter gaps whose coarse landings jump across the pocket.
// A straight segment through the circle is not a trajectory. These shots are.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { appendFileSync, writeFileSync } from 'node:fs';
import Havok from '@babylonjs/havok';
import { adaptRangePreset, createBackPocketPreset, exportRangePreset, sha256Hex } from '../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha, rangeProvenance } from './run.mjs';

const OUT = 'docs/experiments/range/runs/back-pocket';
const PIN = { x: -8, z: 54, r: 4 };
const lines = (await readFile(`${OUT}/direct.jsonl`, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
const shots = lines.filter(line => line.type === 'shot' && !line.refineOf && line.position);
const by = new Map(shots.map(shot => [`${shot.setup.yaw}|${shot.setup.elevation}|${shot.setup.charge}`, shot]));
const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

function crosses(a, b) {
  const za = a.position[2];
  const zb = b.position[2];
  return (za < 50 && zb > 58) || (zb < 50 && za > 58);
}
const setups = new Map();
for (const shot of shots) {
  const neighbors = [
    [round(shot.setup.yaw + 2, 1), shot.setup.elevation, shot.setup.charge, 'yaw', 0.5],
    [shot.setup.yaw, round(shot.setup.elevation + 1, 1), shot.setup.charge, 'elevation', 0.25],
    [shot.setup.yaw, shot.setup.elevation, round(shot.setup.charge + 0.05, 2), 'charge', 0.01],
  ];
  for (const [yaw, elevation, charge, axis, step] of neighbors) {
    const other = by.get(`${yaw}|${elevation}|${charge}`);
    if (!other || !crosses(shot, other)) continue;
    const span = axis === 'yaw' ? yaw - shot.setup.yaw : axis === 'elevation' ? elevation - shot.setup.elevation : charge - shot.setup.charge;
    const count = Math.round(span / step);
    for (let i = 1; i < count; i++) {
      const setup = {
        railIndex: 1,
        originX: 0,
        yaw: axis === 'yaw' ? round(shot.setup.yaw + i * step, 1) : shot.setup.yaw,
        elevation: axis === 'elevation' ? round(shot.setup.elevation + i * step, 2) : shot.setup.elevation,
        charge: axis === 'charge' ? round(shot.setup.charge + i * step, 2) : shot.setup.charge,
      };
      if (setup.yaw < -60 || setup.yaw > 60 || setup.elevation < 8 || setup.elevation > 26 || setup.charge < 0.3 || setup.charge > 0.9) continue;
      setups.set(`${setup.yaw}|${setup.elevation}|${setup.charge}`, setup);
    }
  }
}

const base = createBackPocketPreset();
const bare = adaptRangePreset({ ...base, objects: base.objects.filter(object => object.id !== 'bank-yours'), rules: { ...base.rules, allowance: {} } });
const gitSha = rangeGitSha();
const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const session = createRangeHarness(havok, bare.world, gitSha);
await mkdir(OUT, { recursive: true });
const path = `${OUT}/gap.jsonl`;
writeFileSync(path, `${JSON.stringify({
  ...rangeProvenance({ presetId: 'back-pocket', presetHash: await sha256Hex(exportRangePreset(bare.preset)), seed: 20261024, gitSha, label: 'direct-fire gap fill', campaign: 'back-pocket-gap' }),
  stepLoop: 'createRangeHarness',
  count: setups.size,
  rule: 'coarse neighbors whose landings fall on opposite sides of z 50 and z 58; sample the open interval',
})}\n`);
let min = Infinity;
let minLine = null;
let scored = 0;
let index = 0;
const started = performance.now();
try {
  for (const setup of setups.values()) {
    const last = session.shoot(bare.world, setup);
    const goal = last.goalResult;
    const line = {
      type: 'shot', index, setup,
      reason: last.terminal?.reason ?? last.reason,
      position: last.terminal?.position ?? last.position,
      distance: goal?.distance ?? null,
      scored: goal?.scored === true,
      contacts: (last.contacts ?? []).map(contact => ({ body: contact.body, first: contact.first, count: contact.count })),
    };
    appendFileSync(path, `${JSON.stringify(line)}\n`);
    if (line.scored) scored += 1;
    if (typeof line.distance === 'number' && line.distance < min) { min = line.distance; minLine = line; }
    index += 1;
    if (index % 200 === 0) console.error(`  gap ${index}/${setups.size} min ${Number.isFinite(min) ? min.toFixed(3) : 'n/a'} scored ${scored}`);
  }
} finally { session.dispose(); }
const summary = { shots: index, scored, minDistance: Number.isFinite(min) ? min : null, minLine, seconds: (performance.now() - started) / 1000, pocket: PIN };
await writeFile(`${OUT}/gap-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.error(`gap shots ${index} scored ${scored} min ${summary.minDistance} in ${summary.seconds.toFixed(1)}s`);
