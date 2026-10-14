import { returnLabToSetup } from './lab-controls.js';

// Isolated Approach Prop policy. Physics stays in approach-prop-scene.js.
// Floor tokens that pass through returnLabToSetup are only the standing token.
// A rested pose is stored beside the line, not in the floor token.

export const STORAGE_PREFIX = 'rail-golf:approach-prop:';
export const SESSION_KEY = `${STORAGE_PREFIX}session-v1`;
export const LINES_KEY = `${STORAGE_PREFIX}lines-v1`;

export const APPROACH_PROP = Object.freeze({
  hinge: Object.freeze({ x: 22, y: 0.45, z: 138 }),
  length: 12.6,
  width: 8,
  thickness: 0.42,
  mass: 6,
  uprightLeanDeg: -14,
  restitution: 0.35,
  friction: 0.55,
  angularDamping: 1.6,
  linearDamping: 0.4,
  lip: Object.freeze({ x: 22, y: 8.12, z: 128.2, w: 8, h: 0.24, d: 0.4, restitution: 0.02, friction: 0.98 }),
});

// Referee hinge limit. ANGULAR_X min -2.2, max 0.4, plus sleep. Not a pose teleport.
export const HINGE_LIMIT = Object.freeze({ axis: 'ANGULAR_X', min: -2.2, max: 0.4 });

export const STANDING_FLOOR = 'A';
export const LATCH_LEAN_DEGREES = 30;
export const YARD_CHANGE_DEGREES = 1.5;

// Opaque URL codes. Study names live only in artifacts/e8/arm-key.json.
export const ARM_CODES = Object.freeze({
  k3v8n1p: 'address',
  q7m2c4r: 'recording',
});

export function resolveArm(code) {
  return ARM_CODES[code] ?? 'address';
}

export function isLatch(hit, lean) {
  return Boolean(hit) && Number.isFinite(lean) && lean > LATCH_LEAN_DEGREES;
}

export function yardChanged(lean, upright = APPROACH_PROP.uprightLeanDeg) {
  return Number.isFinite(lean) && Math.abs(lean - upright) > YARD_CHANGE_DEGREES;
}

export function approachMemory(shot) {
  if (!shot) return undefined;
  return {
    charge: shot.charge,
    environment: { floor: STANDING_FLOOR },
    propAtAddress: shot.propAtAddress ?? null,
    setup: shot.setup ?? null,
  };
}

export function shotRecord(input) {
  return {
    build: input.build ?? '',
    armCode: input.armCode ?? '',
    plan: input.plan ?? '',
    timberBefore: input.timberBefore ?? null,
    timberAfter: input.timberAfter ?? null,
    latched: Boolean(input.latched),
    continueOffered: Boolean(input.continueOffered),
    continueUsed: Boolean(input.continueUsed),
    treadContacts: Array.isArray(input.treadContacts) ? [...input.treadContacts] : [],
    firstGround: input.firstGround ?? null,
    setup: input.setup ?? null,
    terminal: input.terminal ?? null,
    at: input.at ?? null,
  };
}

// Calls the unedited returnLabToSetup for adjust, retry, and reset.
// Continue does not call it and does not call restoreEnvironment.
// Recall reads the pose stored beside the line.
export function runApproachRecovery(action, deps) {
  if (action === 'continue') {
    deps.cancel();
    deps.address();
    return { called: 'continue', accepted: true };
  }
  if (action === 'recall') {
    const saved = deps.memory();
    if (!saved) return { called: 'recall', accepted: false, reason: 'no-saved-line' };
    deps.cancel();
    deps.applyPose(saved.propAtAddress ?? 'standing');
    deps.loadAim(true);
    deps.exactPower(saved.charge);
    return { called: 'recall', accepted: true };
  }
  if (action === 'ghost') {
    deps.showGhost();
    return { called: 'ghost', accepted: true };
  }
  if (action === 'station') {
    deps.cancel();
    deps.loadStation(deps.stationId);
    return { called: 'station', accepted: true };
  }
  if (action === 'adjust' || action === 'retry' || action === 'reset') {
    returnLabToSetup(action, {
      interrupt: () => deps.interrupt(),
      cancel: () => deps.cancel(),
      memory: () => approachMemory(deps.memory()),
      environment: () => deps.livePose(),
      restoreEnvironment: state => {
        deps.noteRestore(state);
        if (state === 'A' || state === 'B') deps.applyPose('standing');
        else deps.applyPose(state);
      },
      load: restore => deps.loadAim(restore),
      exactPower: power => deps.exactPower(power),
    });
    return { called: action, accepted: true };
  }
  return { called: action, accepted: false, reason: 'unknown-action' };
}
