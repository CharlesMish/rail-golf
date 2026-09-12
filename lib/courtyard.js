import { YARD_STATIONS } from './stations.js';
// Timber Courtyard, first playable slice. Geometry and rulings share these records.
export const COURTYARD_BANKS = Object.freeze([
  Object.freeze({ id: 'bank-a', x: -10, z: 35, halfWidth: 0.6, halfDepth: 9, minY: 0.15, maxY: 16, yaw: 45 }),
  Object.freeze({ id: 'bank-b', x: 14, z: 35, halfWidth: 0.6, halfDepth: 10, minY: 0.15, maxY: 16, yaw: 45 }),
]);
export const COURTYARD_TARGETS = Object.freeze([
  Object.freeze({ id: 'mill-bell', label: 'Mill Bell', x: 0, z: 146, radius: 8, material: 'cyan' }),
  Object.freeze({ id: 'gallery-roost', label: 'Gallery Roost', x: 6, z: 62, radius: 5, material: 'amber' }),
  Object.freeze({ id: 'lumber-receiving', label: 'Receiving Bay', beaconHeight: 14, x: 22, z: 46, radius: 9, material: 'lime' }),
]);
const common = {
  station: YARD_STATIONS.gate,
  courseLength: 174, courseWidth: 100, banks: COURTYARD_BANKS, orderedTags: true,
  breach: null, breachRecoveryY: null, water: null,
  wind: { id: 'courtyard-calm', x: 0, z: 0, label: 'Still air', speedLabel: 'CALM' },
  fairwayCenters: Array.from({ length: 18 }, () => 0),
  survey: { x: 55, y: 65, z: 15, targetX: 0, targetY: 1, targetZ: 85 },
};
export const COURTYARD_HOLES = Object.freeze([
  Object.freeze({ ...common, id: 'mill-delivery', number: '01', shortName: 'DELIVERY', name: 'Across the Yard',
    kicker: 'TIMBER COURTYARD', parLabel: 'ONE CLEAN LANDING', perfectAvailable: false,
    instruction: 'Land on the far cyan Mill Bell. A clear opens the gallery and Lumber Walk.',
    boost: { x: 0, z: 84, halfWidth: 6, halfDepth: 6, minY: .2, maxY: .5, verticalSpeed: 10.5, forwardKick: 0 },
    target: COURTYARD_TARGETS[0], requiredTags: [], defaultShot: { railIndex: 1, yaw: 0, elevation: 42 } }),
  Object.freeze({ ...common, id: 'switchback-gallery', number: '02', shortName: 'GALLERY', name: 'Switchback Gallery',
    kicker: 'TIMBER COURTYARD', parLabel: 'TWO BANKS · ONE LANDING', perfectAvailable: true,
    instruction: 'Bank A → Bank B → amber roost earns the trick stamp.',
    target: COURTYARD_TARGETS[1], requiredTags: ['bank-a', 'bank-b'], defaultShot: { railIndex: 0, yaw: -1, elevation: 25 } }),
  Object.freeze({ ...common, station: YARD_STATIONS.lumber, id:'lumber-cascade', number:'03', shortName:'CASCADE', name:'Lumber Cascade',
    kicker:'TIMBER COURTYARD', parLabel:'THREE TREADS · ONE LANDING', perfectAvailable:true,
    instruction:'Land on the lime Receiving Bay to clear. Light taps reach the high stack; extra loft can carry over. Stamp: 1 → 2 → 3 → landing.',
    target:COURTYARD_TARGETS[2], requiredTags:['step-a','step-b','step-c'], defaultShot:{railIndex:1,yaw:0,elevation:30},
    survey:{x:55,y:52,z:160,targetX:22,targetY:2,targetZ:105} }),
]);

export function isCourtyardChallengeUnlocked(index, records = {}) {
  return Number.isInteger(index) && index >= 0 && index < COURTYARD_HOLES.length &&
    (index === 0 || records[COURTYARD_HOLES[0].id]?.cleared === true);
}
