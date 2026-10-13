// Presentation only. Read authored coordinates/tags without changing their
// physical, recognition, progression, or persistence authority.
import { CASCADE_STEPS } from './lumber-cascade.js';
import { segmentSphereAabbIntersection } from './rail-golf-v02.js';

const FEATURE_NAMES = Object.freeze({
  bank: 'BANK HERE',
  'bank-a': 'BANK A',
  'bank-b': 'BANK B',
  boost: 'SKIP PAD',
  breach: 'BREAK THROUGH',
  'step-a': 'TREAD 1',
  'step-b': 'TREAD 2',
  'step-c': 'TREAD 3',
});

const finitePoint = point => point != null && Number.isFinite(point.x) && Number.isFinite(point.z);

/** Ground-plan distance from the station centre, not flight length or world Z.
 * Callers must supply the station; an absent/invalid origin has no honest value.
 */
export function stationTargetDistance(target, station) {
  if (!finitePoint(target) || !finitePoint(station)) return null;
  const distance = Math.hypot(target.x - station.x, target.z - station.z);
  return Number.isFinite(distance) ? distance : null;
}

export function stationTargetDistanceLabel(target, station) {
  const distance = stationTargetDistance(target, station);
  return distance === null ? null : `${Math.round(distance)} m from tee`;
}

/** A tread callout must not identify the nearer stack that hides its world pin.
 * This is a zero-radius sightline to the same anchor used by the UI, not a
 * projectile sweep or a ruling. Only other authored tread stacks occlude it.
 */
export function isTreadLabelVisible(stepId, cameraPosition) {
  const step = CASCADE_STEPS.find(item => item.id === stepId);
  if (!step || !finitePoint(cameraPosition) || !Number.isFinite(cameraPosition.y)) return false;
  const anchor = { x: step.x, y: step.top + .12, z: step.z };
  return !CASCADE_STEPS.some(other => other.id !== step.id && segmentSphereAabbIntersection(
    cameraPosition,
    anchor,
    { x: other.x, z: other.z, halfWidth: other.width / 2, halfDepth: other.depth / 2, minY: 0, maxY: other.top },
    0,
  ) !== null);
}

/** A feature earns a challenge label by its identity, never the number of tags.
 * Unknown tags have no guessed label. Ordinals retain their authored positions.
 */
export function authoredFeatureLabels(hole) {
  if (!Array.isArray(hole?.requiredTags)) return [];
  return hole.requiredTags.flatMap((id, index) => {
    const label = Object.hasOwn(FEATURE_NAMES, id) ? FEATURE_NAMES[id] : null;
    return label ? [{ id, label, ordinal: hole.orderedTags === false ? null : index + 1, optional: false }] : [];
  });
}

/** Production courtyard address policy; historical labs keep their own policy.
 * Survey names available optional features; the address names only the optional
 * Delivery route currently being inspected. This does not change route rulings.
 */
export function yardFeatureLabels(hole, { survey = false, routeFocus = 'direct' } = {}) {
  const labels = authoredFeatureLabels(hole);
  const delivery = hole?.id === 'mill-delivery';
  const add = (id, label, visible) => {
    if (visible && !labels.some(feature => feature.id === id)) {
      labels.push({ id, label, ordinal: null, optional: true });
    }
  };
  add('boost', 'SKIP PAD', survey || (delivery && routeFocus === 'skip'));
  add('sky', 'GOLD SKY TOKEN', delivery && (survey || routeFocus === 'sky'));
  add('mill', 'MILL', delivery && (survey || routeFocus === 'mill'));
  return labels;
}
