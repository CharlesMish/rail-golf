// Contiguous tolerance from sampled clears. A gap splits a run. The width is
// the inclusive span of the run that contains the representative, not the
// span from the first clear to the last clear on the axis.

function adjacent(a, b, step) {
  return Math.abs(Math.abs(b - a) - step) <= Math.abs(step) * 1e-6;
}

export function clearRuns(samples, step) {
  const ordered = [...samples].sort((a, b) => a.value - b.value);
  const runs = [];
  for (const sample of ordered) {
    if (!sample.clear) continue;
    const last = runs.at(-1);
    if (last && adjacent(last.at(-1).value, sample.value, step)) last.push(sample);
    else runs.push([sample]);
  }
  return runs.map(run => ({
    first: run[0].value,
    last: run.at(-1).value,
    width: (run.length - 1) * step,
    count: run.length,
  }));
}

export function contiguousWidth(samples, step) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('A width needs samples');
  const ordered = [...samples].sort((a, b) => a.value - b.value);
  const index = ordered.findIndex(sample => sample.representative);
  if (index < 0 || !ordered[index].clear) throw new Error('The representative sample did not clear');
  let low = index;
  let high = index;
  while (low > 0 && ordered[low - 1].clear && adjacent(ordered[low - 1].value, ordered[low].value, step)) low -= 1;
  while (high < ordered.length - 1 && ordered[high + 1].clear && adjacent(ordered[high].value, ordered[high + 1].value, step)) high += 1;
  const first = ordered[low].value;
  const last = ordered[high].value;
  const before = low > 0 ? ordered[low - 1] : null;
  const after = high < ordered.length - 1 ? ordered[high + 1] : null;
  return {
    first,
    last,
    width: (high - low) * step,
    count: high - low + 1,
    step,
    bracketLow: before && !before.clear && adjacent(before.value, first, step) ? before.value : null,
    bracketHigh: after && !after.clear && adjacent(last, after.value, step) ? after.value : null,
    censoredLow: low === 0,
    censoredHigh: high === ordered.length - 1,
  };
}

function cellKey(yaw, charge, steps, origin) {
  const iy = Math.round((yaw - origin.yaw) / steps.yaw);
  const ic = Math.round((charge - origin.charge) / steps.charge);
  return `${iy}:${ic}`;
}

export function contiguousArea(cells, steps, origin) {
  if (!cells?.length) throw new Error('An area needs cells');
  const map = new Map(cells.map(cell => [cellKey(cell.yaw, cell.charge, steps, origin), cell]));
  const start = cells.find(cell => cell.representative);
  if (!start?.clear) throw new Error('The representative cell did not clear');
  const seen = new Set();
  const stack = [start];
  const component = [];
  const offsets = [[steps.yaw, 0], [-steps.yaw, 0], [0, steps.charge], [0, -steps.charge]];
  while (stack.length) {
    const cell = stack.pop();
    const key = cellKey(cell.yaw, cell.charge, steps, origin);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!cell.clear) continue;
    component.push(cell);
    for (const [dy, dc] of offsets) {
      const next = map.get(cellKey(cell.yaw + dy, cell.charge + dc, steps, origin));
      if (next) stack.push(next);
    }
  }
  let censored = false;
  for (const cell of component) {
    for (const [dy, dc] of offsets) {
      if (!map.has(cellKey(cell.yaw + dy, cell.charge + dc, steps, origin))) censored = true;
    }
  }
  return {
    count: component.length,
    area: component.length * steps.yaw * steps.charge,
    stepYaw: steps.yaw,
    stepCharge: steps.charge,
    censored,
    yawFirst: Math.min(...component.map(cell => cell.yaw)),
    yawLast: Math.max(...component.map(cell => cell.yaw)),
    chargeFirst: Math.min(...component.map(cell => cell.charge)),
    chargeLast: Math.max(...component.map(cell => cell.charge)),
  };
}
