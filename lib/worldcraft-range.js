import {
  WORLDCRAFT_FORMAT, WORLDCRAFT_LIMITS, WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_PHYSICS_CONTRACT,
  validateWorld, validateWorldcraftSetup, validateWorldcraftShot, worldcraftIdentity, worldcraftFixedSetup,
  worldcraftGoalResult, worldcraftPinResult, worldcraftTargetResult, worldcraftBellTarget, worldcraftLaunchPhase,
  WORLDCRAFT_BELL, captureWorldSnapshot, packWorldcraftLine,
} from './worldcraft-model.js';

// Experimental presets sit beside v1 worlds. A preset is versioned data that
// already contains its launcher, fixed pieces, and goal. The adapter compiles
// that document into a v1 world the incumbent runtime can simulate. It does
// not retune gravity, mass, radius, charge mapping, or contact coefficients.
export const RANGE_PRESET_FORMAT = 'rail-golf-worldcraft-range-preset';
export const RANGE_PRESET_VERSION = 1;
export const RANGE_SHOT_FORMAT = 'rail-golf-worldcraft-range-shot';
const GOAL_KINDS = ['none', 'first-ground-zone', 'target-contact'];

const textBytes = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;
const own = (value, key) => Object.hasOwn(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function fail(message) { throw Error(message); }
function freeze(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
function exact(value, keys, label, optional = []) {
  if (!plain(value)) fail(`${label}: unsupported or missing fields`);
  const names = Object.keys(value), allowed = new Set([...keys, ...optional]);
  if (!keys.every(key => own(value, key)) || names.some(key => !allowed.has(key))) fail(`${label}: unsupported or missing fields`);
}

function compilePreset(preset) {
  const goal = preset.rules.goal;
  const rules = {
    pin: goal.kind === 'first-ground-zone' ? { x: goal.x, z: goal.z, r: goal.r } : null,
    locked: preset.rules.fixed,
    allowance: preset.rules.allowance,
    rail: { yaw: preset.rules.launcher.yaw, elevation: preset.rules.launcher.elevation, charge: preset.rules.launcher.charge },
    goal,
  };
  if (goal.kind === 'target-contact' && goal.motion) rules.target = { id: goal.id, yaw: goal.yaw, motion: goal.motion };
  else if (goal.kind === 'target-contact') rules.target = { id: goal.id, x: goal.x, z: goal.z, yaw: goal.yaw };
  return validateWorld({
    format: WORLDCRAFT_FORMAT, version: 1, id: preset.id, name: preset.name,
    environment: preset.environment, objects: preset.objects, launcher: { x: preset.launcher.x }, rules,
  });
}

function canonicalPreset(world) {
  const rail = world.rules?.rail;
  const goal = world.rules?.goal;
  if (!rail || !goal) fail('A range preset needs a fixed launcher and an explicit goal');
  return {
    format: RANGE_PRESET_FORMAT,
    version: RANGE_PRESET_VERSION,
    id: world.id,
    name: world.name,
    environment: world.environment,
    launcher: { x: world.launcher.x },
    objects: world.objects,
    rules: {
      launcher: { fixed: true, yaw: rail.yaw, elevation: rail.elevation, charge: rail.charge },
      fixed: world.rules.locked,
      allowance: world.rules.allowance,
      goal,
    },
  };
}

export function validateRangePreset(value) {
  exact(value, ['format', 'version', 'id', 'name', 'environment', 'launcher', 'objects', 'rules'], 'Preset');
  if (value.format !== RANGE_PRESET_FORMAT || value.version !== RANGE_PRESET_VERSION) fail('Unsupported range preset format or version');
  exact(value.rules, ['launcher', 'fixed', 'allowance', 'goal'], 'Preset rules');
  exact(value.rules.launcher, ['fixed', 'yaw', 'elevation', 'charge'], 'Preset launcher');
  if (value.rules.launcher.fixed !== true) fail('This range preset requires a fixed launcher');
  if (!plain(value.rules.goal) || !GOAL_KINDS.includes(value.rules.goal.kind)) fail('Goal kind must be none, first-ground-zone, or target-contact');
  if (!Array.isArray(value.rules.fixed)) fail('Preset fixed pieces must be a list of ids');
  const world = compilePreset(value);
  if (!worldcraftFixedSetup(world)) fail('This range preset requires a fixed launcher');
  return freeze(canonicalPreset(world));
}

export function adaptRangePreset(preset) {
  const document = validateRangePreset(preset);
  return { preset: document, world: compilePreset(document) };
}

/** Keep the preset's rules. Piece edits update the preset document the export writes. */
export function projectRangePreset(preset, world) {
  const base = validateRangePreset(preset);
  const current = validateWorld(world);
  const next = validateRangePreset({ ...base, name: current.name, launcher: { x: current.launcher.x }, objects: current.objects });
  if (worldcraftIdentity(compilePreset(next)) !== worldcraftIdentity(current)) fail('Edited world left the preset rules');
  return next;
}

export function exportRangePreset(preset) {
  return JSON.stringify(validateRangePreset(preset), null, 2);
}

export function parseRangePreset(text) {
  if (typeof text !== 'string' || textBytes(text) > WORLDCRAFT_LIMITS.importBytes) fail('Preset JSON must be at most 32 KiB');
  let value; try { value = JSON.parse(text); } catch { fail('Invalid JSON. The current preset has not changed.'); }
  return validateRangePreset(value);
}

/** v1 worlds stay on their own parser. A preset import never rewrites them. */
export function importRangeDocument(text) {
  if (typeof text !== 'string' || textBytes(text) > WORLDCRAFT_LIMITS.importBytes) fail('World JSON must be at most 32 KiB');
  let value; try { value = JSON.parse(text); } catch { fail('Invalid JSON. The current world has not changed.'); }
  if (!plain(value) || typeof value.format !== 'string') fail('Unsupported world or preset format');
  if (value.format === RANGE_PRESET_FORMAT) return { kind: 'preset', preset: validateRangePreset(value) };
  if (value.format === WORLDCRAFT_FORMAT) return { kind: 'world', world: validateWorld(value) };
  fail('Unsupported world or preset format');
}

export function createOpenWorkshopPreset() {
  return validateRangePreset({
    format: RANGE_PRESET_FORMAT,
    version: RANGE_PRESET_VERSION,
    id: 'open-workshop',
    name: 'Open Workshop',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects: [
      { id: 'ramp-yours', kind: 'ramp', x: 0, z: 42, yaw: 0, voice: { material: 'metal', degree: 1 } },
      { id: 'bank-yours', kind: 'bank', x: 14, z: 28, yaw: 0, voice: { material: 'timber', degree: 0 } },
      { id: 'plate-yours', kind: 'plate', x: 0, z: 68, yaw: 0, voice: { material: 'metal', degree: 2 } },
    ],
    rules: {
      launcher: { fixed: true, yaw: 0, elevation: 18, charge: 0.55 },
      fixed: [],
      allowance: { ramp: 1, bank: 1, plate: 1 },
      goal: { kind: 'none' },
    },
  });
}

const BELL_COLLIDER = {
  shape: 'lathe-convex-hull',
  height: WORLDCRAFT_BELL.height,
  skirtRadius: WORLDCRAFT_BELL.skirtRadius,
  centerY: WORLDCRAFT_BELL.centerY,
  friction: WORLDCRAFT_BELL.friction,
  restitution: WORLDCRAFT_BELL.restitution,
};

/** Fixed pieces, fixed rail, and a bell shuttling a 4 m rail. Release phase is not part of this document. */
export function createTravellingBellPreset() {
  return validateRangePreset({
    format: RANGE_PRESET_FORMAT,
    version: RANGE_PRESET_VERSION,
    id: 'travelling-bell',
    name: 'Travelling Bell',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects: [
      { id: 'ramp-yours', kind: 'ramp', x: -8, z: 40, yaw: 0 },
      { id: 'bank-yours', kind: 'bank', x: 0, z: 16, yaw: 80 },
      { id: 'shield', kind: 'block', x: -10, z: 52, yaw: 0 },
    ],
    rules: {
      launcher: { fixed: true, yaw: 0, elevation: 18, charge: 0.55 },
      fixed: ['bank-yours', 'ramp-yours', 'shield'],
      allowance: {},
      goal: {
        kind: 'target-contact',
        id: 'bell',
        yaw: 0,
        motion: {
          kind: 'segment-shuttle',
          speed: 1,
          phaseReference: 'endpoint-0',
          endpoints: [{ x: -28, z: 58 }, { x: -24, z: 58 }],
          collider: BELL_COLLIDER,
          hit: 'any-contact-before-ledger-close',
        },
      },
    },
  });
}

const REGISTRY = { 'open-workshop': createOpenWorkshopPreset, 'travelling-bell': createTravellingBellPreset };

export function listRangePresets() {
  return Object.keys(REGISTRY).map(id => {
    const preset = REGISTRY[id]();
    return { id, name: preset.name, goal: preset.rules.goal.kind };
  });
}

export function rangePreset(id) {
  const create = REGISTRY[id];
  if (!create) fail('Unknown experimental preset');
  return create();
}

export function recordedTrail(record) {
  if (!record || typeof record.worldIdentity !== 'string' || !Array.isArray(record.points)) fail('A trail needs its recorded samples');
  return {
    label: typeof record.label === 'string' && record.label ? record.label : 'Recorded line',
    worldIdentity: record.worldIdentity,
    setup: validateWorldcraftSetup(record.setup),
    points: record.points.map(point => {
      const copy = { x: point.x, y: point.y, z: point.z };
      if (point.t !== undefined) copy.t = point.t;
      return copy;
    }),
  };
}

/** Previous samples are copied from the recorded trail. Nothing here resimulates them. */
export function latchRecordedComparison(previous, next) {
  return { comparison: previous ? recordedTrail(previous) : null, history: recordedTrail(next) };
}

export function inferOutcome(world, input) {
  const reason = input?.reason ?? input?.terminal?.reason;
  const position = input?.position ?? input?.terminal?.position;
  const contacts = input?.contacts;
  const goal = worldcraftGoalResult(world, { reason, position, contacts });
  if (goal) return goal;
  if (world.rules?.target) {
    const target = worldcraftTargetResult(world, { reason, contacts });
    return { kind: 'target-contact', status: target.status, body: target.body, scored: target.status === 'hit' };
  }
  if (world.rules?.pin) {
    const pin = worldcraftPinResult(world, { reason, position });
    return { kind: 'first-ground-zone', status: pin.status, distance: pin.distance, scored: pin.status === 'clear' };
  }
  return { kind: 'none', status: 'none', scored: false };
}

export function rangeBindingText(worldIdentity, setup, launchPhase = undefined) {
  const body = { worldIdentity, setup };
  if (typeof launchPhase === 'number') body.launchPhase = launchPhase;
  return JSON.stringify(body);
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function bindRangeShot(input) {
  const world = validateWorld(input.world);
  const setup = validateWorldcraftShot(world, input.setup);
  const build = input.build ?? input.worldSnapshot?.build;
  const snapshot = captureWorldSnapshot(world, build);
  if (input.worldSnapshot && input.worldSnapshot.worldIdentity !== snapshot.worldIdentity) fail('Shot world does not match the supplied snapshot');
  const preset = input.preset ? validateRangePreset(input.preset) : null;
  if (preset && worldcraftIdentity(compilePreset(preset)) !== snapshot.worldIdentity) fail('Preset does not match the shot world');
  const line = packWorldcraftLine({
    id: input.id ?? 'range-shot',
    createdAt: input.createdAt ?? '2026-10-24T00:00:00.000Z',
    worldSnapshot: snapshot,
    setup,
    launch: input.launch,
    points: input.points,
    events: input.events ?? [],
    contacts: input.contacts ?? [],
    terminal: input.terminal,
  });
  const shuttle = worldcraftBellTarget(world);
  let launchPhase = null;
  if (shuttle) {
    if (typeof input.launchPhase !== 'number') fail('A travelling bell shot needs its launch phase');
    launchPhase = worldcraftLaunchPhase(world, input.launchPhase);
  } else if (input.launchPhase !== undefined && input.launchPhase !== null) fail('Launch phase requires a travelling bell');
  const bindingText = rangeBindingText(snapshot.worldIdentity, line.setup, launchPhase);
  const presetText = preset ? exportRangePreset(preset) : null;
  const [bindingHash, presetHash] = await Promise.all([
    sha256Hex(bindingText),
    presetText ? sha256Hex(presetText) : Promise.resolve(null),
  ]);
  return freeze({
    format: RANGE_SHOT_FORMAT,
    version: 1,
    presetId: preset?.id ?? null,
    presetHash,
    worldSnapshot: line.worldSnapshot,
    setup: line.setup,
    launchPhase,
    bindingHash,
    contacts: line.contacts,
    terminal: line.terminal,
    outcome: inferOutcome(world, { reason: line.terminal.reason, position: line.terminal.position, contacts: line.contacts }),
    points: line.points,
  });
}

function validateRangeShot(value) {
  exact(value, ['format', 'version', 'presetId', 'presetHash', 'worldSnapshot', 'setup', 'launchPhase', 'bindingHash', 'contacts', 'terminal', 'outcome', 'points'], 'Range shot');
  if (value.format !== RANGE_SHOT_FORMAT || value.version !== 1) fail('Unsupported range shot format or version');
  if (!(value.presetId === null || typeof value.presetId === 'string')) fail('Range shot preset id is invalid');
  if (!(value.presetHash === null || (typeof value.presetHash === 'string' && /^[a-f0-9]{64}$/.test(value.presetHash)))) fail('Range shot preset hash is invalid');
  if (typeof value.bindingHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.bindingHash)) fail('Range shot binding hash is invalid');
  exact(value.worldSnapshot, ['version', 'world', 'worldIdentity', 'catalog', 'physics', 'build'], 'World snapshot');
  const world = validateWorld(value.worldSnapshot.world);
  if (value.worldSnapshot.worldIdentity !== worldcraftIdentity(world)) fail('Recorded world identity does not match its snapshot');
  if (value.worldSnapshot.version !== 1 || value.worldSnapshot.catalog !== WORLDCRAFT_CATALOG_VERSION || value.worldSnapshot.physics !== WORLDCRAFT_PHYSICS_CONTRACT) fail('Unsupported recorded world contract');
  const setup = validateWorldcraftShot(world, value.setup);
  const shuttle = worldcraftBellTarget(world);
  let launchPhase = null;
  if (shuttle) {
    if (typeof value.launchPhase !== 'number') fail('A travelling bell shot needs its launch phase');
    launchPhase = worldcraftLaunchPhase(world, value.launchPhase);
  } else if (value.launchPhase !== null) fail('Launch phase requires a travelling bell');
  if (!Array.isArray(value.contacts) || !Array.isArray(value.points)) fail('Range shot is missing its recorded line');
  const outcome = inferOutcome(world, { reason: value.terminal?.reason, position: value.terminal?.position, contacts: value.contacts });
  if (JSON.stringify(outcome) !== JSON.stringify(value.outcome)) fail('Recorded outcome does not match the ledger');
  return freeze({
    format: RANGE_SHOT_FORMAT,
    version: 1,
    presetId: value.presetId,
    presetHash: value.presetHash,
    worldSnapshot: value.worldSnapshot,
    setup,
    launchPhase,
    bindingHash: value.bindingHash,
    contacts: value.contacts,
    terminal: value.terminal,
    outcome,
    points: value.points,
  });
}

export function exportRangeShot(shot) {
  return JSON.stringify(validateRangeShot(shot), null, 2);
}

export function parseRangeShot(text) {
  if (typeof text !== 'string' || textBytes(text) > WORLDCRAFT_LIMITS.lineBytes) fail('Range shot JSON must be at most 256 KiB');
  let value; try { value = JSON.parse(text); } catch { fail('Invalid JSON. The current shot has not changed.'); }
  return validateRangeShot(value);
}

export const RANGE_CATALOG = WORLDCRAFT_CATALOG_VERSION;
export const RANGE_PHYSICS = WORLDCRAFT_PHYSICS_CONTRACT;
