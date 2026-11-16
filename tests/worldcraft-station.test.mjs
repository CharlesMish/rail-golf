import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { RAIL_RULES, chargeToSpeed, directionFromAim } from '../lib/rail-golf-v02.js';
import { spatialLaunch } from '../lib/spatial-lab-session.js';
import {
  captureWorldSnapshot, createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld,
  exportWorldJSON, packWorldcraftLine,
} from '../lib/worldcraft-model.js';
import { exportRangePreset, retargetRangeOpening } from '../lib/worldcraft-range.js';
import { foundryPreset, foundryRecord, foundryRemixWorld } from '../lib/worldcraft-foundry.js';
import { worldcraftTerraceFacets } from '../lib/worldcraft-terrace.js';
import { worldcraftStation, worldcraftStationPose, worldcraftStoredLauncher, worldcraftSurveyHome } from '../lib/worldcraft-station.js';

const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';
const BOWL_SHA = {
  'worlds/foundry/chime-bowl-aisle/preset.json': 'dcbcd0b39887a2c991b7342d0f60cada3a00eadb749befb8af51e954ae6f5401',
  'worlds/foundry/chime-bowl-stage/preset.json': 'b0294149eb405ac06abe28059fdd3d34177c4f137601e0281ac54e78b4513aee',
  'worlds/foundry/chime-bowl-aisle/manifest.json': 'b6f13c6f1d4c7c89b63cfe12c0cc3babfb71c772d16c869874777be7b7a2f6ee',
  'worlds/foundry/chime-bowl-stage/manifest.json': 'bc9364656b38d0bf42ccce2e7287d886f8093573ff9890d89240e8fb350f35c7',
  'docs/experiments/chime-amphitheater/bowl/chime-bowl-aisle.json': 'e452b203fc0aef582e92de56853f31b4be7601d915ce85178666f6fda027c72a',
  'docs/experiments/chime-amphitheater/bowl/chime-bowl-stage.json': '356411a7c456bcb29c309c51834cc9071376b4b469b0b925ada353ab2454133d',
};

const setup = { railIndex: 1, originX: 0, yaw: 12, elevation: 18, charge: 0.55 };

function insidePlan(point, polygon) {
  let sign = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const cross = (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
    if (Math.abs(cross) <= 1e-7) continue;
    const next = Math.sign(cross);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return sign !== 0;
}

function rayMeetsSeating(world, aimYaw) {
  const direction = directionFromAim(aimYaw, 0);
  const facets = world.objects.filter(object => object.kind === 'terrace').flatMap(object => worldcraftTerraceFacets(object));
  for (let radius = 8; radius <= 20; radius += 0.25) {
    const point = { x: direction.x * radius, z: 32 + direction.z * radius };
    if (facets.some(facet => insidePlan(point, facet.plan))) return true;
  }
  return false;
}

test('an apron station still draws the historical rail, aim, and address camera', () => {
  const world = createStarterWorld();
  const pose = worldcraftStationPose(world, setup);
  const radians = setup.yaw * Math.PI / 180;
  const physics = spatialLaunch({ station: () => worldcraftStation(world, setup) }, setup);
  assert.equal(pose.launcher.x, setup.originX);
  assert.equal(pose.launcher.y, 0);
  assert.equal(pose.launcher.z, 0);
  assert.equal(pose.station.yaw, 0);
  assert.deepEqual(pose.aim, directionFromAim(setup.yaw, setup.elevation));
  assert.deepEqual(pose.aim, physics.aim);
  assert.deepEqual(pose.muzzle, physics.muzzle);
  assert.deepEqual(pose.rail, physics.rail);
  assert.equal(pose.address.position.x, setup.originX - Math.sin(radians) * 15);
  assert.equal(pose.address.position.y, 7.8);
  assert.equal(pose.address.position.z, -Math.cos(radians) * 15);
  assert.equal(pose.address.target.x, setup.originX + Math.sin(radians) * 34);
  assert.equal(pose.address.target.y, 3.6);
  assert.equal(pose.address.target.z, Math.cos(radians) * 34);
  assert.equal(worldcraftSurveyHome(world, setup), null);
  assert.deepEqual(worldcraftStoredLauncher(world.launcher, world.launcher.x), { x: world.launcher.x });
  assert.equal(exportWorldJSON({ ...world, launcher: worldcraftStoredLauncher(world.launcher, world.launcher.x) }), exportWorldJSON(world));
});

test('a stage station is not drawn on the apron or aimed with the slider yaw alone', () => {
  const world = foundryRecord('chime-bowl-stage').world;
  const pose = worldcraftStationPose(world, setup);
  const physics = spatialLaunch({ station: () => worldcraftStation(world, setup) }, setup);
  const apronAim = directionFromAim(setup.yaw, setup.elevation);
  assert.equal(world.launcher.z, 32);
  assert.equal(world.launcher.yaw, -180);
  assert.equal(pose.launcher.z, 32);
  assert.equal(pose.station.z, 32);
  assert.equal(pose.station.yaw, -180);
  assert.notEqual(pose.launcher.z, 0);
  assert.deepEqual(pose.aim, physics.aim);
  assert.deepEqual(pose.muzzle, physics.muzzle);
  assert.deepEqual(pose.rail, physics.rail);
  assert.ok(Math.hypot(pose.aim.x - apronAim.x, pose.aim.z - apronAim.z) > 0.5);
  assert.ok(pose.address.position.z > 20);
  assert.equal(pose.muzzle.z, physics.muzzle.z);
  const home = worldcraftSurveyHome(world, setup);
  const offsetX = Math.sin(home.angle) * Math.cos(home.elevation);
  const offsetZ = -Math.cos(home.angle) * Math.cos(home.elevation);
  const dot = (offsetX * pose.heading.x + offsetZ * pose.heading.z) / Math.hypot(offsetX, offsetZ);
  assert.ok(dot < -0.99, `survey camera should sit behind the launch, dot ${dot}`);
  assert.equal(home.x, 0);
  assert.equal(home.z, 32);
});

test('the centre facing puts the measured aim cone on the seating and off the aisle', () => {
  const world = foundryRecord('chime-bowl-stage').world;
  const centre = { ...world, launcher: { ...world.launcher, yaw: -120 } };
  assert.equal(rayMeetsSeating(centre, -180), false);
  assert.equal(rayMeetsSeating(centre, -120), true);
  for (let yaw = -24; yaw <= 24; yaw += 2) {
    assert.equal(rayMeetsSeating(centre, -120 + yaw), true, `yaw ${yaw} missed the seating`);
    const gap = Math.abs(((-120 + yaw) - -180 + 540) % 360 - 180);
    assert.ok(gap > 30, `yaw ${yaw} is ${gap}° from the aisle`);
  }
  assert.equal(rayMeetsSeating(world, -180), false);
});

test('save, export, copy, and a kept line keep station z and yaw', () => {
  const world = foundryRecord('chime-bowl-stage').world;
  const stored = worldcraftStoredLauncher(world.launcher, 0);
  const dropped = { x: 0 };
  assert.deepEqual(stored, { x: 0, z: 32, yaw: -180 });
  assert.notDeepEqual(dropped, stored);
  const exported = JSON.parse(exportWorldJSON({ ...world, launcher: stored }));
  assert.equal(exported.launcher.z, 32);
  assert.equal(exported.launcher.yaw, -180);
  const copy = foundryRemixWorld({ ...world, launcher: stored }, { id: 'copy-stage-station', name: 'Copy of From the Stage' });
  assert.equal(copy.launcher.z, 32);
  assert.equal(copy.launcher.yaw, -180);
  assert.notEqual(copy.id, world.id);
  const retargeted = retargetRangeOpening(foundryPreset('chime-bowl-stage'), { railIndex: 1, originX: 0, yaw: 6, elevation: 16, charge: 0.45 });
  assert.equal(retargeted.launcher.z, 32);
  assert.equal(retargeted.launcher.yaw, -180);
  assert.equal(retargeted.rules.launcher.yaw, 6);
  assert.equal(exportRangePreset(foundryPreset('chime-bowl-stage')), exportRangePreset(foundryPreset('chime-bowl-stage')));

  const shot = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
  const launch = spatialLaunch({ station: candidate => worldcraftStation(world, candidate) }, shot);
  const record = {
    station: launch.station, muzzle: launch.muzzle, rail: launch.rail, aim: launch.aim, direction: { ...launch.aim },
    speed: chargeToSpeed(shot.charge), mass: RAIL_RULES.projectileMass, radius: RAIL_RULES.projectileRadius,
  };
  const kept = packWorldcraftLine({
    id: 'line-stage-station', createdAt: '2026-11-15T00:00:00.000Z',
    worldSnapshot: captureWorldSnapshot(world, '2a9d096'), setup: shot, launch: record,
    points: [{ t: 0, ...launch.muzzle }, { t: 1, x: 0, y: 1, z: 20 }], events: [], contacts: [],
    terminal: { reason: 'out-of-bounds', elapsed: 1, position: [0, 2, -8] },
  });
  assert.equal(kept.launch.station.z, 32);
  assert.equal(kept.launch.station.yaw, -180);
  assert.equal(kept.worldSnapshot.world.launcher.z, 32);
  assert.equal(kept.worldSnapshot.world.launcher.yaw, -180);
  assert.equal(kept.setup.yaw, 0);
  assert.throws(() => packWorldcraftLine({
    id: 'line-stage-stripped', createdAt: '2026-11-15T00:00:00.000Z',
    worldSnapshot: captureWorldSnapshot(world, '2a9d096'), setup: shot,
    launch: { ...record, station: { ...record.station, z: 0, yaw: 0 } },
    points: [{ t: 0, x: 0, y: 1, z: 0 }, { t: 1, x: 0, y: 1, z: 20 }], events: [], contacts: [],
    terminal: { reason: 'out-of-bounds', elapsed: 1, position: [0, 2, -8] },
  }), /origin/);
});

test('the play view uses the station pose, and existing bowl bytes and the v1 export stay put', async () => {
  const ui = await readFile(new URL('../app/lab/worldcraft/worldcraft.tsx', import.meta.url), 'utf8');
  assert.match(ui, /worldcraftStationPose\(/);
  assert.match(ui, /worldcraftStoredLauncher\(/);
  assert.match(ui, /worldcraftSurveyHome\(/);
  assert.equal(ui.includes('new Vector3(setup.originX, 1.55, 0)'), false);
  assert.equal(ui.includes('launcher: { x: uiRef.current.setup.originX }'), false);
  assert.equal(ui.includes('launcher: { x: state.setup.originX }'), false);
  for (const [path, hash] of Object.entries(BOWL_SHA)) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, path);
  }
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
});
