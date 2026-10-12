// Director-side coding rules. The play client does not import this module.
import {statusSentence, STATUS_SENTENCES} from './pallet-carry.js';

const B_PHRASES = ['raised edge', 'high edge'];
const B_WORDS = ['tilted', 'tipped', 'violet'];
const A_WORDS = ['level', 'flat', 'amber'];

function mentions(text, word) {
  return new RegExp('\\b' + word + '\\b', 'i').test(text);
}

export function mentionedFaces(text) {
  const faces = new Set();
  const lower = String(text ?? '').toLowerCase();
  if (/\bB\b/i.test(text ?? '')) faces.add('B');
  if (/\bA\b/.test(text ?? '')) faces.add('A');
  for (const phrase of B_PHRASES) if (lower.includes(phrase)) faces.add('B');
  for (const word of B_WORDS) if (mentions(text, word)) faces.add('B');
  for (const word of A_WORDS) if (mentions(text, word)) faces.add('A');
  return [...faces];
}

function negatedFaces(text) {
  const faces = new Set();
  const pattern = /(?:rather than|instead of|\bnot\b)\s+([^.]{0,48})/gi;
  for (const match of String(text ?? '').matchAll(pattern)) {
    const window = match[1].split(/,|it is|it's|it’s|\bnow\b|\bstill\b|\bcurrently\b/i)[0];
    const found = mentionedFaces(window);
    if (found.length) faces.add(found[0]);
  }
  return faces;
}

function currentFaces(text) {
  const faces = new Set();
  const pattern = /(?:it is|it's|it’s|now|still|currently)[^.]{0,48}/gi;
  for (const match of String(text ?? '').matchAll(pattern)) {
    for (const face of mentionedFaces(match[0])) faces.add(face);
  }
  return faces;
}

// One named face, or the face the plan treats as the face at the address.
// Both faces with no current face is unmappable. Unmappable is not a false reference.
export function namedFace(text) {
  const faces = mentionedFaces(text);
  if (faces.length === 0) return null;
  if (faces.length === 1) return faces[0];
  const negated = negatedFaces(text);
  const current = currentFaces(text);
  const kept = faces.filter(face => !negated.has(face));
  const marked = kept.filter(face => current.size === 0 || current.has(face));
  if (current.size === 1) return [...current][0];
  if (marked.length === 1) return marked[0];
  return null;
}

export function classifyNamedState(text, start, end) {
  const letter = namedFace(text);
  if (letter == null) return {mark: 'unmappable', letter: null};
  if (letter === end) return {mark: 'end-state', letter};
  if (letter === start && letter !== end) return {mark: 'start-state', letter};
  return {mark: 'unmappable', letter};
}

export function falseStateReference(letter, address) {
  return letter != null && letter !== address;
}

function tokens(text) {
  return String(text ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function nearVerbatim(plan, source) {
  const left = tokens(plan);
  const right = tokens(source);
  if (right.length < 5 || left.length === 0) return false;
  let i = 0;
  let edits = 0;
  for (const token of left) {
    if (right[i] === token) i += 1;
    else edits += 1;
  }
  edits += Math.max(0, right.length - i);
  return i >= 5 && edits <= Math.ceil(right.length / 5);
}

export function redactPlan(text, {sequence = '', ending = ''} = {}) {
  let next = String(text ?? '');
  for (const sentence of STATUS_SENTENCES) {
    next = next.replace(new RegExp(sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  if (sequence && nearVerbatim(next, sequence)) next = '';
  if (ending && nearVerbatim(next, ending)) next = '';
  const trimmed = next.replace(/\s+/g, ' ').trim();
  return trimmed;
}

export const CODER_FACE_LINE = 'A is level and amber. B is tilted and violet.';

export function coderPacket({plan, shotNumber, station, start, end, sequence, ending}) {
  return {
    plan: redactPlan(plan, {sequence, ending}),
    shotNumber,
    station,
    start,
    end,
  };
}

const LEAKS = [/h7c2n5/i, /m4p8k1/i, /pallet-carry/i, /\btreatment\b/i, /https?:\/\//i, /\b[a-f0-9]{7,40}\b/i];

export function packetLeaks(packet) {
  const blob = JSON.stringify(packet);
  return LEAKS.filter(pattern => pattern.test(blob)).map(pattern => String(pattern));
}

export function screenCall(input) {
  const controlShare = input.control.primaryPlans ? input.control.inhabit / input.control.primaryPlans : 0;
  const treatmentShare = input.treatment.primaryPlans ? input.treatment.inhabit / input.treatment.primaryPlans : 0;
  const delivered = arm => arm.validSessions >= 3 && arm.primaryPlans >= 8;
  const bothDelivered = delivered(input.control) && delivered(input.treatment);
  const gapPlans = input.treatment.inhabit - input.control.inhabit;
  const gapPoints = treatmentShare - controlShare;
  const above = (input.treatment.sessionShares ?? []).filter(share => share > controlShare).length;
  const four = input.treatment.validSessions >= 4;
  const numericGap = gapPoints >= 0.10 - 1e-12 && gapPlans >= 2 && above >= 3;
  const criterion1 = four && bothDelivered && numericGap;
  const floor = bothDelivered && controlShare <= 0.15 + 1e-12 && treatmentShare <= 0.15 + 1e-12;
  const falseGap = (input.treatment.falseShare ?? 0) - (input.control.falseShare ?? 0);
  const harm = falseGap > 0.05 + 1e-12 || (input.treatment.ratsWithFalseReference ?? 0) >= 2;
  let inconclusive = null;
  if (!bothDelivered) inconclusive = 'under-delivered';
  else if (input.kappa != null && input.kappa < 0.8) inconclusive = 'kappa';
  else if (controlShare >= 0.70 - 1e-12) inconclusive = 'ceiling';
  else if (Math.abs((input.treatment.engageRate ?? 0) - (input.control.engageRate ?? 0)) > 0.20 + 1e-12) inconclusive = 'engage-gap';
  else if ((input.control.retryLeaveRate ?? 0) - (input.treatment.retryLeaveRate ?? 0) > 0.20 + 1e-12) inconclusive = 'retry-after-change';
  else if (input.treatment.validSessions === 3 && numericGap) inconclusive = 'rat-rule';
  let call = 'no-pass';
  if (harm) call = 'harm';
  else if (inconclusive === 'under-delivered') call = 'under-delivered';
  else if (inconclusive) call = 'inconclusive';
  else if (criterion1) call = 'pass';
  else if (floor) call = 'floor';
  return {
    call,
    criterion1: Boolean(criterion1) && !harm && !inconclusive,
    criterion1Numbers: Boolean(criterion1),
    floor,
    harm,
    bothDelivered,
    controlShare,
    treatmentShare,
    gapPlans,
    gapPoints,
    sessionsAboveControl: above,
    passNeedsFourSessions: true,
  };
}
