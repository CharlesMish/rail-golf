// The phase 2 bowl. Six filled steps, one aisle cut, two launch stations.
//
//   node docs/experiments/chime-amphitheater/place-bowl.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportRangePreset, validateRangePreset } from '../../../lib/worldcraft-range.js';
import { terraceSagitta, worldcraftTerraceFacets } from '../../../lib/worldcraft-terrace.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'bowl');

function steps() {
  const objects = [];
  for (let index = 0; index < 6; index += 1) {
    const elevation = (index + 1) * 0.5;
    objects.push({
      id: `step-${index}`,
      kind: 'terrace',
      x: 0,
      z: 32,
      yaw: -180,
      innerRadius: 8 + index * 2,
      depth: 2,
      riser: elevation,
      span: 228,
      elevation,
      gap: 12,
      voice: { material: 'timber', degree: index % 5 },
    });
  }
  return objects;
}

function preset(id, name, launcher) {
  return validateRangePreset({
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id,
    name,
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher,
    objects: steps(),
    rules: {
      launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 },
      fixed: steps().map(object => object.id),
      allowance: {},
      goal: { kind: 'none' },
    },
  });
}

const aisle = preset('chime-bowl-aisle', 'Down the Aisle', { x: 0 });
const stage = preset('chime-bowl-stage', 'From the Stage', { x: 0, z: 32, yaw: -180 });
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'chime-bowl-aisle.json'), exportRangePreset(aisle));
await writeFile(resolve(out, 'chime-bowl-stage.json'), exportRangePreset(stage));
const outer = worldcraftTerraceFacets(aisle.objects[5]);
process.stdout.write(`${JSON.stringify({
  pieces: aisle.objects.length,
  facetsPerStep: outer.length,
  bodies: aisle.objects.length * outer.length,
  sagittaAt18m: Number(terraceSagitta(18).toFixed(4)),
  aisleLauncher: aisle.launcher,
  stageLauncher: stage.launcher,
  tread: aisle.objects.map(object => ({ id: object.id, inner: object.innerRadius, top: object.elevation, degree: object.voice.degree })),
}, null, 2)}\n`);
