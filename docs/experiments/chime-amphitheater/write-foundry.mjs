// Record the bowl's tested shots and write the foundry pair.
//
//   node docs/experiments/chime-amphitheater/write-foundry.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const SOURCE = 'af02005834beba609d8aeb44803daad15380a7fd';

const cards = [
  {
    id: 'chime-bowl-aisle',
    invitation: 'Six timber steps curve around an open stage, with a straight aisle through the middle. You stand at the top of that aisle. The pieces stay where they are. There is no target.',
    physicalQuestion: 'Does a ball sent down the aisle meet the step lips and continue, or does the first lip end the line?',
    nearbySensitivity: 'The opening aim touches no step and ends on the stage ground. Yaw 8, elevation 8, charge 0.45 rings the outer lip, then step 2, then step 1. Yaw 8.5 at the same elevation and charge rings only the outer lip. Two of the ten three-contact shots keep three contacts through all six nudges, at yaw 24 and yaw -24, elevation 16, charge 0.35. Those repeat step 3 and then touch step 4.',
    validationEvidence: '875-shot Havok grid on a fresh runtime: yaw -24 to 24 by 2 degrees, elevations 8, 12, 16, 20, 24, 30, 40, charges 0.35, 0.45, 0.55, 0.65, 0.8, origin 0, rail 1. Face speed. Audible events merge onsets within 150 ms. Seed 20261114 is recorded and not applied. Terraces and Descending Resonance were measured again on the same harness.',
    limitations: [
      {
        category: 'physical-geometry',
        concept: 'A landing on the tread, then a roll across the step.',
        missing: 'The contacts that registered are the vertical lips. Each lip is one facet. A slide that crosses several facets of one tread did not occur.',
        extension: 'Keep the 12 degree facets. Do not change restitution to make the ball stay down.',
      },
      {
        category: 'authoring-tooling',
        concept: 'A curved step a person can place from the palette.',
        missing: 'The terrace is not a catalog piece. A world that is not locked rejects it.',
        extension: 'Leave it lab-only until a later decision. No general solid modeller.',
      },
      {
        category: 'presentation',
        concept: 'The bowl reads as one place from the tee and after the shot.',
        missing: 'The result view is the existing side orbit. A phone was not checked.',
        extension: 'No new camera.',
      },
    ],
    shots: [
      ['opening', { yaw: 0, elevation: 18, charge: 0.55 }],
      ['descent', { yaw: 8, elevation: 8, charge: 0.45 }],
      ['outer-lip', { yaw: -24, elevation: 8, charge: 0.45 }],
    ],
  },
  {
    id: 'chime-bowl-stage',
    invitation: 'The same six timber steps, seen from the open stage. The aisle is behind the ball and the steps rise ahead. The pieces stay where they are. There is no target.',
    physicalQuestion: 'Does a ball sent from the stage climb the steps, or does it leave over the rim and through the aisle?',
    nearbySensitivity: 'The opening aim leaves over the back of the yard and touches nothing. No shot on the grid makes two audible notes. The longest ledger is two outer steps inside 50 ms, and the second gain is negligible. The inner three steps are never touched. Yaw -24, elevation 16, charge 0.35 rings only the outer lip, then the ground.',
    validationEvidence: 'Same 875-shot grid, fresh runtime, face speed, 150 ms audible merge, as Down the Aisle. The pieces are the same. Only the station moves, to the stage centre, facing back up the aisle. Seed 20261114 is recorded and not applied.',
    limitations: [
      {
        category: 'physical-geometry',
        concept: 'A climb from the stage onto the inner treads.',
        missing: 'On this grid the inner three steps receive no contact. Shots that hit meet the outer three lips.',
        extension: 'The launch mapping was not changed. A different station would be a different experiment.',
      },
      {
        category: 'physical-geometry',
        concept: 'The apron at the top of the aisle.',
        missing: 'A shot that goes back through the aisle can meet the existing tee, and that tee still ends the line.',
        extension: 'The tee was not moved. It is the same apron every world already has.',
      },
      {
        category: 'presentation',
        concept: 'The stage station should read as standing inside the bowl.',
        missing: 'The opening camera is the shared orbit. The result view is the existing side orbit. A phone was not checked.',
        extension: 'No new camera.',
      },
    ],
    shots: [
      ['opening', { yaw: 0, elevation: 18, charge: 0.55 }],
      ['outer-lip', { yaw: -24, elevation: 16, charge: 0.35 }],
      ['graze', { yaw: -24, elevation: 8, charge: 0.65 }],
    ],
  },
];

const havok = await Havok({ wasmBinary: await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
for (const card of cards) {
  const presetText = await readFile(resolve(here, 'bowl', `${card.id}.json`), 'utf8');
  const preset = JSON.parse(presetText);
  const world = adaptRangePreset(preset).world;
  const harness = createRangeHarness(havok, world, rangeGitSha());
  if (!harness.runtime.setDynamics('normal-speed')) throw new Error('face speed was rejected');
  const testedShots = [];
  try {
    for (const [id, aim] of card.shots) {
      const last = harness.shoot(world, { railIndex: 1, originX: 0, ...aim });
      const contacts = (last.contacts ?? []).map(row => row.body).filter(body => body !== 'worldcraft-ground');
      const notes = (last.resonance?.impacts ?? []).filter(note => note.gain > 0).map(note => ({
        piece: note.piece, note: note.note, time: note.time, gain: note.gain,
      }));
      process.stdout.write(`${card.id} ${id} ${last.terminal.reason} ${notes.map(note => `${note.piece}:${note.note}@${note.time.toFixed(3)}:${note.gain.toExponential(2)}`).join('>') || '(silent)'}\n`);
      testedShots.push({
        id,
        setup: { railIndex: 1, originX: 0, ...aim },
        launchPhase: null,
        terminal: { reason: last.terminal.reason, elapsed: last.terminal.elapsed, position: [...last.terminal.position] },
        outcome: { kind: last.goalResult.kind, status: last.goalResult.status },
        ...(contacts.length ? { contacts } : {}),
      });
    }
  } finally {
    harness.dispose();
  }
  const manifest = {
    format: 'rail-golf-worldcraft-foundry-manifest',
    version: 1,
    id: preset.id,
    name: preset.name,
    kind: 'shot-study',
    invitation: card.invitation,
    physicalQuestion: card.physicalQuestion,
    editable: { launcher: true, geometry: false },
    challenge: null,
    sourceBuild: SOURCE,
    seed: 20261114,
    testedShots,
    nearbySensitivity: card.nearbySensitivity,
    validationEvidence: card.validationEvidence,
    limitations: card.limitations,
    customCode: null,
    presentation: { dynamics: 'normal-speed', timeline: true },
  };
  const dir = resolve(root, 'worlds/foundry', card.id);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'preset.json'), presetText.endsWith('\n') ? presetText : `${presetText}\n`);
  await writeFile(resolve(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}
