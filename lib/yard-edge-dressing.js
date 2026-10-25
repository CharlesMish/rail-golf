import { Color3, Constants, Mesh, StandardMaterial, TransformNode, VertexData } from '@babylonjs/core';
import { box, cone, geometry, seeded } from './yard-environment.js';

// Public-yard edge dressing: the corners and ends of the Timber Courtyard.
// Nothing here has collision, picking, shadows or recognition authority, so
// three placement rules keep it honest about what looks solid:
//   1. Inside the fence, dressing is floor detail no taller than the existing
//      sleepers (floorMaxY) and stays out of every footprint in keepClear.
//   2. Anything taller inside the slab stands on the perimeter line, like the
//      existing fence posts.
//   3. Stockpiles beyond the fence obey the environment's own margin: outside
//      |x| 62, z -29..211, where an out-of-bounds round is already ruled.
export const YARD_EDGE_DRESSING = Object.freeze({
  seed: 'timber-courtyard-edges-01',
  floorMaxY: .13,
  fence: Object.freeze({ x: 48, south: -13, north: 195, gate: 14, postHeight: 2.2 }),
  perimeterReach: 2.5,
  outside: Object.freeze({ x: 62, south: -29, north: 211 }),
  // The physical slab (x ±50, z -17..199, top y 0) gains a timber retaining
  // skin no more than skinDepth outside its faces and no taller than floor detail.
  slab: Object.freeze({ x: 50, south: -17, north: 199 }),
  skinDepth: .4,
  lamps: Object.freeze([
    Object.freeze({ x: -47.4, z: -12.4, armX: 1, armZ: .55 }),
    Object.freeze({ x: 47.4, z: -12.4, armX: -1, armZ: .55 }),
    Object.freeze({ x: -47.4, z: 194.4, armX: 1, armZ: -.55 }),
    Object.freeze({ x: 47.4, z: 194.4, armX: -1, armZ: -.55 }),
  ]),
  // Axis-aligned playable footprints, with margin. Floor detail never enters these.
  keepClear: Object.freeze([
    Object.freeze({ id: 'gate-lane', minX: -12, maxX: 17, minZ: -15, maxZ: 170 }),
    Object.freeze({ id: 'banks', minX: -19, maxX: 26, minZ: 24, maxZ: 47 }),
    Object.freeze({ id: 'receiving-bay', minX: 8, maxX: 36, minZ: 34, maxZ: 58 }),
    Object.freeze({ id: 'lumber-stacks', minX: 14, maxX: 46, minZ: 52, maxZ: 134 }),
    Object.freeze({ id: 'mill', minX: -46, maxX: -16, minZ: 54, maxZ: 136 }),
    Object.freeze({ id: 'bell-gantry', minX: -12, maxX: 12, minZ: 136, maxZ: 170 }),
    Object.freeze({ id: 'lumber-walk', minX: 12, maxX: 32, minZ: 150, maxZ: 166 }),
  ]),
});

const TAU = Math.PI * 2;
const shade = (color, factor) => color.map(value => value * factor);
const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);

const PALETTE = Object.freeze({
  paint: [.62, .56, .42],
  rut: [.07, .045, .02],
  stain: [.1, .065, .03],
  sawdust: [.78, .62, .38],
  board: [.5, .33, .18],
  boardPale: [.64, .46, .27],
  steel: [.16, .19, .19],
  post: [.62, .4, .23],
  rail: [.42, .265, .13],
  bark: [.2, .13, .075],
  logEnd: [.66, .5, .31],
  lumber: [.42, .33, .21],
  sticker: [.13, .1, .07],
  tarp: [.13, .17, .17],
});

// ---------------------------------------------------------------------------
// Floor wash: translucent stains, ruts and worn paint whose edges fade into
// the ground texture instead of reading as cut-out shapes.
function washGeometry() {
  const positions = [], indices = [], colors = [];
  const vertex = (x, y, z, color, alpha) => { positions.push(x, y, z); colors.push(...color, alpha); return positions.length / 3 - 1; };
  return { positions, indices, colors, vertex };
}

function stain(wash, random, cx, cz, rx, rz, y, color, alpha, sides = 14) {
  const center = wash.vertex(cx, y, cz, color, alpha), inner = [], outer = [];
  for (let i = 0; i < sides; i++) {
    const a = i * TAU / sides, wobble = .75 + random() * .45;
    inner.push(wash.vertex(cx + Math.cos(a) * rx * wobble * .55, y, cz + Math.sin(a) * rz * wobble * .55, color, alpha * .8));
    outer.push(wash.vertex(cx + Math.cos(a) * rx * wobble, y, cz + Math.sin(a) * rz * wobble, color, 0));
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    wash.indices.push(center, inner[j], inner[i], inner[i], inner[j], outer[j], inner[i], outer[j], outer[i]);
  }
}

function band(wash, path, width, y, color, alpha) {
  // Three-strip ribbon: opaque-ish core, transparent edges.
  const rows = [];
  for (let i = 0; i < path.length; i++) {
    const [px, pz] = path[Math.max(0, i - 1)], [qx, qz] = path[Math.min(path.length - 1, i + 1)];
    const length = Math.hypot(qx - px, qz - pz) || 1, nx = -(qz - pz) / length, nz = (qx - px) / length;
    const [x, z] = path[i];
    const fade = i === 0 || i === path.length - 1 ? .25 : 1;
    rows.push([-1, -.35, .35, 1].map((offset, k) => wash.vertex(x + nx * offset * width / 2, y, z + nz * offset * width / 2, color, (k === 0 || k === 3 ? 0 : alpha) * fade)));
  }
  for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < 3; k++) {
    const a = rows[i][k], b = rows[i][k + 1], c = rows[i + 1][k + 1], d = rows[i + 1][k];
    wash.indices.push(a, d, c, a, c, b);
  }
}

function curve(points, steps = 10) {
  // Quadratic Bezier through a control point; enough for forklift ruts.
  const [a, c, b] = points, out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

function offsetPath(path, offset) {
  return path.map(([x, z], i) => {
    const [px, pz] = path[Math.max(0, i - 1)], [qx, qz] = path[Math.min(path.length - 1, i + 1)];
    const length = Math.hypot(qx - px, qz - pz) || 1;
    return [x - (qz - pz) / length * offset, z + (qx - px) / length * offset];
  });
}

function ruts(wash, path, y) {
  band(wash, path, 3.4, y - .001, PALETTE.stain, .16);
  for (const side of [-.85, .85]) band(wash, offsetPath(path, side), .62, y, PALETTE.rut, .42);
}

function paintRect(wash, x0, z0, x1, z1, y, alpha = .5) {
  const path = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  for (let i = 0; i < 4; i++) band(wash, [path[i], path[i + 1]], .34, y, PALETTE.paint, alpha);
}

// ---------------------------------------------------------------------------
// Solid-looking low detail (pallets, skids, offcuts), all under floorMaxY.
function yawBox(data, x, y, z, width, height, depth, yaw, color) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const p = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  const w = width / 2, h = height / 2, d = depth / 2;
  const v = [p(-w,-h,-d),p(w,-h,-d),p(w,h,-d),p(-w,h,-d),p(-w,-h,d),p(w,-h,d),p(w,h,d),p(-w,h,d)];
  data.quad(v[0],v[1],v[2],v[3],shade(color,.9)); data.quad(v[5],v[4],v[7],v[6],shade(color,.82));
  data.quad(v[4],v[0],v[3],v[7],shade(color,.78)); data.quad(v[1],v[5],v[6],v[2],color);
  data.quad(v[3],v[2],v[6],v[7],shade(color,1.05));
}

function pallet(data, random, x, z, yaw) {
  const tint = mix(PALETTE.board, PALETTE.boardPale, random());
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  for (const dz of [-.5, 0, .5]) { const [px, pz] = at(0, dz); yawBox(data, px, .045, pz, 1.2, .09, .12, yaw, shade(tint, .75)); }
  for (let i = 0; i < 6; i++) { const [px, pz] = at(-.52 + i * .208, 0); yawBox(data, px, .11, pz, .15, .04, 1.15, yaw, tint); }
}

function boards(data, random, x, z, count, spread) {
  for (let i = 0; i < count; i++) {
    const length = 1.8 + random() * 2.4, yaw = (random() - .5) * 1.2;
    yawBox(data, x + (random() - .5) * spread, .04, z + (random() - .5) * spread, length, .08, .22, yaw, mix(PALETTE.board, PALETTE.boardPale, random()));
  }
}

function makeFloor(random) {
  const solid = geometry(), wash = washGeometry();
  const Y = { stain: .008, paint: .012, rut: .016, sawdust: .02 };

  // South-west: a log laydown beside the gate. Two painted bays on skids, with
  // forklift ruts from the loading platform out to the corner service gate.
  stain(wash, random, -35, 16, 10.5, 23, Y.stain, PALETTE.stain, .22, 16);
  for (const [z0, z1] of [[-10, 12], [16, 40]]) {
    paintRect(wash, -46.5, z0, -26, z1, Y.paint);
    for (let x = -44.3; x < -27; x += 3.4) box(solid, x, .06, (z0 + z1) / 2, .28, .12, z1 - z0 - 2.5, shade(PALETTE.board, .62));
  }
  stain(wash, random, -32, 46, 6, 4, Y.sawdust, PALETTE.sawdust, .55);
  stain(wash, random, -40.5, 44.5, 3.4, 2.4, Y.sawdust, PALETTE.sawdust, .45);
  boards(solid, random, -21, 9, 5, 4);
  ruts(wash, curve([[-28, 53.5], [-22, 22], [-30, -12.6]], 16), Y.rut);

  // South-east: an outbound stacking bay with pallets and a yard drain.
  paintRect(wash, 25, -11, 46.5, 28, Y.paint, .42);
  for (const z of [2, 15]) band(wash, [[25, z], [46.5, z]], .3, Y.paint, PALETTE.paint, .38);
  for (let bay = 0; bay < 3; bay++) for (let tally = 0; tally <= bay; tally++) {
    box(solid, 27.2 + tally * .7, .015, -11 + bay * 13 + 2.2, .32, .02, 1.6, PALETTE.paint);
  }
  for (const [px, pz, yaw] of [[33, -6, .04], [34.6, -3.9, .1], [39.5, -7, -.05], [41, -5.5, .02], [32.6, 7.5, .02], [36.4, 8.2, -.08], [41.8, 21, .12], [38, 22.6, .5]]) pallet(solid, random, px, pz, yaw);
  box(solid, 30, .012, 21, 1.6, .02, 1.6, PALETTE.steel);
  for (let i = 0; i < 5; i++) box(solid, 29.4 + i * .3, .03, 21, .1, .02, 1.5, shade(PALETTE.steel, 1.6));
  stain(wash, random, 30, 21, 3.6, 2.8, Y.stain, PALETTE.stain, .35);
  ruts(wash, curve([[22, -12.6], [26, 10], [44, 30.5]], 14), Y.rut);

  // North-west: sawdust drifting out past the mill, offcuts and a hatched no-stack zone.
  stain(wash, random, -27, 144, 10, 7, Y.sawdust, PALETTE.sawdust, .7, 16);
  stain(wash, random, -19, 153, 4.5, 3.2, Y.sawdust, PALETTE.sawdust, .55);
  boards(solid, random, -40, 150, 7, 5);
  paintRect(wash, -46.5, 172, -30, 190, Y.paint, .45);
  for (let i = 0; i < 8; i++) {
    const x0 = -46 + i * 2.1;
    band(wash, [[x0, 172.5], [Math.min(x0 + 3.8, -30.4), 172.5 + (Math.min(x0 + 3.8, -30.4) - x0) * 4.4]], .32, Y.paint, PALETTE.paint, .3);
  }
  ruts(wash, curve([[-26, 137], [-22, 170], [-4, 194.4]], 16), Y.rut);

  // North-east: pallets waiting behind Lumber Walk.
  stain(wash, random, 40, 182, 7, 10, Y.stain, PALETTE.stain, .22, 14);
  for (const [px, pz, yaw] of [[38, 176, .06], [40.2, 177.4, -.04], [43.3, 186, .3], [37.4, 189.4, -.1]]) pallet(solid, random, px, pz, yaw);
  boards(solid, random, 36, 170, 4, 3);
  ruts(wash, curve([[28, 168], [30, 182], [6, 194.4]], 14), Y.rut);
  return { solid, wash };
}

// ---------------------------------------------------------------------------
// Perimeter: complete the fence around both ends, with gate openings on the
// centreline and a lamp standard in each corner.
function addPerimeter(data) {
  const { x: fx, south, north, gate, postHeight } = YARD_EDGE_DRESSING.fence;
  const post = (x, z, h = postHeight, w = .3) => box(data, x, h / 2, z, w, h, w, PALETTE.post);
  const railZ = (x, z0, z1) => box(data, x, 1.5, (z0 + z1) / 2, .15, .2, Math.abs(z1 - z0), PALETTE.rail);
  const railX = (z, x0, x1) => box(data, (x0 + x1) / 2, 1.5, z, Math.abs(x1 - x0), .2, .15, PALETTE.rail);
  for (const side of [-1, 1]) {
    const x = side * fx;
    // Long sides: close the gaps beyond the existing z 0..168 run.
    post(x, south); railZ(x, south, 0);
    for (const z of [181, north]) post(x, z);
    railZ(x, 168, 181); railZ(x, 181, north);
    const stops = [fx, 37, 25.5, gate].map(value => side * value);
    for (const end of [south, north]) {
      for (let i = 1; i < stops.length; i++) {
        const gatePost = i === stops.length - 1;
        post(stops[i], end, gatePost ? 3.2 : postHeight, gatePost ? .45 : .3);
        railX(end, stops[i - 1], stops[i]);
      }
      // A swung-open gate leaf rests against the return.
      const leafX = side * (gate + 2.6), leafZ = end + (end === south ? -.35 : .35);
      for (const y of [.55, 1.75]) box(data, leafX, y, leafZ, 5, .14, .1, PALETTE.rail);
      for (const dx of [-2.4, 0, 2.4]) box(data, leafX + dx, 1.15, leafZ, .14, 1.35, .1, PALETTE.rail);
    }
  }
  for (const lamp of YARD_EDGE_DRESSING.lamps) {
    box(data, lamp.x, 3.7, lamp.z, .22, 7.4, .22, PALETTE.steel);
    box(data, lamp.x + lamp.armX * .8, 7.3, lamp.z + lamp.armZ * .8, Math.abs(lamp.armX) * 1.6 + .1, .12, Math.abs(lamp.armZ) * 1.6 + .1, PALETTE.steel);
    box(data, lamp.x + lamp.armX * 1.55, 7.18, lamp.z + lamp.armZ * 1.55, .62, .24, .44, shade(PALETTE.steel, .8));
  }
}

// ---------------------------------------------------------------------------
// Slab edge: a timber sleeper retaining wall skins the slab's faces, and a
// dusty shoulder spills onto the apron, so the yard reads as a built pad
// rather than a tile floating over the grass.
const apronY = distance => -.85 - .0137 * Math.max(0, distance);

function addKerb(data, random) {
  const { x: sx, south, north } = YARD_EDGE_DRESSING.slab;
  const courses = [[-.98, -.6], [-.6, -.27], [-.27, .04]], length = 7.2, t = .2;
  const sleeper = () => mix(shade(PALETTE.board, .55), shade(PALETTE.board, .78), random());
  const run = (fixed, from, to, alongZ) => {
    courses.forEach(([y0, y1], course) => {
      const offset = course % 2 ? length / 2 : 0;
      for (let a = from - offset; a < to; a += length) {
        const a0 = Math.max(from, a), a1 = Math.min(to, a + length);
        if (a1 - a0 < .3) continue;
        const mid = (a0 + a1) / 2, span = a1 - a0 - .05, h = y1 - y0 - .03;
        if (alongZ) box(data, fixed, (y0 + y1) / 2, mid, t, h, span, sleeper());
        else box(data, mid, (y0 + y1) / 2, fixed, span, h, t, sleeper());
      }
    });
    for (let a = from + 3.6; a < to - 1; a += 14.4) {
      if (alongZ) box(data, fixed + Math.sign(fixed) * .12, -.44, a, .26, 1.08, .26, shade(PALETTE.steel, 1.2));
      else box(data, a, -.44, fixed + Math.sign(fixed) * .12, .26, 1.08, .26, shade(PALETTE.steel, 1.2));
    }
  };
  for (const side of [-1, 1]) run(side * (sx + t / 2), south - t, north + t, true);
  run(south - t / 2, -sx, sx, false);
  run(north + t / 2, -sx, sx, false);
}

function addShoulder(wash) {
  const { x: sx, south, north } = YARD_EDGE_DRESSING.slab, inset = .42, reach = 7.5;
  const color = [.4, .32, .2];
  // One ring of quads walking the slab outline, fading from the kerb outward.
  const corners = [[-sx, south], [sx, south], [sx, north], [-sx, north]];
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
    const nx = Math.sign(z1 - z0), nz = -Math.sign(x1 - x0); // outward normal for a CCW-from-above walk
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 6));
    for (let k = 0; k < steps; k++) {
      const a = k / steps, b = (k + 1) / steps;
      const p0 = [x0 + (x1 - x0) * a, z0 + (z1 - z0) * a], p1 = [x0 + (x1 - x0) * b, z0 + (z1 - z0) * b];
      // Corners extend so adjacent sides overlap rather than leave a notch.
      const e0 = k === 0 ? reach : 0, e1 = k === steps - 1 ? reach : 0;
      const dx = (x1 - x0) / Math.hypot(x1 - x0, z1 - z0), dz = (z1 - z0) / Math.hypot(x1 - x0, z1 - z0);
      const v = (p, along, out, alpha) => wash.vertex(p[0] + nx * out + dx * along, apronY(out) + .012, p[1] + nz * out + dz * along, color, alpha);
      const a0 = v(p0, 0, inset, .82), a1 = v(p1, 0, inset, .82);
      const b0 = v(p0, -e0 * .6, reach * .45, .5), b1 = v(p1, e1 * .6, reach * .45, .5);
      const c0 = v(p0, -e0, reach, 0), c1 = v(p1, e1, reach, 0);
      wash.indices.push(a0, b0, b1, a0, b1, a1, b0, c0, c1, b0, c1, b1);
    }
  }
}

function addGateApproach(wash, data, heads) {
  // The Yard Gate opens onto a gravel road with a weigh hut and a parked log trailer.
  const { south } = YARD_EDGE_DRESSING.slab, road = [];
  for (let z = south - 1.4; z >= -96; z -= 6) road.push([Math.sin((z + 17) / 38) * 4, z]);
  const lifted = (path, w, color, alpha) => {
    const rows = path.map(([x, z], i) => {
      const y = apronY(south - z) + .014;
      const [px, pz] = path[Math.max(0, i - 1)], [qx, qz] = path[Math.min(path.length - 1, i + 1)];
      const l = Math.hypot(qx - px, qz - pz) || 1, nx = -(qz - pz) / l, nz = (qx - px) / l;
      const fade = i > path.length - 4 ? (path.length - 1 - i) / 3 : 1;
      return [-1, -.5, .5, 1].map((o, k) => wash.vertex(x + nx * o * w / 2, y, z + nz * o * w / 2, color, (k === 0 || k === 3 ? 0 : alpha) * fade));
    });
    for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < 3; k++) {
      const a = rows[i][k], b = rows[i][k + 1], c = rows[i + 1][k + 1], d = rows[i + 1][k];
      wash.indices.push(a, d, c, a, c, b);
    }
  };
  lifted(road, 9, [.38, .31, .2], .85);
  for (const side of [-1.1, 1.1]) lifted(offsetPath(road, side), .7, PALETTE.rut, .35);

  const hutY = apronY(23), hx = 14.5, hz = -40;
  box(data, hx, hutY + 1.45, hz, 4.2, 2.9, 3.4, [.44, .41, .33]);
  box(data, hx, hutY + 3.02, hz, 4.8, .24, 4, PALETTE.tarp);
  box(data, hx - 2.11, hutY + 1.05, hz + .5, .06, 2.1, .95, shade(PALETTE.board, .7));
  box(heads, hx - 2.12, hutY + 1.75, hz - .9, .05, .7, 1.1, [1, .74, .42]);
  box(data, hx - 2.4, hutY + .04, hz - 4.5, .12, .12, 7.6, PALETTE.steel); // weigh-bridge edge
  box(data, hx - 6.6, hutY + .04, hz - 4.5, .12, .12, 7.6, PALETTE.steel);
  box(data, hx - 4.5, hutY + .02, hz - 4.5, 4.2, .06, 7.6, shade(PALETTE.steel, 1.15));

  const ty = apronY(30), tx = -15, tz = -47;
  box(data, tx, ty + 1.05, tz, 2.5, .3, 12, PALETTE.steel);
  for (const dz of [-4.6, -3.4, 3.9]) for (const s of [-1, 1]) box(data, tx + s * 1.15, ty + .48, tz + dz, .36, .96, .96, [.05, .06, .065]);
  for (const dz of [-4.8, -1.6, 1.6, 4.8]) for (const s of [-1, 1]) box(data, tx + s * 1.2, ty + 2.4, tz + dz, .14, 2.4, .14, PALETTE.steel);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const y = ty + 1.55 + row * .62, x = tx - .96 + row * .32 + i * .64;
    // Logs along the trailer's length; reuse the log helper by swapping axes.
    const r = .31;
    const ring = [];
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; ring.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    for (let k = 0; k < 6; k++) {
      const [xa, ya] = ring[k], [xb, yb] = ring[(k + 1) % 6];
      data.quad([xa, ya, tz - 5.6], [xb, yb, tz - 5.6], [xb, yb, tz + 5.6], [xa, ya, tz + 5.6], shade(PALETTE.bark, .85 + .15 * Math.sin(k)));
    }
    data.face(ring.map(([px, py]) => [px, py, tz + 5.6]), PALETTE.logEnd);
    data.face(ring.map(([px, py]) => [px, py, tz - 5.6]).reverse(), shade(PALETTE.logEnd, .85));
  }
}

// ---------------------------------------------------------------------------
// Stockpiles beyond the fence, standing on the apron (y = -0.85).
function log(data, x0, x1, y, z, radius, sides = 6) {
  const ring = [];
  for (let i = 0; i < sides; i++) {
    const a = i * TAU / sides + .3;
    ring.push([y + Math.sin(a) * radius, z + Math.cos(a) * radius, .82 + .18 * Math.sin(a)]);
  }
  for (let i = 0; i < sides; i++) {
    const [ya, za, light] = ring[i], [yb, zb] = ring[(i + 1) % sides];
    data.quad([x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb], shade(PALETTE.bark, light));
  }
  // Pale cut ends face both ways, so a deck reads as logs from the yard.
  data.face(ring.map(([py, pz]) => [x1, py, pz]), PALETTE.logEnd);
  data.face(ring.map(([py, pz]) => [x0, py, pz]).reverse(), shade(PALETTE.logEnd, .85));
}

function logDeck(data, random, cx, z0, z1, length, rows) {
  const ground = -.85, radius = .36, pitch = radius * 2.02;
  const count = Math.floor((z1 - z0) / pitch);
  for (let row = 0; row < rows; row++) {
    const inRow = count - row, start = z0 + radius + row * pitch / 2;
    for (let i = 0; i < inRow; i++) {
      const jitter = (random() - .5) * .9, r = radius * (.86 + random() * .22);
      log(data, cx - length / 2 + jitter, cx + length / 2 + jitter, ground + r + row * pitch * .87, start + i * pitch, r);
    }
  }
  for (const z of [z0 - .2, z1 + .2]) for (const dx of [-length / 3, length / 3]) box(data, cx + dx, ground + 1.6, z, .22, 3.2, .22, PALETTE.post);
}

function stickerStack(data, random, x, z, width, depth, layers) {
  let y = -.85;
  for (const dz of [-depth / 3, 0, depth / 3]) box(data, x, y + .15, z + dz, width + .2, .3, .3, PALETTE.sticker);
  y += .3;
  const tint = mix(PALETTE.lumber, PALETTE.boardPale, random() * .5);
  for (let layer = 0; layer < layers; layer++) {
    box(data, x, y + .17, z, width, .34, depth, shade(tint, .92 + random() * .12));
    y += .34;
    if (layer < layers - 1) { box(data, x, y + .05, z, width - .25, .1, depth - .25, PALETTE.sticker); y += .1; }
  }
  // A weighted tarp sheet on top.
  box(data, x, y + .05, z, width + .3, .1, depth + .3, PALETTE.tarp);
}

function addStockpiles(data, random) {
  // West, beyond the rail siding: log decks fed by the wagons.
  logDeck(data, random, -80, -24, -13, 9, 5);
  logDeck(data, random, -80, -6, 8, 10, 6);
  logDeck(data, random, -80, 14, 27, 9, 5);
  logDeck(data, random, -80, 138, 156, 10, 6);
  // South-east, near the gate: a short row of air-drying stickered stacks.
  for (const [x, z, layers] of [[67, -24, 8], [67, -15, 9], [67, -6, 7], [73.5, -22, 9], [73.5, -12, 8], [73.5, -2, 9], [67, 4, 8]]) {
    stickerStack(data, random, x, z, 3.6, 6.4, layers);
  }
  // North-east: bark and sawdust mounds where the woods begin.
  cone(data, 75, -.85, 190, 11, 6.2, 2.2, [.15, .11, .075], 12);
  cone(data, 69, -.85, 204, 6.5, 3.8, 1.2, [.36, .3, .2], 10);
}

function makeLampGlow() {
  const heads = geometry(), pools = washGeometry();
  for (const lamp of YARD_EDGE_DRESSING.lamps) {
    const hx = lamp.x + lamp.armX * 1.55, hz = lamp.z + lamp.armZ * 1.55;
    box(heads, hx, 7.04, hz, .46, .06, .32, [1, .78, .5]);
    // A soft warm pool, brightest under the head and fading to nothing.
    const center = pools.vertex(hx, .024, hz, [.42, .28, .12], 1), ring = [];
    for (let i = 0; i <= 28; i++) {
      const a = i * TAU / 28;
      // Clipped to the slab so no light pool hangs over the apron edge.
      const px = Math.max(-49.5, Math.min(49.5, hx + Math.cos(a) * 10)), pz = Math.max(-16.5, Math.min(197, hz + Math.sin(a) * 10));
      ring.push(pools.vertex(px, .024, pz, [0, 0, 0], 1));
    }
    for (let i = 0; i < 28; i++) pools.indices.push(center, ring[i + 1], ring[i]);
  }
  return { heads, pools };
}

/** Public courtyard only. Scene-owned like the environment; never per card. */
export function createYardEdgeDressing(scene, { glow = null, seed = YARD_EDGE_DRESSING.seed } = {}) {
  const root = new TransformNode('yard-edge-dressing', scene);
  const random = seeded(seed), meshes = [], materials = [];
  const make = (name, data, { unlit = false, blend = null, zOffset = 0 } = {}) => {
    const mesh = new Mesh(`yard-edge-${name}`, scene);
    const material = new StandardMaterial(`yard-edge-${name}-material`, scene);
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = unlit;
    material.emissiveColor = unlit ? Color3.White() : Color3.Black();
    material.zOffset = zOffset;
    if (blend) {
      material.alphaMode = blend;
      material.disableDepthWrite = true;
      if (blend === Constants.ALPHA_ADD) material.alpha = .999;
    }
    const vertices = new VertexData();
    vertices.positions = data.positions; vertices.indices = data.indices; vertices.colors = data.colors;
    vertices.normals = [];
    VertexData.ComputeNormals(vertices.positions, vertices.indices, vertices.normals);
    vertices.applyToMesh(mesh, false);
    mesh.material = material; mesh.parent = root;
    mesh.isPickable = false; mesh.checkCollisions = false; mesh.receiveShadows = false;
    mesh.useVertexColors = true; mesh.hasVertexAlpha = blend === Constants.ALPHA_COMBINE;
    mesh.freezeWorldMatrix();
    glow?.addExcludedMesh(mesh);
    meshes.push(mesh); materials.push(material);
    return mesh;
  };
  const floor = makeFloor(random);
  const structures = geometry();
  const lamps = makeLampGlow();
  addShoulder(floor.wash);
  addGateApproach(floor.wash, structures, lamps.heads);
  make('floor-wash', floor.wash, { blend: Constants.ALPHA_COMBINE, zOffset: -2 });
  make('floor', floor.solid);
  addPerimeter(structures);
  addKerb(structures, random);
  addStockpiles(structures, random);
  make('structures', structures);
  make('lamp-heads', lamps.heads, { unlit: true });
  make('lamp-pools', lamps.pools, { unlit: true, blend: Constants.ALPHA_ADD, zOffset: -4 });
  root.freezeWorldMatrix();
  const stats = Object.freeze({
    meshes: meshes.length, materials: materials.length,
    vertices: meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
    triangles: meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
    textureBytes: 0, lights: 0, shadowCasters: 0,
  });
  let disposed = false;
  return { root, meshes, materials, stats, dispose() {
    if (disposed) return;
    disposed = true;
    for (const mesh of meshes) { glow?.removeExcludedMesh(mesh); mesh.dispose(false, false); }
    root.dispose(false, false);
    for (const material of materials) material.dispose(false, false);
  } };
}
