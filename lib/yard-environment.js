import { Color3, Mesh, StandardMaterial, TransformNode, VertexData } from '@babylonjs/core';

// Public-yard scenery only. The playable yard remains x ±50, z -17..199.
// Everything that looks solid lives outside that rectangle or below its slab.
export const YARD_ENVIRONMENT = Object.freeze({
  seed: 'timber-courtyard-01',
  center: Object.freeze({ x: 0, z: 91 }),
  ground: Object.freeze({ minX: -48, maxX: 48, minZ: -15, maxZ: 197, y: -.85 }),
  siding: Object.freeze({ x: -68, minZ: -55, maxZ: 260, gauge: 1.5 }),
  kiln: Object.freeze({ x: -91, z: 185, width: 36, depth: 42, height: 12 }),
  skyRadius: 620,
  cameraFar: 700,
});

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
const shade = (color, factor) => color.map(value => value * factor);

function seeded(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function geometry() {
  const positions = [], indices = [], colors = [];
  const vertex = (point, color) => {
    const index = positions.length / 3;
    positions.push(...point);
    colors.push(...color, 1);
    return index;
  };
  const face = (points, color) => {
    const start = positions.length / 3;
    points.forEach(point => vertex(point, color));
    for (let i = 1; i < points.length - 1; i++) indices.push(start, start + i, start + i + 1);
  };
  const quad = (a, b, c, d, color) => face([a, b, c, d], color);
  return { positions, indices, colors, vertex, face, quad };
}

function box(data, x, y, z, width, height, depth, color) {
  const x0 = x - width / 2, x1 = x + width / 2;
  const y0 = y - height / 2, y1 = y + height / 2;
  const z0 = z - depth / 2, z1 = z + depth / 2;
  data.quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0], shade(color,.92));
  data.quad([x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1], shade(color,.82));
  data.quad([x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1], shade(color,.78));
  data.quad([x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0], color);
  data.quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1], shade(color,1.06));
  data.quad([x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0], shade(color,.7));
}

function cone(data, x, y, z, radius, height, topRadius, color, sides = 7) {
  for (let i = 0; i < sides; i++) {
    const a = i * TAU / sides, b = (i + 1) * TAU / sides;
    const p0 = [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius];
    const p1 = [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius];
    const q0 = [x + Math.cos(a) * topRadius, y + height, z + Math.sin(a) * topRadius];
    const q1 = [x + Math.cos(b) * topRadius, y + height, z + Math.sin(b) * topRadius];
    if (topRadius > 0) data.quad(p0,p1,q1,q0,shade(color,.86+.14*Math.sin(a+.7)));
    else data.face([p0,p1,q0],shade(color,.86+.14*Math.sin(a+.7)));
    data.face([[x,y,z],p1,p0],shade(color,.78));
    if (topRadius > 0) data.face([[x,y+height,z],q0,q1],color);
  }
}

function makeSky() {
  const data = geometry(), segments = 64, rows = 16, radius = YARD_ENVIRONMENT.skyRadius;
  const horizon = [.225,.272,.278], zenith = [.052,.095,.132], below = [.071,.116,.122];
  for (let row = 0; row <= rows; row++) {
    const latitude = -Math.PI / 2 + row * Math.PI / rows;
    const y = Math.sin(latitude), ring = Math.cos(latitude);
    // A broad, pale horizon gives the darker fixed ridges an actual silhouette.
    // No sun disc or luminous point competes with the live mechanism accents.
    const color = y >= 0 ? mix(horizon,zenith,Math.pow(clamp(y / .7),.62)) : mix(horizon,below,clamp(-y/.24));
    for (let segment = 0; segment <= segments; segment++) {
      const angle = segment * TAU / segments;
      data.vertex([Math.cos(angle)*ring*radius,y*radius,Math.sin(angle)*ring*radius],color);
    }
  }
  for (let row = 0; row < rows; row++) for (let segment = 0; segment < segments; segment++) {
    const a = row * (segments + 1) + segment, b = a + segments + 1;
    data.indices.push(a,b,a+1,a+1,b,b+1);
  }
  return data;
}

function makeTerrain(random) {
  const data = geometry(), segments = 96, center = YARD_ENVIRONMENT.center;
  const inner = [], middle = [], outer = [];
  let firstVariation = 0;
  for (let i = 0; i <= segments; i++) {
    const angle = i * TAU / segments, x = Math.cos(angle), z = Math.sin(angle);
    // Two metres underneath each slab edge prevents a void seam from high loft.
    // The apron is lower than the playing surface and has no collision body.
    const boundary = Math.min(48 / Math.max(Math.abs(x),1e-6),106 / Math.max(Math.abs(z),1e-6));
    const variation = i === segments ? firstVariation : random();
    if (i === 0) firstVariation = variation;
    inner.push(data.vertex([x*boundary,-.85,center.z+z*boundary],[.19,.21,.166]));
    middle.push(data.vertex([x*190,-2.8+variation*.8,center.z+z*190],[.145,.185,.158]));
    outer.push(data.vertex([x*525,-5,center.z+z*525],[.105,.152,.154]));
  }
  for (let i = 0; i < segments; i++) {
    data.indices.push(inner[i],middle[i],inner[i+1],inner[i+1],middle[i],middle[i+1]);
    data.indices.push(middle[i],outer[i],middle[i+1],middle[i+1],outer[i],outer[i+1]);
  }
  return data;
}

function makeRidge(radius, baseHeight, color, phase) {
  const data = geometry(), segments = 96, center = YARD_ENVIRONMENT.center;
  const rings = [[],[],[]];
  for (let i = 0; i <= segments; i++) {
    const angle = i * TAU / segments;
    const swell = .55+.22*Math.sin(angle*3+phase)+.15*Math.cos(angle*5-phase)+.08*Math.sin(angle*9+phase);
    const height = baseHeight + swell*22;
    const radii = [radius-58,radius,radius+58], heights = [-3,height,-4];
    for (let ring = 0; ring < 3; ring++) {
      const c = ring === 1 ? color : mix(color,[.105,.152,.154],.42);
      rings[ring].push(data.vertex([Math.cos(angle)*radii[ring],heights[ring],center.z+Math.sin(angle)*radii[ring]],c));
    }
  }
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < segments; i++) {
    data.indices.push(rings[ring][i],rings[ring+1][i],rings[ring][i+1],rings[ring][i+1],rings[ring+1][i],rings[ring+1][i+1]);
  }
  return data;
}

function makeWoods(random) {
  const data = geometry();
  const tree = (x,z,height,width) => {
    const tint = random();
    const color = mix([.075,.116,.107],[.113,.159,.14],tint);
    box(data,x,height*.24-1,z,.65,height*.48,.65,[.085,.106,.095]);
    cone(data,x,height*.14-1,z,width,height*.65,0,color,7);
    cone(data,x,height*.46-1,z,width*.7,height*.54,0,shade(color,1.06),7);
  };
  // Fixed groves surround the clearing, with a wider service opening to the west.
  for (let i = 0; i < 76; i++) {
    const angle = (i + (random()-.5)*.62) * TAU / 76;
    const radius = 162 + random()*46;
    const x = Math.cos(angle)*radius, z = 91+Math.sin(angle)*radius;
    if (x < -120 && z > 70 && z < 225) continue;
    tree(x,z,12+random()*13,4+random()*3);
  }
  // The east edge meets woodland, rather than duplicating the industrial west.
  for (let i = 0; i < 20; i++) {
    tree(82+random()*34,-23+i*13+random()*8,11+random()*8,3.5+random()*2.3);
  }
  return data;
}

function makeIndustry() {
  const walls = geometry(), roofs = geometry();
  const wallColor = [.43,.405,.32], roofColor = [.24,.285,.285];
  const shed = (x,z,width,depth,height) => {
    const y = -.7, ridge = height+3.8;
    box(walls,x,y+height/2,z,width,height,depth,wallColor);
    const a=[x-width/2,y+height,z-depth/2], b=[x+width/2,y+height,z-depth/2];
    const c=[x-width/2,y+height,z+depth/2], d=[x+width/2,y+height,z+depth/2];
    const p=[x,y+ridge,z-depth/2], q=[x,y+ridge,z+depth/2];
    walls.face([a,b,p],shade(wallColor,.9)); walls.face([d,c,q],shade(wallColor,.8));
    roofs.quad(a,p,q,c,roofColor); roofs.quad(p,b,d,q,shade(roofColor,.8));
    // Broad structural ribs survive minification; no fake glowing windows.
    for (let bay = 0; bay < 5; bay++) {
      box(walls,x+width/2+.08,y+height/2,z-depth*.4+bay*depth*.2,.18,height,.32,shade(wallColor,.65));
    }
  };
  const kiln = YARD_ENVIRONMENT.kiln;
  shed(kiln.x,kiln.z,kiln.width,kiln.depth,kiln.height);
  shed(-85,-42,22,27,7);
  // A squat old sawdust burner is the mill-side horizon landmark, beyond play.
  cone(walls,-112,-.7,239,6,16,4.8,[.31,.335,.30],10);
  cone(roofs,-112,15.3,239,6.3,6,0,[.23,.28,.285],10);
  // A covered timber rack is lower than the main mill, never a second target.
  shed(-102,70,27,29,5.8);
  return {walls,roofs};
}

function makeSiding() {
  const data = geometry(), {x,minZ,maxZ,gauge} = YARD_ENVIRONMENT.siding;
  box(data,x,-.56,(minZ+maxZ)/2,5,.3,maxZ-minZ,[.26,.265,.215]);
  for (let z = minZ+2; z < maxZ; z += 4.6) box(data,x,-.34,z,2.7,.12,.5,[.28,.255,.19]);
  for (const side of [-1,1]) box(data,x+side*gauge/2,-.20,(minZ+maxZ)/2,.13,.18,maxZ-minZ,[.38,.415,.395]);
  // One parked low wagon belongs to the distant working siding, outside the fence.
  box(data,x,1.1,204,3.3,2.6,14,[.25,.28,.24]);
  for (const z of [199,209]) for (const side of [-1,1]) box(data,x+side*1.5,-.02,z,.35,.8,1.2,[.085,.12,.125]);
  return data;
}

/** A scene-owned setting. Call once for the public Timber Courtyard, never per card. */
export function createYardEnvironment(scene, { camera = scene.activeCamera, glow = null, seed = YARD_ENVIRONMENT.seed } = {}) {
  const root = new TransformNode('yard-environment',scene);
  const random = seeded(seed), meshes = [], materials = [];
  const farBefore = camera?.maxZ;
  if (camera) camera.maxZ = Math.max(camera.maxZ,YARD_ENVIRONMENT.cameraFar);
  const farOwned = camera?.maxZ;
  const make = (name,data,{fog=false,unlit=true,sky=false}={}) => {
    const mesh = new Mesh(`yard-environment-${name}`,scene);
    const material = new StandardMaterial(`yard-environment-${name}-material`,scene);
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = unlit;
    material.emissiveColor = unlit ? Color3.White() : Color3.Black();
    material.fogEnabled = fog;
    material.backFaceCulling = false;
    if (sky) material.disableDepthWrite = true;
    const vertices = new VertexData();
    vertices.positions = data.positions; vertices.indices = data.indices; vertices.colors = data.colors;
    vertices.normals = [];
    VertexData.ComputeNormals(vertices.positions,vertices.indices,vertices.normals);
    vertices.applyToMesh(mesh,false);
    mesh.material = material;
    mesh.isPickable = false; mesh.checkCollisions = false; mesh.receiveShadows = false;
    mesh.useVertexColors = true; mesh.hasVertexAlpha = false;
    if (sky) {
      // Only the sky is camera-relative. Every landform retains world parallax.
      mesh.infiniteDistance = true;
      mesh.alwaysSelectAsActiveMesh = true;
    } else {
      mesh.parent = root;
      mesh.freezeWorldMatrix();
    }
    glow?.addExcludedMesh(mesh);
    meshes.push(mesh); materials.push(material);
    return mesh;
  };
  make('sky',makeSky(),{sky:true});
  make('ground-apron',makeTerrain(random));
  // Far terrain ignores gameplay fog, with atmospheric color already authored in.
  make('far-ridge',makeRidge(408,23,[.14,.194,.205],.7));
  make('near-ridge',makeRidge(297,11,[.108,.16,.157],2.3));
  make('woodland',makeWoods(random));
  const industry = makeIndustry();
  make('kiln-walls',industry.walls,{fog:true,unlit:false});
  make('kiln-roofs',industry.roofs,{fog:true,unlit:false});
  make('service-siding',makeSiding(),{fog:true,unlit:false});
  root.freezeWorldMatrix();
  const stats = Object.freeze({
    meshes:meshes.length,materials:materials.length,
    vertices:meshes.reduce((sum,mesh)=>sum+mesh.getTotalVertices(),0),
    triangles:meshes.reduce((sum,mesh)=>sum+mesh.getTotalIndices()/3,0),
    opaqueDraws:meshes.length,textureBytes:0,lights:0,shadowCasters:0,
  });
  let disposed = false;
  return {root,meshes,materials,stats,dispose() {
    if (disposed) return;
    disposed = true;
    for (const mesh of meshes) { glow?.removeExcludedMesh(mesh); mesh.dispose(false,false); }
    root.dispose(false,false);
    for (const material of materials) material.dispose(false,false);
    if (camera && camera.maxZ === farOwned && farBefore !== undefined) camera.maxZ = farBefore;
  }};
}
