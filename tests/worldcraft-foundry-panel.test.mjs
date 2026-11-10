import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMusicalWorkshopPreset } from '../lib/worldcraft-range.js';
import { presetDynamics, recordedDynamicsLabel } from '../lib/worldcraft-resonance.js';
import { workshopTrailStep } from '../lib/worldcraft-range.js';
import {
  applyFoundryLayout, foundryContactsMatch, foundryPreset, foundryRecord, listFoundryWorlds, validateFoundryManifest,
} from '../lib/worldcraft-foundry.js';
import {
  deckExchangeSentence, foundryPlayCopy, foundryShotNotice, musicalWorkshopPlayCard,
  nearestCarriageStop, restingPlace, resultFraming, returnReadout,
} from '../lib/worldcraft-play-copy.js';
import { evaluateFoundryShot } from '../scripts/foundry/validate.mjs';

const RULES = {
  'bell-loft': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank and the ramp can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'return-address': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'right-angle': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'open-contacts': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'ricochet-garden-loop': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'the-carry': 'The shot stays on the printed origin, yaw, elevation, and power. The ramp can move. The gold circle judges the first landing, and the landing is not a score.',
  'the-other-way': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'soft-landing': 'Origin, yaw, elevation, and power can change inside the rail stops. The block and the bank can move. The gold circle judges the first landing, and the landing is not a score.',
};

function ended(world, reason, position, extra = {}) {
  return {
    world,
    reason,
    terminal: { reason, elapsed: 1, position },
    setup: extra.setup ?? { originX: 0, yaw: 0, elevation: 0, charge: 0 },
    contacts: extra.contacts ?? [],
    goalResult: extra.goalResult ?? { kind: 'none', status: 'none' },
  };
}

test('each gallery world and Musical Workshop get the panel sentence that matches the loaded rules', async () => {
  const ui = await readFile(new URL('../app/lab/worldcraft/worldcraft.tsx', import.meta.url), 'utf8');
  const workshop = musicalWorkshopPlayCard();
  assert.equal(workshop.heading, 'Musical Workshop');
  assert.equal(workshop.body, 'The ramp, bank, and plate can move and ring. Origin, yaw, elevation, and power can change, inside the rail stops. No score. The earlier trail is the one that was recorded.');
  assert.match(ui, /musicalWorkshopPlayCard\(\)/);
  assert.match(ui, /presetId === 'musical-workshop'/);
  assert.match(ui, /Revise a piece and fire the same shot/);
  for (const card of listFoundryWorlds()) {
    const record = foundryRecord(card.id);
    const copy = foundryPlayCopy(record.manifest, record.preset);
    assert.equal(copy.heading, record.manifest.name);
    assert.equal(copy.invitation, record.manifest.invitation);
    assert.equal(copy.rules, RULES[card.id]);
    assert.equal(copy.playNotice, `${copy.invitation} ${copy.rules}`);
    assert.equal(copy.heading === 'Musical Workshop', false);
    assert.equal(copy.rules.includes('can move and ring'), false);
  }
  const other = foundryRecord('the-other-way');
  const otherNotice = foundryShotNotice(ended(other.world, 'first-ground-contact', [0, 0.43, 28]), other.preset);
  assert.match(otherNotice, /First ground ended the line/);
  assert.match(otherNotice, /The pieces stay where they are/);
  assert.equal(otherNotice.includes('Revise a piece'), false);
  const carry = foundryRecord('the-carry');
  const carryNotice = foundryShotNotice(ended(carry.world, 'first-ground-contact', [0, 0.43, 36], {
    goalResult: { kind: 'first-ground-zone', status: 'miss', distance: 16.238 },
  }), carry.preset);
  assert.match(carryNotice, /Outside the circle · 16\.2 m from centre/);
  assert.match(carryNotice, /The ramp can move/);
  assert.equal(carryNotice.includes('block'), false);
  assert.equal(carryNotice.includes('bank'), false);
  assert.equal(carryNotice.includes('Aim and power stay inside'), false);
  const angle = foundryRecord('right-angle');
  const angleNotice = foundryShotNotice(ended(angle.world, 'first-ground-contact', [4.2935285568237305, 0.43, 4.310322284698486], {
    setup: { originX: 0 },
    contacts: [{ body: 'worldcraft-object-side-face' }, { body: 'worldcraft-object-back-face' }, { body: 'worldcraft-ground' }],
  }), angle.preset);
  assert.match(angleNotice, /Both faces were touched/);
  assert.match(angleNotice, /came back to 6\.1 m from the carriage/);
  assert.equal(angleNotice.includes('Revise a piece'), false);
});

test('Open Contacts opts into the existing bank voice and timeline, and Musical Workshop stays on its own id', () => {
  const open = foundryRecord('open-contacts').manifest.presentation;
  assert.deepEqual(open, { dynamics: 'normal-speed', bankVoice: true, timeline: true });
  assert.equal(presetDynamics('open-contacts', open), 'normal-speed');
  assert.equal(presetDynamics('open-contacts'), 'total-speed');
  assert.equal(presetDynamics('musical-workshop'), 'normal-speed');
  assert.equal(presetDynamics('soft-landing'), 'total-speed');
  assert.equal(recordedDynamicsLabel('open-contacts', 'tuned-even', open), 'H · G, grazes lifted');
  assert.equal(recordedDynamicsLabel('musical-workshop', 'tuned-even'), 'H · G, grazes lifted');
  assert.equal(recordedDynamicsLabel('soft-landing', 'tuned-even'), 'Total speed · original knock');
  assert.equal(foundryRecord('bell-loft').manifest.presentation, null);
  const loop = foundryRecord('ricochet-garden-loop').manifest.presentation;
  assert.deepEqual(loop, { dynamics: 'normal-speed', bankVoice: true, timeline: true });
  assert.equal(presetDynamics('ricochet-garden-loop', loop), 'normal-speed');
  assert.equal(recordedDynamicsLabel('ricochet-garden-loop', 'tuned-even', loop), 'H · G, grazes lifted');
  assert.equal(createMusicalWorkshopPreset().id, 'musical-workshop');
  const marks = [{ note: 'C4', time: 1 }];
  const shot = { worldIdentity: 'world-a', setup: { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 }, points: [{ x: 0, y: 1, z: 0, t: 0 }, { x: 1, y: 1, z: 2, t: 1 }] };
  let memory = workshopTrailStep({ presetId: 'open-contacts', timeline: true, history: null, historyMarks: null, comparison: null, comparisonMarks: null }, { kind: 'resolve', ...shot, marks });
  assert.deepEqual(memory.historyMarks, marks);
  memory = workshopTrailStep(memory, { kind: 'fire' });
  assert.deepEqual(memory.comparisonMarks, marks);
  const plain = workshopTrailStep({ presetId: 'open-contacts', history: null, historyMarks: null, comparison: null, comparisonMarks: null }, { kind: 'resolve', ...shot, marks });
  assert.equal(plain.historyMarks, null);
});

test('layout and contacts pass and fail without a new goal or a neighbour search', () => {
  const bell = foundryPreset('bell-loft');
  const shut = applyFoundryLayout(bell, { objects: [{ id: 'door', x: -4, z: 49, yaw: 0 }] });
  assert.equal(shut.preset.objects.find(object => object.id === 'door').x, -4);
  assert.equal(shut.preset.objects.find(object => object.id === 'door').kind, 'bank');
  assert.throws(() => applyFoundryLayout(bell, { objects: [{ id: 'door', x: 8.5, z: 49, yaw: 0 }] }), /overlaps another piece/);
  const manifest = structuredClone(foundryRecord('bell-loft').manifest);
  manifest.testedShots.push({
    id: 'overlap',
    setup: manifest.testedShots[0].setup,
    launchPhase: null,
    layout: { objects: [{ id: 'door', x: 0, z: 49, yaw: 0 }] },
    terminal: manifest.testedShots[0].terminal,
    outcome: manifest.testedShots[0].outcome,
  });
  assert.throws(() => validateFoundryManifest(manifest, bell), /overlaps another piece/);
  const badContacts = structuredClone(foundryRecord('return-address').manifest);
  badContacts.testedShots[1].contacts = ['worldcraft-object-missing'];
  assert.throws(() => validateFoundryManifest(badContacts, foundryPreset('return-address')), /piece or worldcraft-tee/);
  const empty = structuredClone(foundryRecord('right-angle').manifest);
  empty.testedShots[1].contacts = [];
  assert.throws(() => validateFoundryManifest(empty, foundryPreset('right-angle')), /1–8 bodies/);
  const serve = [
    { body: 'worldcraft-object-west' },
    { body: 'worldcraft-ground' },
    { body: 'worldcraft-object-east' },
    { body: 'worldcraft-tee', point: { x: 3.981315851211548, y: 0.35, z: 1.27 } },
  ];
  assert.equal(foundryContactsMatch(['worldcraft-object-west', 'worldcraft-object-east', 'worldcraft-tee'], serve), true);
  assert.equal(foundryContactsMatch(['worldcraft-object-east', 'worldcraft-object-west', 'worldcraft-tee'], serve), false);
  assert.equal(nearestCarriageStop(3.981315851211548), 4);
  assert.equal(nearestCarriageStop(-10.275745391845703), null);
  assert.match(deckExchangeSentence(serve), /Deck contact at x 3\.98\. The nearest carriage stop is 4\. The next launch starts from here\./);
  const loft = foundryPreset('bell-loft');
  const world = { objects: loft.objects };
  const rest = restingPlace(world, { reason: 'settled', position: [0, 4.429999828338623, 53.87986755371094] });
  assert.equal(rest?.kind, 'block');
  assert.match(rest.sentence, /came to rest up on the block, above the ground/);
  const frame = resultFraming({ objects: loft.objects }, {
    terminal: { reason: 'settled', position: [0, 4.429999828338623, 53.87986755371094] },
    contacts: [],
    setup: { originX: 0 },
  });
  assert.equal(frame.view, 'survey');
  assert.equal(frame.x, 0);
  assert.ok(frame.elevation > 1);
  assert.ok(frame.radius >= 36);
  assert.equal(restingPlace(world, { reason: 'first-ground-contact', position: [0, 0.43, 45.49] }), null);
  const back = returnReadout(world, [{ body: 'worldcraft-object-side-face' }], { position: [1, 0.43, 2] }, { originX: 0 });
  assert.equal(back, null);
  const passed = evaluateFoundryShot({
    terminal: { reason: 'settled', elapsed: 15.249999999999774, position: [0, 4.43, 53] },
    outcome: { kind: 'none', status: 'none' },
    contacts: serve,
  }, {
    terminal: { reason: 'settled', elapsed: 15.249999999999774, position: [0, 4.43, 53] },
    outcome: { kind: 'none', status: 'none' },
    contacts: ['worldcraft-object-west', 'worldcraft-object-east', 'worldcraft-tee'],
  });
  assert.equal(passed.terminal && passed.outcome && passed.contacts, true);
  const failed = evaluateFoundryShot({
    terminal: { reason: 'first-ground-contact', elapsed: 1, position: [0, 0.43, 1] },
    outcome: { kind: 'none', status: 'none' },
    contacts: [{ body: 'worldcraft-object-west' }, { body: 'worldcraft-ground' }],
  }, {
    terminal: { reason: 'settled', elapsed: 15.249999999999774, position: [0, 4.43, 53] },
    outcome: { kind: 'none', status: 'none' },
    contacts: ['worldcraft-object-west', 'worldcraft-object-east', 'worldcraft-tee'],
  });
  assert.equal(failed.terminal, false);
  assert.equal(failed.contacts, false);
});
