// Pure projection evidence; no WebGL, rendered visibility, or occlusion claim.
// Run from the integrated neutral checkout after installing its dependencies:
// node scripts/horizons/camera-audit.mjs --neutral-root . --return-root ../horizons-return
// Output is compact JSON on stdout. Redirect it outside the repository if desired.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Camera, FreeCamera, Logger, Matrix, NullEngine, Scene, Vector3, Viewport } from '@babylonjs/core';

Logger.LogLevels = 0;
const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw Error(`${name} needs a checkout path`);
  return args[index + 1];
}
if (args.some((item, index) => index % 2 === 0 && !['--neutral-root', '--return-root'].includes(item))) {
  throw Error('Usage: node scripts/horizons/camera-audit.mjs --neutral-root <checkout> --return-root <checkout>');
}
const neutralRoot = resolve(argument('--neutral-root', '.'));
const returnArg = argument('--return-root', null);
if (!returnArg) throw Error('--return-root is required for the separate radial study checkout');
const returnRoot = resolve(returnArg);
const sizes = [
  { name: 'desktop-aspect-probe', width: 1000, height: 700 },
  { name: 'phone-observed-error-state-canvas', width: 390, height: 260 },
  { name: 'phone-aspect-probe', width: 390, height: 300 },
  { name: 'portrait-canvas-control', width: 390, height: 600 },
];
const vector = point => new Vector3(point.x, point.y, point.z);
const rounded = value => Math.round(value * 1000) / 1000;
const bounds = values => [Math.min(...values), Math.max(...values)];
const moduleAt = (root, path) => import(pathToFileURL(resolve(root, path)).href);
const digest = text => createHash('sha256').update(text).digest('hex');

// Read only numeric orbit literals from the actual UI source. Never evaluate it.
function orbitLiteral(source, expression, label) {
  const literal = source.match(expression)?.[1];
  if (!literal) throw Error(`${label}: UI orbit literal moved; update this measurement explicitly`);
  const pairs = [...literal.matchAll(/(angle|elevation|radius|x|z)\s*:\s*(-?(?:\d+(?:\.\d*)?|\.\d+))/g)];
  const orbit = Object.fromEntries(pairs.map(([, key, value]) => [key, Number(value)]));
  if (pairs.length !== 5 || !['angle', 'elevation', 'radius', 'x', 'z'].every(key => Number.isFinite(orbit[key]))) {
    throw Error(`${label}: expected five finite numeric orbit fields`);
  }
  return orbit;
}

function orbitPose(orbit) {
  return {
    position: {
      x: orbit.x + Math.sin(orbit.angle) * orbit.radius * Math.cos(orbit.elevation),
      y: orbit.radius * Math.sin(orbit.elevation),
      z: orbit.z - Math.cos(orbit.angle) * orbit.radius * Math.cos(orbit.elevation),
    },
    target: { x: orbit.x, y: 1, z: orbit.z },
  };
}

async function loadCheckout(root, movedStation) {
  const uiPath = 'app/lab/worldcraft/worldcraft.tsx';
  const source = await readFile(resolve(root, uiPath), 'utf8');
  const [model, range, launcher, rules, stations] = await Promise.all([
    moduleAt(root, 'lib/worldcraft-model.js'),
    moduleAt(root, 'lib/worldcraft-range.js'),
    moduleAt(root, 'lib/mechanism-range-presentation.js'),
    moduleAt(root, 'lib/rail-golf-v02.js'),
    movedStation ? moduleAt(root, 'lib/worldcraft-station.js') : Promise.resolve(null),
  ]);
  const git = command => execFileSync('git', ['-C', root, ...command], { encoding: 'utf8' }).trim();
  return {
    root, source, model, range, launcher, rules, stations,
    provenance: { head: git(['rev-parse', 'HEAD']), dirty: Boolean(git(['status', '--porcelain'])), uiSourceSha256: digest(source) },
  };
}

// Exact settled apron Address formula from the neutral UI. The return checkout
// supplies its own station helper, so its translated station is not approximated.
function apronPose(setup, muzzleLength) {
  const yaw = setup.yaw * Math.PI / 180, elevation = setup.elevation * Math.PI / 180;
  const aim = { x: Math.sin(yaw) * Math.cos(elevation), y: Math.sin(elevation), z: Math.cos(yaw) * Math.cos(elevation) };
  return {
    launcher: { x: setup.originX, y: 0, z: 0 }, yawRadians: yaw,
    muzzle: { x: setup.originX + aim.x * muzzleLength, y: 1.55 + aim.y * muzzleLength, z: aim.z * muzzleLength },
    address: {
      position: { x: setup.originX - Math.sin(yaw) * 15, y: 7.8, z: -Math.cos(yaw) * 15 },
      target: { x: setup.originX + Math.sin(yaw) * 34, y: 3.6, z: Math.cos(yaw) * 34 },
    },
  };
}

function launcherCorners(buildRangeLauncher, station, setup) {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const drawn = buildRangeLauncher(scene, {}, { addShadowCaster() {} });
    drawn.launcher.position.copyFrom(vector(station.launcher));
    drawn.yaw.rotation.y = station.yawRadians;
    drawn.loft.rotation.x = -setup.elevation * Math.PI / 180;
    for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
    return scene.meshes.flatMap(mesh => mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point => ({ x: point.x, y: point.y, z: point.z })));
  } finally { scene.dispose(); engine.dispose(); }
}

function project(shapes, pose, size, mode) {
  const engine = new NullEngine({ renderWidth: size.width, renderHeight: size.height }), scene = new Scene(engine);
  try {
    const camera = new FreeCamera('projection-only', vector(pose.position), scene);
    const horizontal = size.width < size.height;
    camera.minZ = .1; camera.maxZ = 420;
    camera.fovMode = horizontal ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
    camera.fov = mode === 'address' ? (horizontal ? .96 : .69) : (horizontal ? 1.02 : .78);
    camera.setTarget(vector(pose.target));
    camera.getViewMatrix(true); camera.getProjectionMatrix(true);
    const transform = camera.getTransformationMatrix(), viewport = new Viewport(0, 0, size.width, size.height);
    const rows = shapes.map(shape => {
      const points = shape.points.map(point => Vector3.Project(vector(point), Matrix.Identity(), transform, viewport));
      const x = bounds(points.map(point => point.x)), y = bounds(points.map(point => point.y)), z = bounds(points.map(point => point.z));
      return {
        id: shape.id, xPixels: x.map(rounded), yPixels: y.map(rounded),
        fullyInFrame: x[0] >= 0 && x[1] <= size.width && y[0] >= 0 && y[1] <= size.height && z[0] >= 0 && z[1] <= 1,
      };
    });
    const pieces = rows.filter(row => !row.id.startsWith('launcher') && row.id !== 'opening-midline');
    const x = bounds(pieces.flatMap(piece => piece.xPixels)), y = bounds(pieces.flatMap(piece => piece.yPixels));
    return {
      canvas: size, fovMode: horizontal ? 'horizontal-fixed' : 'vertical-fixed',
      allPieceCornersInFrame: pieces.every(piece => piece.fullyInFrame),
      architecturePixels: { width: rounded(x[1] - x[0]), height: rounded(y[1] - y[0]) },
      pieces,
      launcher: rows.find(row => row.id === 'launcher-mesh-bounds'),
      muzzle: rows.find(row => row.id === 'launcher-muzzle'),
      ...(rows.some(row => row.id === 'opening-midline') ? { openingHeightPixels: rounded(rows.find(row => row.id === 'opening-midline').yPixels[1] - rows.find(row => row.id === 'opening-midline').yPixels[0]) } : {}),
    };
  } finally { scene.dispose(); engine.dispose(); }
}

const [neutral, radial] = await Promise.all([loadCheckout(neutralRoot, false), loadCheckout(returnRoot, true)]);
const yard = orbitLiteral(neutral.source, /const orbitHome\s*=\s*(\{[^}]+\})/, 'Neutral yard');
const overpassEntry = orbitLiteral(neutral.source, /id === 'overpass'\s*\?\s*(\{[^}]+\})/, 'Overpass entry');
const radialEntry = orbitLiteral(radial.source, /foundryId === 'radial-return'\s*\?\s*(\{[^}]+\})/, 'Radial Return entry');
const report = {
  kind: 'nullengine-camera-projection',
  limitation: 'Actual catalog corners and drawn launcher bounds, not rendered visibility, occlusion, UI layout, draw costs, or human legibility. Only 390x260 was observed in the WebGL-error-state DOM; other sizes are aspect probes.',
  sources: { neutral: neutral.provenance, radial: radial.provenance },
  worlds: [],
};
for (const [id, checkout] of [['overpass', neutral], ['crossing-house', neutral], ['radial-return', radial]]) {
  const presetText = await readFile(resolve(checkout.root, `worlds/foundry/${id}/preset.json`), 'utf8');
  const preset = checkout.range.parseRangePreset(presetText), setup = checkout.range.rangeOpeningSetup(preset);
  const station = checkout.stations ? checkout.stations.worldcraftStationPose(preset, setup) : apronPose(setup, checkout.rules.RAIL_RULES.muzzleLength);
  const shapes = preset.objects.map(object => ({ id: object.id, points: checkout.model.worldcraftBox(object).corners }));
  shapes.push({ id: 'launcher-mesh-bounds', points: launcherCorners(checkout.launcher.buildRangeLauncher, station, setup) });
  shapes.push({ id: 'launcher-muzzle', points: [station.muzzle] });
  if (id === 'overpass') shapes.push({ id: 'opening-midline', points: [{ x: 0, y: 0, z: 32 }, { x: 0, y: 7, z: 32 }] });
  const prior = checkout.stations ? checkout.stations.worldcraftSurveyHome(preset, setup) : yard;
  const selected = id === 'overpass' ? overpassEntry : id === 'radial-return' ? radialEntry : yard;
  const frames = [
    { name: 'prior-entry-control', mode: 'survey', orbit: prior, pose: orbitPose(prior) },
    { name: 'selected-entry', mode: 'survey', orbit: selected, pose: orbitPose(selected) },
    { name: 'settled-address', mode: 'address', pose: station.address },
  ];
  report.worlds.push({
    id, presetSha256: digest(presetText),
    frames: frames.map(frame => ({ name: frame.name, ...(frame.orbit ? { orbit: frame.orbit } : {}), measurements: sizes.map(size => project(shapes, frame.pose, size, frame.mode)) })),
  });
}
process.stdout.write(`${JSON.stringify(report)}\n`);
