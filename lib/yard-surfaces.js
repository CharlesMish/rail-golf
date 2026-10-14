import { Color3, RawTexture, StandardMaterial, Texture, Vector3, VertexBuffer } from '@babylonjs/core';
import { stableUnitInterval } from './rail-golf-v02.js';

// The existing rough box covers x=-50..50, z=-17..199. One authored field
// continues across its existing stripe meshes instead of restarting on each.
export const YARD_GROUND_BOUNDS = Object.freeze({ minX: -50, maxX: 50, minZ: -17, maxZ: 199 });
export const YARD_SURFACE_SIZES = Object.freeze({
  timber: Object.freeze([256, 512]),
  'end-grain': Object.freeze([128, 128]),
  metal: Object.freeze([128, 256]),
  ground: Object.freeze([1024, 512]),
});

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const smooth = n => n * n * (3 - 2 * n);
const TAU = Math.PI * 2;

function noiseField(columns, rows, seed) {
  const values = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => stableUnitInterval(`${seed}:${x}:${y}`)));
  return (u, v) => {
    const x = ((u % 1 + 1) % 1) * columns, y = ((v % 1 + 1) % 1) * rows;
    const left = Math.floor(x), top = Math.floor(y), sx = smooth(x - left), sy = smooth(y - top);
    const a = values[top][left] * (1 - sx) + values[top][(left + 1) % columns] * sx;
    const b = values[(top + 1) % rows][left] * (1 - sx) + values[(top + 1) % rows][(left + 1) % columns] * sx;
    return a * (1 - sy) + b * sy;
  };
}

function oval(x, z, cx, cz, rx, rz) {
  const distance = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
  return distance >= 1 ? 0 : (1 - distance) ** 2;
}

function pixelPainter(kind) {
  const broad = noiseField(7, 9, `${kind}:broad`), soft = noiseField(23, 29, `${kind}:soft`);
  if (kind === 'timber') return (u, v) => {
    const curve = u + .017 * Math.sin(v * TAU) + .009 * Math.sin(v * TAU * 3);
    const ribbons = Math.sin(curve * TAU * 11) * 3.2 + Math.sin(curve * TAU * 23) * 1.3;
    const variation = (broad(u, v) - .5) * 16 + (soft(u, v) - .5) * 3 + ribbons;
    return [190 + variation, 167 + variation * .85, 135 + variation * .7];
  };
  if (kind === 'end-grain') return (u, v) => {
    const radius = Math.hypot((u - .54) * 1.05, v - .48);
    const rings = Math.sin((radius + .012 * Math.sin(u * TAU * 2)) * TAU * 17);
    const variation = rings * 7 + (broad(u, v) - .5) * 13;
    return [200 + variation, 175 + variation * .8, 137 + variation * .65];
  };
  if (kind === 'metal') return (u, v) => {
    const scuff = oval(u, v, .24, .40, .16, .21) + oval(u, v, .69, .78, .20, .10);
    const brushed = Math.sin(v * TAU * 19) * .8;
    const value = 242 + (broad(u, v) - .5) * 10 + (soft(u, v) - .5) * 3 + brushed + scuff * 5;
    return [value, value, value - scuff * 3];
  };
  return (u, v) => {
    const x = YARD_GROUND_BOUNDS.minX + v * 100, z = YARD_GROUND_BOUNDS.minZ + u * 216;
    const variation = (broad(u, v) - .5) * 18 + (soft(u, v) - .5) * 7;
    // Soft, interrupted activity patches follow the mill apron and stations.
    // They are not parallel rails, shot lanes, arrows or destination markings.
    const wear = .48 * oval(x, z, -20, 84, 8, 30) + .35 * oval(x, z, -15, 124, 10, 22)
      + .30 * oval(x, z, 0, -1, 11, 11) + .32 * oval(x, z, 22, 153, 12, 10);
    const sawdust = .66 * oval(x, z, -25, 104, 7, 21) + .40 * oval(x, z, -27, 66, 10, 9);
    const softDust = sawdust * (.83 + broad(u * 2, v * 2) * .17);
    return [241 + variation - wear * 25 + softDust * 9,
      240 + variation - wear * 27 - softDust * 2,
      234 + variation - wear * 29 - softDust * 28];
  };
}

/** Pure, deterministic RGBA pixels, usable without canvas, WebGL or the DOM. */
export function createYardSurfacePixels(kind) {
  const size = YARD_SURFACE_SIZES[kind];
  if (!size) throw new RangeError(`Unknown yard surface: ${kind}`);
  const [width, height] = size, data = new Uint8Array(width * height * 4), paint = pixelPainter(kind);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const rgb = paint(x / width, y / height), offset = (y * width + x) * 4;
    for (let channel = 0; channel < 3; channel++) data[offset + channel] = clamp(Math.round(rgb[channel]), 0, 255);
    data[offset + 3] = 255;
  }
  return { width, height, data };
}

const sceneSurfaces = new WeakMap();

/** Called once at scene setup, only for the public Timber Courtyard. */
export function applyYardSurfaceMaterials(scene, materials) {
  let shared = sceneSurfaces.get(scene);
  if (!shared) {
    const textures = Object.fromEntries(Object.keys(YARD_SURFACE_SIZES).map(kind => {
      const { width, height, data } = createYardSurfacePixels(kind);
      const texture = RawTexture.CreateRGBATexture(data, width, height, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
      texture.name = `yard-surface-${kind}`;
      texture.wrapU = texture.wrapV = kind === 'ground' || kind === 'end-grain' ? Texture.CLAMP_ADDRESSMODE : Texture.WRAP_ADDRESSMODE;
      texture.anisotropicFilteringLevel = 4;
      return [kind, texture];
    }));
    const yardEndGrain = new StandardMaterial('yard-end-grain', scene);
    yardEndGrain.diffuseTexture = textures['end-grain'];
    yardEndGrain.diffuseColor = new Color3(.58, .40, .23);
    yardEndGrain.specularColor = new Color3(.07, .07, .07);
    const yardEndGrainPale = new StandardMaterial('yard-end-grain-pale', scene);
    yardEndGrainPale.diffuseTexture = textures['end-grain'];
    yardEndGrainPale.diffuseColor = new Color3(.66, .48, .29);
    yardEndGrainPale.specularColor = new Color3(.07, .07, .07);
    shared = { textures, overrides: { yardEndGrain, yardEndGrainPale } };
    sceneSurfaces.set(scene, shared);
    scene.onDisposeObservable.add(() => sceneSurfaces.delete(scene));
  }
  for (const key of ['timber', 'brick']) materials[key].diffuseTexture = shared.textures.timber;
  for (const key of ['steel', 'machine']) materials[key].diffuseTexture = shared.textures.metal;
  for (const key of ['rough', 'fairwayA', 'fairwayB']) materials[key].diffuseTexture = shared.textures.ground;
  return shared.overrides;
}

/** Remap only UVs; the existing floor geometry and physics remain untouched. */
export function applyYardGroundUVs(mesh) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;
  const matrix = mesh.computeWorldMatrix(true), uvs = [];
  for (let i = 0; i < positions.length; i += 3) {
    const point = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), matrix);
    uvs.push((point.z - YARD_GROUND_BOUNDS.minZ) / 216, (point.x - YARD_GROUND_BOUNDS.minX) / 100);
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uvs);
}
