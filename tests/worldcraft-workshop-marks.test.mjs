// Fire → Ready again → Adjust last line → Fire keeps the previous shot's
// note marks, and the amber trail stays that shot rather than the new one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { workshopTrailStep } from '../lib/worldcraft-range.js';

const setup = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
const shot = (id, z) => ({
  worldIdentity: id,
  setup,
  points: [{ x: 0, y: 1, z: 0, t: 0 }, { x: 1, y: 2, z, t: 1 }],
});
const marks = (note, z) => [{ note, role: 'ramp', piece: 'ramp-yours', time: 1.42, gap: null, point: { x: 0, y: 1, z } }];

test('Fire, Ready again, Adjust last line, then Fire keeps the previous notes on the previous trail', () => {
  let memory = { presetId: 'musical-workshop', history: null, historyMarks: null, comparison: null, comparisonMarks: null };
  const first = shot('world-a', 10);
  const firstMarks = marks('D4', 10);
  memory = workshopTrailStep(memory, { kind: 'fire' });
  assert.equal(memory.comparison, null);
  assert.equal(memory.comparisonMarks, null);
  memory = workshopTrailStep(memory, { kind: 'resolve', ...first, marks: firstMarks });
  assert.equal(memory.history.label, 'Latest line');
  assert.equal(memory.history.worldIdentity, 'world-a');
  assert.equal(memory.history.points[1].z, 10);
  assert.deepEqual(memory.historyMarks, firstMarks);
  assert.equal(memory.comparison, null, 'the first shot has no previous trail');

  const afterReady = workshopTrailStep(memory, { kind: 'ready' });
  assert.equal(afterReady.history, memory.history);
  assert.equal(afterReady.historyMarks, memory.historyMarks);
  assert.equal(afterReady.comparison, memory.comparison);
  assert.equal(afterReady.comparisonMarks, memory.comparisonMarks);
  memory = afterReady;

  memory = workshopTrailStep(memory, { kind: 'adjust', ...first, marks: firstMarks });
  assert.equal(memory.comparison, null);
  assert.equal(memory.comparisonMarks, null);
  assert.deepEqual(memory.historyMarks, firstMarks, 'Adjust keeps the note marks for the next fire');
  assert.equal(memory.history.points[1].z, 10);
  assert.notEqual(memory.history, afterReady.history, 'the kept trail is a copy');

  const second = shot('world-b', 40);
  const secondMarks = marks('E4', 40);
  memory = workshopTrailStep(memory, { kind: 'fire' });
  assert.equal(memory.comparison.worldIdentity, 'world-a');
  assert.equal(memory.comparison.points[1].z, 10);
  assert.deepEqual(memory.comparisonMarks, firstMarks, 'the amber markers are the adjusted shot');
  assert.equal(memory.history.points[1].z, 10, 'history stays the previous shot until the new one resolves');
  assert.notEqual(memory.comparison, memory.history);

  memory = workshopTrailStep(memory, { kind: 'resolve', ...second, marks: secondMarks });
  assert.equal(memory.history.worldIdentity, 'world-b');
  assert.equal(memory.history.points[1].z, 40, 'cyan trail is the shot just fired');
  assert.deepEqual(memory.historyMarks, secondMarks);
  assert.equal(memory.comparison.worldIdentity, 'world-a');
  assert.equal(memory.comparison.points[1].z, 10, 'amber trail is still the previous shot');
  assert.deepEqual(memory.comparisonMarks, firstMarks);
});

test('a preset other than Musical Workshop does not keep note marks on the comparison', () => {
  const first = shot('world-a', 10);
  let memory = workshopTrailStep(
    { presetId: 'resonant-run-free', history: null, historyMarks: null, comparison: null, comparisonMarks: null },
    { kind: 'resolve', ...first, marks: marks('D4', 10) },
  );
  assert.equal(memory.historyMarks, null);
  memory = workshopTrailStep(memory, { kind: 'adjust', ...first, marks: marks('D4', 10) });
  assert.equal(memory.historyMarks, null);
  memory = workshopTrailStep(memory, { kind: 'fire' });
  assert.equal(memory.comparisonMarks, null);
  assert.equal(memory.comparison.points[1].z, 10);
});

test('the play controls use the trail step and the preset dynamics label', async () => {
  const ui = await readFile(new URL('../app/lab/worldcraft/worldcraft.tsx', import.meta.url), 'utf8');
  assert.match(ui, /setDynamics\(presetDynamics\(uiRef\.current\.presetId\)\)/);
  assert.match(ui, /workshopTrailStep\(trailMemory\(\), \{ kind: 'fire' \}\)/);
  assert.match(ui, /workshopTrailStep\(trailMemory\(\), \{ kind: 'ready' \}\)/);
  assert.match(ui, /kind: 'adjust'/);
  assert.match(ui, /kind: 'resolve'/);
  assert.match(ui, /recordedDynamicsLabel\(uiRef\.current\.presetId, uiRef\.current\.soundVariant\)/);
  assert.match(ui, /playRecorded\(impacts, workshop \? uiRef\.current\.soundVariant : undefined\)/);
  assert.equal(ui.includes("'A · PR #55'"), false);
});
