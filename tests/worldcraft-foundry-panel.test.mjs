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
  deckExchangeSentence, foundryPlayCopy, foundryReceiptParts, foundryShotNotice, musicalWorkshopPlayCard,
  nearestCarriageStop, restingPlace, resultFraming, returnReadout,
} from '../lib/worldcraft-play-copy.js';
import { describeImpactSequence, noteTimeline } from '../lib/worldcraft-resonance.js';
import { evaluateFoundryShot } from '../scripts/foundry/validate.mjs';

const RULES = {
  'bell-loft': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank and the ramp can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'return-address': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'right-angle': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'open-contacts': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'ricochet-garden-loop': 'Origin, yaw, elevation, and power can change inside the rail stops. The bank can move. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'descending-resonance': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'descending-resonance-flat': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'the-carry': 'The shot stays on the printed origin, yaw, elevation, and power. The ramp can move. The gold circle judges the first landing, and the landing is not a score.',
  'the-other-way': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'soft-landing': 'Origin, yaw, elevation, and power can change inside the rail stops. The block and the bank can move. The gold circle judges the first landing, and the landing is not a score.',
  'capacity-24-passive': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
  'capacity-24-active': 'Origin, yaw, elevation, and power can change inside the rail stops. The pieces stay where they are. There is no circle and no score. The line ends on first ground, or when the ball settles.',
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
  assert.match(ui, /foundryReceiptParts\(ui\.foundryId/);
  assert.match(ui, /resultFraming\([\s\S]*?uiRef\.current\.foundryId\)/);
  assert.match(ui, /row\.label \?\? row\.note/);
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
  const loftRecord = {
    terminal: { reason: 'settled', position: [0, 4.429999828338623, 53.87986755371094] },
    contacts: [],
    setup: { originX: 0 },
  };
  const frame = resultFraming({ objects: loft.objects }, loftRecord, 'bell-loft');
  assert.equal(resultFraming({ objects: loft.objects }, loftRecord, 'ricochet-garden-loop'), null);
  assert.equal(resultFraming({ objects: loft.objects }, loftRecord, 'open-contacts'), null);
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

test('Right Angle, Return Address, and Bell Loft receipts stay on those worlds', () => {
  const angle = foundryRecord('right-angle');
  const address = foundryRecord('return-address');
  const loft = foundryRecord('bell-loft');
  const loop = foundryRecord('ricochet-garden-loop');
  const open = foundryRecord('open-contacts');
  const outsiders = [loop, open];
  const leak = /Both faces were touched|came back to|Deck contact|came to rest up on|A silent piece/;

  const angleNotice = foundryShotNotice(ended(angle.world, 'first-ground-contact', [4.2935285568237305, 0.43, 4.310322284698486], {
    setup: { originX: 0 },
    contacts: [{ body: 'worldcraft-object-side-face' }, { body: 'worldcraft-object-back-face' }],
  }), angle.preset);
  assert.match(angleNotice, /Both faces were touched/);
  assert.match(angleNotice, /came back to/);

  const serve = [{ body: 'worldcraft-tee', point: { x: 10.24, y: 0.35, z: -1 }, count: 1 }];
  const addressNotice = foundryShotNotice(ended(address.world, 'first-ground-contact', [10.24, 0.73, -1], {
    setup: { originX: 0 },
    contacts: serve,
  }), address.preset);
  assert.match(addressNotice, /Deck contact at x 10\.24/);
  assert.match(foundryReceiptParts('return-address', address.world, ended(address.world, 'first-ground-contact', [10.24, 0.73, -1], { contacts: serve })).deck, /Deck contact/);

  const restNotice = foundryShotNotice(ended(loft.world, 'settled', [0, 4.429999828338623, 53.87986755371094]), loft.preset);
  assert.match(restNotice, /came to rest up on the block, above the ground/);
  assert.match(foundryReceiptParts('bell-loft', loft.world, ended(loft.world, 'settled', [0, 4.429999828338623, 53.87986755371094])).rest, /came to rest up on the block/);

  for (const record of outsiders) {
    const pieces = record.world.objects.slice(0, 2);
    const contacts = pieces.map(object => ({ body: `worldcraft-object-${object.id}`, count: 1 }));
    const back = ended(record.world, 'first-ground-contact', [0, 0.43, 10], { setup: { originX: 0 }, contacts });
    assert.ok(returnReadout(record.world, contacts, back.terminal, back.setup), `${record.manifest.id} would have matched the return pattern`);
    assert.equal(leak.test(foundryShotNotice(back, record.preset)), false, record.manifest.id);
    assert.equal(resultFraming(record.world, back, record.manifest.id), null);
    assert.deepEqual(foundryReceiptParts(record.manifest.id, record.world, back), { rest: null, deck: null, back: null });

    const deck = ended(record.world, 'first-ground-contact', [10.24, 0.73, -1], { setup: { originX: 0 }, contacts: serve });
    assert.ok(deckExchangeSentence(serve));
    assert.equal(leak.test(foundryShotNotice(deck, record.preset)), false, record.manifest.id);
    assert.equal(foundryReceiptParts(record.manifest.id, record.world, deck).deck, null);
    const described = describeImpactSequence(record.world, serve, { impacts: [] });
    assert.equal(described.explanation.includes('silent piece'), false);
    assert.equal(described.explanation.includes('Deck contact'), false);

    const parked = ended(record.world, 'settled', [0, 7.43, 34], { setup: { originX: 0 } });
    if (record.manifest.id === 'ricochet-garden-loop') assert.ok(restingPlace(record.world, parked.terminal));
    assert.equal(leak.test(foundryShotNotice(parked, record.preset)), false, record.manifest.id);
    assert.equal(resultFraming(record.world, parked, record.manifest.id), null);
  }
});

test('shared note names stay distinct in the headline, timeline, and untouched list', () => {
  const loop = foundryRecord('ricochet-garden-loop');
  const impacts = [
    { piece: 'bank-back', role: 'bank', body: 'worldcraft-object-bank-back', time: 0.4, material: 'timber', note: 'C4', callbacks: 1 },
    { piece: 'plate-east', role: 'plate', body: 'worldcraft-object-plate-east', time: 0.8, material: 'metal', note: 'E4', callbacks: 1 },
    { piece: 'plate-mouth-e', role: 'plate', body: 'worldcraft-object-plate-mouth-e', time: 1.1, material: 'metal', note: 'A4', callbacks: 1 },
    { piece: 'plate-east', role: 'plate', body: 'worldcraft-object-plate-east', time: 1.4, material: 'metal', note: 'E4', callbacks: 1 },
  ];
  const contacts = impacts.map(impact => ({ body: impact.body, count: 1 }));
  const described = describeImpactSequence(loop.world, contacts, { impacts });
  assert.equal(described.headline, 'Bank C4 → Plate E4 · x 6 → Plate A4 · x 4.5 → Plate E4 · x 6');
  assert.match(described.explanation, /Plate E4 · x 2\.5/);
  assert.match(described.explanation, /not touched/);
  assert.equal(/Plate E4(?! ·)/.test(described.headline), false);
  assert.equal(/Plate E4(?! ·)/.test(described.explanation), false);
  assert.equal(/Plate A4(?! ·)/.test(described.explanation), false);
  assert.equal(/Plate G4(?! ·)/.test(described.explanation), false);
  const rows = noteTimeline(impacts, loop.world);
  assert.equal(rows[0].label, null);
  assert.equal(rows[0].note, 'C4');
  assert.equal(rows[1].label, 'Plate E4 · x 6');
  assert.equal(rows[2].label, 'Plate A4 · x 4.5');
  assert.equal(noteTimeline(impacts)[1].label, null);
});
