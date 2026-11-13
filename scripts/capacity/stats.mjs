/** Compact numeric summaries. Differences inside run-to-run spread are not effects. */

export function percentile(values, p) {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

export function summarize(values) {
  const finite = (values ?? []).filter(value => Number.isFinite(value));
  if (!finite.length) return null;
  const sorted = [...finite].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    n: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
    mean,
  };
}

export function round(value, digits = 4) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function roundSummary(summary, digits = 4) {
  if (!summary) return null;
  return Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, key === 'n' ? value : round(value, digits)]));
}

/** Relative run-to-run range of a metric, as a fraction of the median. */
export function runSpread(medians) {
  const finite = (medians ?? []).filter(value => Number.isFinite(value));
  if (finite.length < 2) return { n: finite.length, min: finite[0] ?? null, median: finite[0] ?? null, max: finite[0] ?? null, relative: 0 };
  const sorted = [...finite].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const relative = median === 0 ? (sorted[sorted.length - 1] === 0 ? 0 : Infinity) : (sorted[sorted.length - 1] - sorted[0]) / Math.abs(median);
  return { n: sorted.length, min: sorted[0], median, max: sorted[sorted.length - 1], relative };
}

/**
 * A later column against the original. `noise` is the larger relative run spread.
 * Inside that band the delta is not a measured difference.
 */
export function compare(original, next, noise) {
  if (!Number.isFinite(original) || !Number.isFinite(next)) return { absolute: null, percent: null, verdict: 'unmeasured' };
  const absolute = next - original;
  const percent = original === 0 ? null : (absolute / Math.abs(original)) * 100;
  const band = Number.isFinite(noise) ? noise : 0;
  const relative = original === 0 ? (absolute === 0 ? 0 : Infinity) : Math.abs(absolute) / Math.abs(original);
  const verdict = relative <= band ? 'no measurable difference' : absolute > 0 ? 'higher' : 'lower';
  return { absolute: round(absolute, 4), percent: percent === null ? null : round(percent, 2), verdict };
}

/** Ordinary least squares slope of y against cycle index. Units are y per cycle. */
export function slope(values) {
  const ys = (values ?? []).filter(value => Number.isFinite(value));
  const n = ys.length;
  if (n < 3) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  ys.forEach((y, x) => { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; });
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
