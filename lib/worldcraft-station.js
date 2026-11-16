import { stationAim, stationMuzzle, stationRailPosition } from './stations.js';

// The drawn rail, the short aim mark, and the address camera read the same
// station the Havok launch uses. A missing z or yaw is the apron at z 0,
// facing downrange. This does not draw a predicted trajectory.

export function worldcraftStation(world, setup) {
  return {
    id: 'worldcraft',
    label: 'Worldcraft apron',
    x: setup.originX,
    z: world?.launcher?.z ?? 0,
    yaw: world?.launcher?.yaw ?? 0,
  };
}

/** Rail, muzzle, aim, and address camera for one stopped shot. */
export function worldcraftStationPose(world, setup) {
  const station = worldcraftStation(world, setup);
  // Worldcraft's station id is not gate or lumber, so the carriage x is
  // station.x and the rail offset is the central rail. Same call stationMuzzle makes.
  const rail = stationRailPosition(setup.railIndex, station);
  const aim = stationAim(setup, station);
  const muzzle = stationMuzzle(setup, station);
  muzzle.y += station.y ?? 0;
  const radians = ((setup.yaw + station.yaw) * Math.PI) / 180;
  return {
    station,
    rail,
    aim,
    muzzle,
    launcher: { x: rail.x, y: 0, z: rail.z },
    yawRadians: radians,
    heading: { x: Math.sin(radians), y: 0, z: Math.cos(radians) },
    address: {
      position: {
        x: rail.x - Math.sin(radians) * 15,
        y: (rail.y ?? 0) + 7.8,
        z: rail.z - Math.cos(radians) * 15,
      },
      target: {
        x: rail.x + Math.sin(radians) * 34,
        y: (rail.y ?? 0) + 3.6,
        z: rail.z + Math.cos(radians) * 34,
      },
    },
  };
}

/**
 * Survey orbit for a moved station, camera behind the facing.
 * An apron station returns null so the shared yard orbit stays as it was.
 */
export function worldcraftSurveyHome(world, setup) {
  const pose = worldcraftStationPose(world, setup);
  if (!pose.station.z && !pose.station.yaw) return null;
  return {
    angle: -pose.yawRadians,
    elevation: 0.62,
    radius: 46,
    x: pose.rail.x,
    z: pose.rail.z,
  };
}

/**
 * Launcher object written by Save, Export, and Make a Copy.
 * The carriage x can follow the stopped origin. Station z and yaw stay.
 * Omitted fields stay omitted, so an apron export does not grow new keys.
 */
export function worldcraftStoredLauncher(launcher, originX) {
  const point = { x: originX };
  if (launcher && Object.hasOwn(launcher, 'z')) point.z = launcher.z;
  if (launcher && Object.hasOwn(launcher, 'yaw')) point.yaw = launcher.yaw;
  return point;
}
