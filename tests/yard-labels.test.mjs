import assert from 'node:assert/strict';
import test from 'node:test';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { HOLES as PRACTICE_HOLES } from '../lib/rail-golf-v02.js';
import { YARD_STATIONS } from '../lib/stations.js';
import { authoredFeatureLabels, isTreadLabelVisible, stationTargetDistance, stationTargetDistanceLabel, yardFeatureLabels } from '../lib/yard-labels.js';

const [delivery, gallery, cascade] = COURTYARD_HOLES;
const ids = labels => labels.map(feature => feature.id);

test('all three courtyard distances are station-relative ground-plan measurements', () => {
  assert.equal(stationTargetDistance(delivery.target, delivery.station), 146);
  assert.equal(stationTargetDistance(gallery.target, gallery.station), Math.hypot(6, 62));
  assert.equal(stationTargetDistance(cascade.target, cascade.station), 108);
  assert.deepEqual(COURTYARD_HOLES.map(hole => stationTargetDistanceLabel(hole.target, hole.station)), [
    '146 m from tee', '62 m from tee', '108 m from tee',
  ]);
});

test('translated, reversed, and diagonal stations use both coordinates without inventing a launch origin', () => {
  assert.equal(stationTargetDistance({ x: 103, z: -196 }, { x: 100, z: -200, yaw: 180 }), 5);
  assert.equal(stationTargetDistance({ x: 100, z: -200 }, { x: 103, z: -196, yaw: 90 }), 5);
  assert.equal(stationTargetDistanceLabel({ x: 100, z: -200 }, { x: 100, z: -200 }), '0 m from tee');
  for (const hole of PRACTICE_HOLES) {
    assert.equal(stationTargetDistance(hole.target, hole.station), null);
    assert.equal(stationTargetDistance(hole.target, YARD_STATIONS.gate), Math.hypot(hole.target.x, hole.target.z));
  }
});

test('unknown or invalid endpoints omit the distance instead of printing world Z or a bogus value', () => {
  const valid = { x: 0, z: 0 };
  for (const invalid of [null, undefined, {}, { x: 0 }, { x: '0', z: 1 }, { x: NaN, z: 1 }, { x: 0, z: Infinity }]) {
    assert.equal(stationTargetDistanceLabel(invalid, valid), null);
    assert.equal(stationTargetDistanceLabel(valid, invalid), null);
  }
  assert.equal(stationTargetDistance({ x: Number.MAX_VALUE, z: 0 }, { x: -Number.MAX_VALUE, z: 0 }), null);
});

test('challenge labels identify the actual authored features and order', () => {
  assert.deepEqual(authoredFeatureLabels(delivery), []);
  assert.deepEqual(authoredFeatureLabels(gallery).map(({ id, label, ordinal }) => ({ id, label, ordinal })), [
    { id: 'bank-a', label: 'BANK A', ordinal: 1 },
    { id: 'bank-b', label: 'BANK B', ordinal: 2 },
  ]);
  const treads = authoredFeatureLabels(cascade);
  assert.deepEqual(ids(treads), ['step-a', 'step-b', 'step-c']);
  assert.deepEqual(treads.map(({ label, ordinal }) => [label, ordinal]), [['TREAD 1', 1], ['TREAD 2', 2], ['TREAD 3', 3]]);
  assert.ok(treads.every(feature => !feature.optional));
  assert.ok(!treads.some(feature => /BANK|BREAK THROUGH/.test(feature.label)));
  assert.deepEqual(authoredFeatureLabels({ ...gallery, requiredTags: ['bank-b', 'bank-a'] }).map(({ id, ordinal }) => [id, ordinal]), [['bank-b', 1], ['bank-a', 2]]);
});

test('explicit tag mapping never turns unknown tags into a breach or infers Bank B from a count', () => {
  const labelFor = requiredTags => authoredFeatureLabels({ id: 'test', requiredTags });
  assert.deepEqual(ids(labelFor(['boost', 'breach'])), ['boost', 'breach']);
  assert.deepEqual(labelFor(['unknown', 'constructor', 'toString']), []);
  assert.deepEqual(labelFor(['unknown', 'bank-b']).map(({ id, ordinal }) => [id, ordinal]), [['bank-b', 2]]);
  assert.deepEqual(authoredFeatureLabels({ ...gallery, orderedTags: false }).map(feature => feature.ordinal), [null, null]);
  assert.equal(labelFor(['bank'])[0].label, 'BANK HERE');
});

test('Delivery address exposes only the inspected optional route while Survey exposes the optional features', () => {
  assert.deepEqual(yardFeatureLabels(delivery), []);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { routeFocus: 'direct' })), []);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { routeFocus: 'skip' })), ['boost']);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { routeFocus: 'sky' })), ['sky']);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { routeFocus: 'mill' })), ['mill']);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { routeFocus: 'unrecognized' })), []);
  assert.deepEqual(ids(yardFeatureLabels(delivery, { survey: true })), ['boost', 'sky', 'mill']);
  assert.ok(yardFeatureLabels(delivery, { survey: true }).every(feature => feature.optional && feature.ordinal === null));
});

test('route-tab state cannot leak optional labels onto Gallery or Cascade; their required features remain', () => {
  for (const hole of [gallery, cascade]) {
    for (const routeFocus of ['direct', 'sky', 'skip', 'mill']) {
      assert.deepEqual(yardFeatureLabels(hole, { routeFocus }), authoredFeatureLabels(hole));
    }
    assert.deepEqual(ids(yardFeatureLabels(hole, { survey: true })), [...hole.requiredTags, 'boost']);
  }
  assert.deepEqual(ids(yardFeatureLabels({ ...delivery, requiredTags: ['boost'] }, { survey: true })), ['boost', 'sky', 'mill']);
});

test('presentation helpers leave authored coordinates, tags, rules, and records unchanged', () => {
  const before = JSON.stringify(COURTYARD_HOLES);
  for (const hole of COURTYARD_HOLES) {
    stationTargetDistanceLabel(hole.target, hole.station);
    const labels = yardFeatureLabels(hole, { survey: true });
    labels.reverse();
    labels[0].label = 'caller mutation';
  }
  assert.equal(JSON.stringify(COURTYARD_HOLES), before);
  assert.equal(yardFeatureLabels(delivery, { survey: true })[0].label, 'SKIP PAD');
});

test('aligned Lumber Walk callouts never name rear tread surfaces through the first stack', () => {
  const visible = camera => ['step-a', 'step-b', 'step-c'].map(id => isTreadLabelVisible(id, camera));
  assert.deepEqual(visible({ x: 22, y: 7.8, z: 169 }), [true, false, false]);
  assert.deepEqual(visible({ x: 22, y: 11.8, z: 169 }), [true, false, false]);
  assert.deepEqual(visible({ x: 55, y: 52, z: 160 }), [true, true, true]);
  assert.deepEqual(visible({ x: 50, y: 8, z: 169 }), [true, true, false], 'an off-axis view can reveal Tread 2 while Tread 3 stays screened');
  assert.deepEqual(visible({ x: 60, y: 8, z: 169 }), [true, true, true], 'a wider off-axis sightline clears both nearer stacks');
});

test('tread visibility is camera-relative, fails closed on invalid inputs, and leaves source data alone', () => {
  const camera = Object.freeze({ x: 55, y: 52, z: 160 });
  assert.equal(isTreadLabelVisible('unknown', camera), false);
  for (const invalid of [null, undefined, {}, { x: 22, z: 169 }, { x: NaN, y: 8, z: 169 }, { x: 22, y: Infinity, z: 169 }, { x: 22, y: 8, z: '169' }]) {
    assert.equal(isTreadLabelVisible('step-a', invalid), false);
  }
  assert.equal(isTreadLabelVisible('step-b', camera), true);
  assert.deepEqual(camera, { x: 55, y: 52, z: 160 });
  assert.equal(isTreadLabelVisible('step-a', { x: 22, y: 4, z: 122 }), true, 'its own stack is deliberately excluded from this inter-stack check');
});
