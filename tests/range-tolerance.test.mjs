import test from 'node:test';
import assert from 'node:assert/strict';
import { clearRuns, contiguousArea, contiguousWidth } from '../scripts/range/tolerance.mjs';

test('a gap splits clears, and the width is the run that contains the representative', () => {
  const samples = [0, 1, 2, 3, 4, 5, 6].map(value => ({
    value,
    clear: value !== 3,
    representative: value === 5,
  }));
  const width = contiguousWidth(samples, 1);
  assert.equal(width.first, 4);
  assert.equal(width.last, 6);
  assert.equal(width.width, 2);
  assert.equal(width.count, 3);
  assert.equal(width.bracketLow, 3);
  assert.equal(width.censoredHigh, true);
  assert.deepEqual(clearRuns(samples, 1).map(run => [run.first, run.last, run.count]), [[0, 2, 3], [4, 6, 3]]);
});

test('an untouched scan edge is censored, and a neighbouring miss is a bracket', () => {
  const samples = [
    { value: 0, clear: true, representative: true },
    { value: 0.5, clear: true },
    { value: 1, clear: false },
  ];
  const width = contiguousWidth(samples, 0.5);
  assert.equal(width.width, 0.5);
  assert.equal(width.censoredLow, true);
  assert.equal(width.censoredHigh, false);
  assert.equal(width.bracketHigh, 1);
  assert.equal(width.bracketLow, null);
});

test('area counts the 4-connected component and not a diagonal neighbour', () => {
  const cells = [
    { yaw: 0, charge: 0, clear: true, representative: true },
    { yaw: 0.5, charge: 0, clear: true },
    { yaw: 0, charge: 0.01, clear: true },
    { yaw: 0.5, charge: 0.01, clear: false },
    { yaw: 1, charge: 0.01, clear: true },
  ];
  const area = contiguousArea(cells, { yaw: 0.5, charge: 0.01 }, { yaw: 0, charge: 0 });
  assert.equal(area.count, 3);
  assert.equal(area.area, 3 * 0.5 * 0.01);
  assert.equal(area.censored, true);
  const boxed = [
    { yaw: 0, charge: 0, clear: true, representative: true },
    { yaw: 1, charge: 0, clear: true },
    { yaw: 0, charge: 1, clear: true },
    { yaw: 1, charge: 1, clear: true },
    { yaw: -1, charge: 0, clear: false },
    { yaw: 2, charge: 0, clear: false },
    { yaw: 0, charge: -1, clear: false },
    { yaw: 0, charge: 2, clear: false },
    { yaw: 1, charge: -1, clear: false },
    { yaw: 1, charge: 2, clear: false },
    { yaw: -1, charge: 1, clear: false },
    { yaw: 2, charge: 1, clear: false },
  ];
  const full = contiguousArea(boxed, { yaw: 1, charge: 1 }, { yaw: 0, charge: 0 });
  assert.equal(full.count, 4);
  assert.equal(full.censored, false);
  assert.equal(full.area, 4);
});
