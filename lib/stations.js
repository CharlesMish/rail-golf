import { RAIL_RULES, directionFromAim } from './rail-golf-v02.js';

export const YARD_STATIONS = Object.freeze({
  gate: Object.freeze({ id:'gate', label:'Yard Gate', x:0, z:0, yaw:0 }),
  lumber: Object.freeze({ id:'lumber', label:'Lumber Walk', x:22, z:154, yaw:180 }),
});
export function stationRailPosition(railIndex, station = YARD_STATIONS.gate) {
  const radians = station.yaw * Math.PI / 180;
  const offset = RAIL_RULES.railPositions[railIndex];
  return { x:station.x + offset * Math.cos(radians), y:0, z:station.z - offset * Math.sin(radians) };
}
export function stationAim(shot, station = YARD_STATIONS.gate) {
  return directionFromAim(shot.yaw + station.yaw, shot.elevation);
}
export function stationMuzzle(shot, station = YARD_STATIONS.gate) {
  const rail = stationRailPosition(shot.railIndex, station), direction = stationAim(shot, station);
  return { x:rail.x + direction.x * RAIL_RULES.muzzleLength, y:1.55 + direction.y * RAIL_RULES.muzzleLength, z:rail.z + direction.z * RAIL_RULES.muzzleLength };
}
