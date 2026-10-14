import { Color3, Mesh, StandardMaterial, TransformNode, VertexData } from '@babylonjs/core';
import { stableUnitInterval } from './rail-golf-v02.js';

// An isolated workshop context. These bounds describe scenery placement only;
// the Worldcraft document/scene adapter remains the physical authority.
export const WORLDCRAFT_PRESENTATION = Object.freeze({
  bounds: Object.freeze({ minX: -32, maxX: 32, minZ: -8, maxZ: 108 }),
  cameraFar: 420,
  skyRadius: 300,
});

const TAU = Math.PI * 2;
const blend = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
const shade = (color, scale) => color.map(value => value * scale);

function geometry() {
  const positions = [], colors = [], indices = [];
  const vertex = (point, color) => {
    const index = positions.length / 3;
    positions.push(...point); colors.push(...color, 1);
    return index;
  };
  const face = (points, color) => {
    const first = positions.length / 3;
    points.forEach(point => vertex(point, color));
    for (let i = 1; i < points.length - 1; i++) indices.push(first, first + i, first + i + 1);
  };
  return { positions, colors, indices, vertex, face };
}

function box(data, x, y, z, width, height, depth, color) {
  const x0 = x - width / 2, x1 = x + width / 2;
  const y0 = y - height / 2, y1 = y + height / 2;
  const z0 = z - depth / 2, z1 = z + depth / 2;
  data.face([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], shade(color,.83));
  data.face([[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]], shade(color,.73));
  data.face([[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]], shade(color,.76));
  data.face([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], shade(color,.94));
  data.face([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], color);
  data.face([[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]], shade(color,.7));
}

function cone(data, x, y, z, radius, height, color) {
  for (let i = 0; i < 7; i++) {
    const a = i * TAU / 7, b = (i + 1) * TAU / 7;
    data.face([[x + Math.cos(a) * radius,y,z + Math.sin(a) * radius],
      [x + Math.cos(b) * radius,y,z + Math.sin(b) * radius],[x,y + height,z]],
    shade(color,.83 + .17 * Math.sin(a + .6)));
  }
}

function skyGeometry() {
  const data = geometry(), segments = 40, rows = 10, radius = WORLDCRAFT_PRESENTATION.skyRadius;
  const horizon = [.235,.274,.275], zenith = [.058,.102,.137], below = [.10,.142,.139];
  for (let row = 0; row <= rows; row++) {
    const latitude = -Math.PI / 2 + row * Math.PI / rows;
    const y = Math.sin(latitude), ring = Math.cos(latitude);
    const color = y > 0 ? blend(horizon,zenith,Math.min(1,(y/.72) ** .65)) : blend(horizon,below,Math.min(1,-y/.3));
    for (let segment = 0; segment <= segments; segment++) {
      const a = segment * TAU / segments;
      data.vertex([Math.cos(a)*ring*radius,y*radius,Math.sin(a)*ring*radius],color);
    }
  }
  for (let row = 0; row < rows; row++) for (let segment = 0; segment < segments; segment++) {
    const a = row * (segments + 1) + segment, b = a + segments + 1;
    data.indices.push(a,b,a+1,a+1,b,b+1);
  }
  return data;
}

function apronGeometry() {
  const data = geometry();
  // A slight overlap below the physical floor hides cracks without extending it.
  const inner = [[-31.8,-.12,-7.8],[31.8,-.12,-7.8],[31.8,-.12,107.8],[-31.8,-.12,107.8]];
  const outer = [[-240,-3,-220],[240,-3,-220],[240,-3,320],[-240,-3,320]];
  const ids = inner.map(point => data.vertex(point,[.19,.19,.145]));
  const outerIds = outer.map(point => data.vertex(point,[.115,.161,.15]));
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    data.indices.push(ids[i],outerIds[i],ids[next],ids[next],outerIds[i],outerIds[next]);
  }
  return data;
}

function ridgeGeometry() {
  const data = geometry(), segments = 60;
  for (let i = 0; i <= segments; i++) {
    const angle = i * TAU / segments;
    const height = 9 + Math.sin(angle * 3 + .4) * 3 + Math.sin(angle * 7) * 1.4;
    data.vertex([Math.cos(angle)*154,-3,50+Math.sin(angle)*175],[.13,.175,.164]);
    data.vertex([Math.cos(angle)*172,height,50+Math.sin(angle)*195],[.142,.19,.185]);
    data.vertex([Math.cos(angle)*215,-3,50+Math.sin(angle)*230],[.155,.201,.202]);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 3, b = a + 3;
    data.indices.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);
  }
  return data;
}

function forestGeometry() {
  const data = geometry();
  for (let i = 0; i < 30; i++) {
    const seed = stableUnitInterval(`worldcraft-tree-${i}`), angle = (i + seed * .5) * TAU / 30;
    const x = Math.cos(angle) * (78 + seed * 14), z = 50 + Math.sin(angle) * (105 + seed * 12);
    const height = 9 + seed * 7, radius = 2.5 + seed * 1.2;
    const color = blend([.08,.125,.109],[.12,.16,.134],seed);
    box(data,x,height*.25,z,.4,height*.5,.4,[.13,.125,.095]);
    cone(data,x,height*.2,z,radius,height*.48,color);
    cone(data,x,height*.4,z,radius*.76,height*.45,shade(color,1.04));
    cone(data,x,height*.59,z,radius*.53,height*.41,shade(color,1.08));
  }
  return data;
}

function serviceGeometry() {
  const data = geometry(), wood = [.23,.19,.125];
  // A sparse boundary reads as a working clearing, not another bank to shoot.
  for (const side of [-1,1]) {
    for (let i = 0; i <= 7; i++) box(data,side*35,.8,4+i*14,.25,1.6,.25,wood);
    for (const y of [.65,1.18]) box(data,side*35,y,53,.12,.13,98,wood);
  }
  for (const x of [-28,-14,0,14,28]) box(data,x,.8,112,.25,1.6,.25,wood);
  for (const y of [.65,1.18]) box(data,0,y,112,56,.13,.12,wood);
  // A low, unlit mill annex stays well outside every playable part position.
  box(data,-56,3.5,77,17,7,25,[.245,.235,.182]);
  const roof = [.115,.157,.161];
  data.face([[-65,7,64],[-56,10,64],[-56,10,90],[-65,7,90]],roof);
  data.face([[-56,10,64],[-47,7,64],[-47,7,90],[-56,10,90]],shade(roof,.84));
  data.face([[-65,7,64],[-47,7,64],[-56,10,64]],[.20,.195,.15]);
  data.face([[-47,7,90],[-65,7,90],[-56,10,90]],[.18,.18,.14]);
  box(data,-47.45,2.7,76,.03,5.4,7,[.11,.13,.115]);
  return data;
}

function trackGeometry() {
  const data = geometry();
  // Stopped carriage travels across this track, never forward along the shot.
  // The physical tee's existing upper face is y=.3; these are shallow trim.
  for (let x = -11; x <= 11; x += 2) box(data,x,.315,0,.55,.03,3.9,[.25,.21,.135]);
  for (const z of [-1.55,1.55]) box(data,0,.34,z,23.5,.06,.09,[.27,.31,.305]);
  return data;
}

export function createWorldcraftPresentation(scene) {
  const root = new TransformNode('worldcraft-presentation',scene), meshes = [], materials = {};
  const definitions = [
    ['bank',[.62,.405,.23],[.012,.007,.002],.14],
    ['ramp',[.78,.60,.34],[.017,.012,.004],.10],
    ['block',[.29,.25,.18],[0,0,0],.04],
    ['ground',[.265,.25,.178],[0,0,0],.025],
    ['steel',[.29,.35,.34],[.02,.025,.024],.35],
    ['machine',[.085,.13,.135],[.006,.01,.01],.18],
    ['cyan',[.025,.4,.44],[.045,.82,.92],.24],
    ['amber',[.46,.17,.035],[1,.27,.025],.24],
  ];
  for (const [name,diffuse,emissive,specular] of definitions) {
    const material = new StandardMaterial(`worldcraft-${name}`,scene);
    material.diffuseColor = Color3.FromArray(diffuse);
    material.emissiveColor = Color3.FromArray(emissive);
    material.specularColor = new Color3(specular,specular,specular);
    materials[name] = material;
  }
  const environment = new StandardMaterial('worldcraft-environment',scene);
  environment.diffuseColor = Color3.White(); environment.emissiveColor = Color3.White();
  environment.specularColor = Color3.Black(); environment.disableLighting = true;
  environment.fogEnabled = false; environment.backFaceCulling = false;
  materials.environment = environment;
  const sources = [['sky',skyGeometry()],['apron',apronGeometry()],['ridge',ridgeGeometry()],
    ['forest',forestGeometry()],['service',serviceGeometry()],['track',trackGeometry()]];
  for (const [name,data] of sources) {
    const mesh = new Mesh(`worldcraft-scenery-${name}`,scene), vertexData = new VertexData();
    vertexData.positions = data.positions; vertexData.indices = data.indices; vertexData.colors = data.colors;
    const normals = []; VertexData.ComputeNormals(data.positions,data.indices,normals); vertexData.normals = normals;
    vertexData.applyToMesh(mesh);
    mesh.parent = root; mesh.material = environment; mesh.isPickable = false;
    mesh.receiveShadows = false; mesh.applyFog = false;
    mesh.useVertexColors = true; mesh.hasVertexAlpha = false;
    mesh.metadata = { worldcraftScenery: true, role: name };
    if (name === 'sky') mesh.infiniteDistance = true;
    else mesh.freezeWorldMatrix();
    meshes.push(mesh);
  }
  const stats = Object.freeze({ materials: Object.keys(materials).length, meshes: meshes.length,
    vertices: meshes.reduce((sum,mesh) => sum + mesh.getTotalVertices(),0),
    triangles: meshes.reduce((sum,mesh) => sum + mesh.getTotalIndices()/3,0),
    opaqueDraws: meshes.length, textureBytes: 0, lights: 0, shadowCasters: 0, colliders: 0 });
  let disposed = false;
  return { root, meshes, materials, stats, dispose() {
    if (disposed) return;
    disposed = true; root.dispose(false,false);
    for (const material of Object.values(materials)) material.dispose(false,false);
  } };
}
