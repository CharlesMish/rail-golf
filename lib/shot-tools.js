import { RAIL_RULES, chargeFromHold, clamp, normalizeHoleRecord } from './rail-golf-v02.js';

export function launchCharge(mode, selected, milliseconds) {
  return mode === 'set' ? clamp(Number.isFinite(selected) ? selected : 0, 0, 1) : chargeFromHold(milliseconds);
}

// Interrupted flights count as attempts, but never manufacture a ruling or badge.
export function interruptedRecord(previous) {
  const record = normalizeHoleRecord(previous) ?? {
    attempts: 0, bestOutcome: null, hasAce: false, hasBreach: false, perfect: false, cleared: false,
  };
  return { ...record, attempts: record.attempts + 1 };
}

export function rememberAttempt(history, attempt) {
  return [attempt, ...history.filter(item => item.projectileId !== attempt.projectileId)].slice(0, 3);
}

// Same centre-distance allowance used by isAceLanding; positive means outside.
export function landingEdgeGap(hole, point) {
  return Math.hypot(point.x - hole.target.x, point.z - hole.target.z) - hole.target.radius - RAIL_RULES.projectileRadius;
}

export function landingReceipt(hole, point) {
  const gap = landingEdgeGap(hole, point);
  const distance = Math.abs(gap) < .05 ? 'Less than 0.1' : Math.abs(gap).toFixed(1);
  return `${distance} m ${gap > 0 ? 'outside' : 'inside'} the landing limit at first kiss.`;
}
