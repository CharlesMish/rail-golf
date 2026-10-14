import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutYardLabels } from '../lib/yard-label-layout.js';

const label = (id, x, y, width = 112, priority = 10) => ({ id, x, y, width, height: 24, priority });
const overlap = (a, b, padding = 6) => a.x < b.x + b.width + padding &&
  a.x + a.width + padding > b.x && a.y < b.y + b.height + padding &&
  a.y + a.height + padding > b.y;

function checkLayout(inputs, placements, viewport, obstacles = []) {
  assert.deepEqual(placements.map(p => p.id), inputs.map(p => p.id));
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    assert.equal(p.anchorX, inputs[i].x);
    assert.equal(p.anchorY, inputs[i].y);
    if (!p.visible) continue;
    assert.ok(p.x >= 8 && p.y >= 8 && p.x + p.width <= viewport.width - 8 &&
      p.y + p.height <= viewport.height - 8, `${p.id}: viewport clearance`);
    const dx = Math.max(p.x - p.anchorX, 0, p.anchorX - p.x - p.width);
    const dy = Math.max(p.y - p.anchorY, 0, p.anchorY - p.y - p.height);
    assert.ok(Math.hypot(dx, dy) <= 128, `${p.id}: callout remains near source`);
    for (const other of [...obstacles, ...placements.slice(0, i).filter(q => q.visible)]) {
      assert.equal(overlap(p, other), false, `${p.id}: no label/UI overlap`);
    }
  }
}

test('portrait Lumber Walk cluster keeps target/treads legible around HUD and launcher', () => {
  const viewport = { width: 390, height: 844 };
  const obstacles = [
    { x: 8, y: 8, width: 374, height: 206 },
    { x: 0, y: 590, width: 390, height: 254 },
    { x: 140, y: 425, width: 110, height: 165 },
  ];
  const inputs = [label('receiver', 184, 311, 151, 100), label('tread-a', 175, 347),
    label('tread-b', 193, 333), label('tread-c', 207, 320),
    label('bank-b', 235, 341, 102, 1), label('skip', 226, 372, 99, 1)];
  const result = layoutYardLabels(inputs, viewport, obstacles);
  checkLayout(inputs, result, viewport, obstacles);
  assert.ok(result.slice(0, 4).every(p => p.visible), 'target and three authored surfaces fit');
  assert.deepEqual(layoutYardLabels(inputs, viewport, obstacles), result, 'same camera gives stable placement');
  const reversed = layoutYardLabels([...inputs].reverse(), viewport, obstacles).reverse();
  assert.deepEqual(reversed, result, 'input ordering does not change feature allotment');
});

test('coincident Mill Bell and Sky Token anchors remain exact with distinct callouts', () => {
  const viewport = { width: 390, height: 844 };
  const inputs = [label('bell', 236, 271, 139, 100), label('sky', 236, 271, 99, 10)];
  const result = layoutYardLabels(inputs, viewport);
  checkLayout(inputs, result, viewport);
  assert.ok(result.every(p => p.visible));
  assert.notDeepEqual([result[0].x, result[0].y], [result[1].x, result[1].y]);
});

test('short landscape respects controls and launcher, hiding optional labels if space runs out', () => {
  const viewport = { width: 844, height: 390 };
  const obstacles = [{ x: 0, y: 0, width: 844, height: 145 },
    { x: 0, y: 253, width: 844, height: 137 },
    { x: 335, y: 183, width: 174, height: 70 }];
  const inputs = [label('target', 412, 173, 180, 100),
    ...Array.from({ length: 12 }, (_, i) => label(`optional-${i}`, 402 + i * 2, 200, 145, 0))];
  const result = layoutYardLabels(inputs, viewport, obstacles);
  checkLayout(inputs, result, viewport, obstacles);
  assert.ok(result[0].visible, 'target claims the available upper lane');
  assert.ok(result.slice(1).some(p => !p.visible), 'unplaceable labels are hidden');
});

test('screen edges never clip text or turn offscreen anchors into onscreen objects', () => {
  const viewport = { width: 390, height: 844 };
  const inputs = [label('left', 2, 310), label('right', 389, 380), label('top', 190, 2),
    label('bottom', 190, 843), label('outside-left', -1, 310),
    label('outside-right', 391, 310), label('outside-top', 190, -1),
    label('outside-bottom', 190, 845), label('too-wide', 190, 500, 390)];
  const result = layoutYardLabels(inputs, viewport);
  checkLayout(inputs, result, viewport);
  assert.ok(result.slice(0, 4).every(p => p.visible));
  assert.ok(result.slice(4).every(p => !p.visible));
});

test('priority wins scarce space even when the optional feature arrives first', () => {
  const viewport = { width: 180, height: 100 };
  const inputs = [label('optional', 90, 80, 150, 0), label('target', 90, 80, 150, 100)];
  const obstacles = [{ x: 0, y: 70, width: 180, height: 30 },
    { x: 0, y: 0, width: 180, height: 24 }];
  const result = layoutYardLabels(inputs, viewport, obstacles);
  checkLayout(inputs, result, viewport, obstacles);
  assert.equal(result[0].visible, false);
  assert.equal(result[1].visible, true);
});

test('occupied screen hides labels instead of violating the maximum leader distance', () => {
  const viewport = { width: 1200, height: 800 };
  const inputs = [label('target', 600, 400, 150, 100)];
  const obstacles = [{ x: 380, y: 180, width: 440, height: 440 }];
  const result = layoutYardLabels(inputs, viewport, obstacles);
  assert.equal(result[0].visible, false);
  assert.equal(result[0].anchorX, 600);
  assert.equal(result[0].anchorY, 400);
});

test('invalid projections/dimensions are hidden, and inputs remain immutable', () => {
  const viewport = Object.freeze({ width: 390, height: 844 });
  const inputs = Object.freeze([Object.freeze(label('valid', 190, 300)),
    Object.freeze(label('invalid', NaN, 300)),
    Object.freeze({ ...label('zero', 190, 300), width: 0 })]);
  const obstacles = Object.freeze([Object.freeze({ x: 8, y: 8, width: 374, height: 180 })]);
  const result = layoutYardLabels(inputs, viewport, obstacles);
  assert.deepEqual(result.map(p => p.visible), [true, false, false]);
});
