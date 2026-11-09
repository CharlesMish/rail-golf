import softLandingPreset from '../worlds/foundry/soft-landing/preset.json' with { type: 'json' };
import softLandingManifest from '../worlds/foundry/soft-landing/manifest.json' with { type: 'json' };
import theCarryPreset from '../worlds/foundry/the-carry/preset.json' with { type: 'json' };
import theCarryManifest from '../worlds/foundry/the-carry/manifest.json' with { type: 'json' };
import {
  newWorldcraftId, validateWorld, worldcraftIdentity,
} from './worldcraft-model.js';
import { adaptRangePreset, validateRangePreset } from './worldcraft-range.js';

// Foundry files are data. A manifest names a physical question and an optional
// challenge. The preset remains a range preset. Nothing here retunes physics,
// and nothing here fetches a remote asset or runs a script.
export const FOUNDRY_MANIFEST_FORMAT = 'rail-golf-worldcraft-foundry-manifest';
export const FOUNDRY_MANIFEST_VERSION = 1;
export const FOUNDRY_KINDS = Object.freeze(['shot-study', 'workshop', 'authored-world']);
export const FOUNDRY_LIMITATION_CATEGORIES = Object.freeze(['physical-geometry', 'authoring-tooling', 'presentation']);
const SOURCE_BUILD = /^[a-f0-9]{7,40}$/;
const MODULE_PATH = /^[a-z0-9][a-z0-9./_-]{0,80}$/;
const BANNED_KEYS = new Set(['script', 'scripts', 'src', 'url', 'href', 'asset', 'assetUrl', 'remote', 'eval']);

const textBytes = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;
const own = (value, key) => Object.hasOwn(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function fail(message) { throw Error(message); }
function freeze(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
function exact(value, keys, label, optional = []) {
  if (!plain(value)) fail(`${label}: unsupported or missing fields`);
  const names = Object.keys(value), allowed = new Set([...keys, ...optional]);
  if (!keys.every(key => own(value, key)) || names.some(key => !allowed.has(key))) fail(`${label}: unsupported or missing fields`);
  if (names.some(key => BANNED_KEYS.has(key))) fail(`${label}: remote or script fields are not allowed`);
}

function prose(value, label, max) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label}: use plain text`);
  if (/[a-z]+:\/\//i.test(value) || value.includes('//')) fail(`${label}: remote addresses are not allowed`);
  return value;
}

function walkBanned(value, label) {
  if (Array.isArray(value)) { value.forEach((item, index) => walkBanned(item, `${label} ${index + 1}`)); return; }
  if (!plain(value)) {
    if (typeof value === 'string' && (/[a-z]+:\/\//i.test(value) || value.includes('//'))) fail(`${label}: remote addresses are not allowed`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (BANNED_KEYS.has(key)) fail(`${label}: remote or script fields are not allowed`);
    walkBanned(value[key], `${label}.${key}`);
  }
}

function geometryEditable(preset) {
  const fixed = new Set(preset.rules.fixed);
  if (preset.objects.some(object => !fixed.has(object.id))) return true;
  return Object.values(preset.rules.allowance).some(count => count > 0);
}

function copyName(name) {
  const prefixed = name.startsWith('Copy of ') ? name : `Copy of ${name}`;
  const trimmed = prefixed.length <= 64 ? prefixed : prefixed.slice(0, 64).trimEnd();
  if (!trimmed) fail('Remix name is empty');
  return trimmed;
}

export function validateFoundryManifest(value, preset) {
  if (textBytes(value) > 16384) fail('Foundry manifest must be at most 16 KiB');
  walkBanned(value, 'Manifest');
  exact(value, [
    'format', 'version', 'id', 'name', 'kind', 'invitation', 'physicalQuestion', 'editable',
    'challenge', 'sourceBuild', 'seed', 'testedShots', 'nearbySensitivity', 'validationEvidence', 'limitations', 'customCode',
  ], 'Foundry manifest');
  if (value.format !== FOUNDRY_MANIFEST_FORMAT || value.version !== FOUNDRY_MANIFEST_VERSION) fail('Unsupported foundry manifest format or version');
  const document = validateRangePreset(preset);
  if (value.id !== document.id || value.name !== document.name) fail('Manifest id and name must match the preset');
  if (!FOUNDRY_KINDS.includes(value.kind)) fail('Foundry kind must be shot-study, workshop, or authored-world');
  exact(value.editable, ['launcher', 'geometry'], 'Editable controls');
  if (typeof value.editable.launcher !== 'boolean' || typeof value.editable.geometry !== 'boolean') fail('Editable controls must be booleans');
  if (value.editable.launcher !== (document.rules.launcher.fixed === false)) fail('Launcher edit flag does not match the preset');
  if (value.editable.geometry !== geometryEditable(document)) fail('Geometry edit flag does not match the preset');
  let challenge = null;
  if (value.challenge !== null) {
    exact(value.challenge, ['id', 'label'], 'Challenge');
    const id = value.challenge.id;
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) fail('Challenge id: invalid identifier');
    if (id === document.id) fail('Challenge id must differ from the world id');
    if (JSON.stringify(document).includes(id)) fail('Challenge id must not be stored in the preset');
    challenge = { id, label: prose(value.challenge.label, 'Challenge label', 120) };
  }
  if (typeof value.sourceBuild !== 'string' || !SOURCE_BUILD.test(value.sourceBuild)) fail('Source build must be a commit SHA');
  if (!Number.isInteger(value.seed)) fail('Foundry seed must be an integer');
  if (!Array.isArray(value.testedShots) || value.testedShots.length < 1 || value.testedShots.length > 8) fail('A foundry manifest needs 1–8 tested shots');
  const seen = new Set();
  const testedShots = value.testedShots.map((shot, index) => {
    const label = `Tested shot ${index + 1}`;
    exact(shot, ['id', 'setup', 'launchPhase', 'terminal', 'outcome'], label);
    if (typeof shot.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(shot.id) || seen.has(shot.id)) fail(`${label}: invalid id`);
    seen.add(shot.id);
    exact(shot.setup, ['railIndex', 'originX', 'yaw', 'elevation', 'charge'], `${label} setup`);
    if (shot.launchPhase !== null && typeof shot.launchPhase !== 'number') fail(`${label}: launch phase must be a number or null`);
    exact(shot.terminal, ['reason', 'elapsed', 'position'], `${label} terminal`);
    if (typeof shot.terminal.reason !== 'string' || !shot.terminal.reason) fail(`${label}: terminal reason is missing`);
    if (typeof shot.terminal.elapsed !== 'number' || !Number.isFinite(shot.terminal.elapsed)) fail(`${label}: terminal elapsed is missing`);
    if (!Array.isArray(shot.terminal.position) || shot.terminal.position.length !== 3 || shot.terminal.position.some(item => typeof item !== 'number' || !Number.isFinite(item))) fail(`${label}: terminal position is missing`);
    exact(shot.outcome, ['kind', 'status'], `${label} outcome`);
    if (typeof shot.outcome.kind !== 'string' || typeof shot.outcome.status !== 'string') fail(`${label}: outcome is incomplete`);
    return {
      id: shot.id,
      setup: { railIndex: shot.setup.railIndex, originX: shot.setup.originX, yaw: shot.setup.yaw, elevation: shot.setup.elevation, charge: shot.setup.charge },
      launchPhase: shot.launchPhase,
      terminal: { reason: shot.terminal.reason, elapsed: shot.terminal.elapsed, position: [...shot.terminal.position] },
      outcome: { kind: shot.outcome.kind, status: shot.outcome.status },
    };
  });
  if (!Array.isArray(value.limitations) || value.limitations.length < 1 || value.limitations.length > 6) fail('A foundry manifest needs 1–6 limitations');
  const limitations = value.limitations.map((entry, index) => {
    const label = `Limitation ${index + 1}`;
    exact(entry, ['category', 'concept', 'missing', 'extension'], label);
    if (!FOUNDRY_LIMITATION_CATEGORIES.includes(entry.category)) fail(`${label}: category must be physical-geometry, authoring-tooling, or presentation`);
    return {
      category: entry.category,
      concept: prose(entry.concept, `${label} concept`, 240),
      missing: prose(entry.missing, `${label} missing capability`, 400),
      extension: prose(entry.extension, `${label} extension`, 400),
    };
  });
  let customCode = null;
  if (value.customCode !== null) {
    exact(value.customCode, ['module', 'reason'], 'Custom code');
    if (typeof value.customCode.module !== 'string' || !MODULE_PATH.test(value.customCode.module) || value.customCode.module.includes('..')) fail('Custom code module must be a relative path');
    customCode = { module: value.customCode.module, reason: prose(value.customCode.reason, 'Custom code reason', 240) };
  }
  return freeze({
    format: FOUNDRY_MANIFEST_FORMAT,
    version: FOUNDRY_MANIFEST_VERSION,
    id: document.id,
    name: document.name,
    kind: value.kind,
    invitation: prose(value.invitation, 'Invitation', 280),
    physicalQuestion: prose(value.physicalQuestion, 'Physical question', 240),
    editable: { launcher: value.editable.launcher, geometry: value.editable.geometry },
    challenge,
    sourceBuild: value.sourceBuild,
    seed: value.seed,
    testedShots,
    nearbySensitivity: prose(value.nearbySensitivity, 'Nearby sensitivity', 600),
    validationEvidence: prose(value.validationEvidence, 'Validation evidence', 600),
    limitations,
    customCode,
  });
}

export function loadFoundryPair(preset, manifest) {
  const document = validateRangePreset(preset);
  const card = validateFoundryManifest(manifest, document);
  const world = adaptRangePreset(document).world;
  return freeze({ preset: document, manifest: card, world, worldIdentity: worldcraftIdentity(world) });
}

function publicCard(pair) {
  return {
    id: pair.manifest.id,
    name: pair.manifest.name,
    kind: pair.manifest.kind,
    invitation: pair.manifest.invitation,
    editable: { launcher: pair.manifest.editable.launcher, geometry: pair.manifest.editable.geometry },
    hasChallenge: pair.manifest.challenge !== null,
    challengeId: pair.manifest.challenge?.id ?? null,
  };
}

// The gallery reads this list. The template directory is a file pair only.
const REGISTERED = Object.freeze([
  Object.freeze({ id: 'soft-landing', preset: softLandingPreset, manifest: softLandingManifest }),
  Object.freeze({ id: 'the-carry', preset: theCarryPreset, manifest: theCarryManifest }),
]);

function pairById(id) {
  const entry = REGISTERED.find(item => item.id === id);
  if (!entry) fail('Unknown foundry world');
  const pair = loadFoundryPair(entry.preset, entry.manifest);
  if (pair.manifest.customCode !== null) fail('A gallery world cannot depend on custom code');
  return pair;
}

export function listFoundryWorlds() {
  return freeze(REGISTERED.map(entry => publicCard(pairById(entry.id))));
}

export function foundryPreset(id) {
  return pairById(id).preset;
}

export function foundryRecord(id) {
  return pairById(id);
}

/** A remix is a new world document. It does not reuse the authored id or the challenge id. */
export function foundryRemixWorld(authored, options = {}) {
  const world = validateWorld(authored);
  const id = options.id ?? newWorldcraftId('copy');
  if (id === world.id) fail('A remix uses a new world id');
  if (options.challengeId && id === options.challengeId) fail('A remix id must not reuse the challenge id');
  const name = options.name ?? copyName(world.name);
  return validateWorld({ ...world, id, name });
}

export function foundryCopyName(name) {
  return copyName(name);
}
