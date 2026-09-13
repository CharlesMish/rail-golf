import { COURTYARD_SKIP_PAD } from './courtyard.js';
import { CASCADE_STEPS } from './lumber-cascade.js';
import { SKY_TOKEN } from './delivery-routes.js';
import { Mesh, VertexData, MeshBuilder, PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core';

/** Shared yard, with all playable bank colliders sourced from the hole record. */
export function buildCourtyard(scene, root, materials, shadows, register, hole, options={}) {
  let serial = 0;
  const box = (name, x, y, z, width, height, depth, material, solid = false) => {
    const mesh = MeshBuilder.CreateBox(`courtyard-${name}-${serial++}`, { width, height, depth }, scene);
    if (name.startsWith('mill-')) mesh.metadata = { deliveryRoute: 'mill' };
    const featureKind=name.startsWith('mill-')?'mill':name.endsWith('-stack')?'lumber':name==='stack-body'?'lumber':name==='loading-platform'?'platform':name==='saw-carriage'?'carriage':name.startsWith('bell-')?'gantry':null;
    if(featureKind) mesh.metadata={...mesh.metadata,lineFeature:{id:`${name}:${x}:${z}`,kind:featureKind,...(featureKind==='carriage'?{assembly:'saw'}:{}),label:featureKind==='mill'?(name==='mill-roof'?'MILL ROOF REBOUND':name==='mill-column'?'MILL POST REJECT':'MILL WALL REJECT'):featureKind==='lumber'?'LUMBER REBOUND':featureKind==='carriage'?'SAW CARRIAGE REJECT':featureKind==='platform'?'LOADING PLATFORM REBOUND':'GANTRY REJECT'}};
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = materials[material];
    mesh.receiveShadows = true; shadows.addShadowCaster(mesh);
    if (solid) register(new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: .8, restitution: .1 }, scene));
    return mesh;
  };
  for (const bank of hole.banks ?? []) {
    const face = box(bank.id, bank.x, (bank.minY + bank.maxY) / 2, bank.z, bank.halfWidth * 2, bank.maxY - bank.minY, bank.halfDepth * 2, 'timber');
    face.metadata = {yardBank:bank.id,lineFeature:{id:bank.id,kind:bank.id,label:bank.id==='bank-a'?'BANK A REJECT':'BANK B REJECT'}};
    face.rotation.y = (bank.yaw ?? 0) * Math.PI / 180;
    register(new PhysicsAggregate(face, PhysicsShapeType.BOX, { mass: 0, friction: .18, restitution: .86 }, scene));
    // Visual boards remain inside the physical face's silhouette.
    for (let p = 0; p < 12; p++) {
      const board = box('bank-board', 0, 0, 0, bank.halfWidth * 2 + .025, bank.maxY - bank.minY - .3, bank.halfDepth * 2 / 12 - .07, p % 3 ? 'timber' : 'brick');
      board.parent = face; board.position.set(0, 0, -bank.halfDepth + (p + .5) * bank.halfDepth * 2 / 12);
    }
    for (const side of [-1, 1]) {
      const band = box('strike-band', 0, 0, 0, .05, .22, bank.halfDepth * 2 - .4, hole.requiredTags.length ? 'amber' : 'brick');
      band.parent = face; band.position.set(side * (bank.halfWidth + .045), 2.5, 0);
    }
    const cap = box('bank-cap', 0, 0, 0, bank.halfWidth * 2 + .3, .2, bank.halfDepth * 2 + .2, 'machine');
    cap.parent = face; cap.position.set(0, (bank.maxY - bank.minY) / 2, 0);
  }
  for (const step of CASCADE_STEPS) {
    const tread = box(step.id, step.x, step.top - .4, step.z, step.width, .8, step.depth, 'timber');
    // Dense stacked timber supports a separate, lively top face. Side hits stay dull.
    box(`${step.id}-stack`, step.x, (step.top-.8)/2, step.z, step.width, step.top-.8, step.depth, 'bark', true);
    for (let layer=0; layer < Math.floor(step.top/.7); layer++) {
      box(`${step.id}-end-grain`, step.x, .35+layer*.7, step.z+step.depth/2+.025, step.width-.2, .51, .04, layer%2 ? 'timber' : 'brick');
    }
    for (const dx of [-step.width/2+1, step.width/2-1]) {
      box(`${step.id}-band`, step.x+dx, step.top+.018, step.z, .24, .035, step.depth-.2, 'machine');
    }
    const number = CASCADE_STEPS.indexOf(step)+1;
    for (let mark=0; mark<number; mark++) box(`${step.id}-tally`,step.x+(mark-(number-1)/2)*.8,step.top+.04,step.z+step.depth/2-1,.3,.035,1.4,'sand');
    tread.metadata = { cascadeStep: step.id,lineFeature:{id:step.id,kind:step.id,label:'TREAD '+number+' KICK'} };
    register(new PhysicsAggregate(tread, PhysicsShapeType.BOX, {mass:0, friction:.18, restitution:.86}, scene));
  }
  for (const x of [10,34]) {
    box('receiving-sleeper', x, .15, 46, .35, .3, 19, 'timber');
  }
  for (let i=0;i<5;i++) box('lumber-walk-plank', 22, .06, 155+i*1.5, 11,.12,1.35,'timber');
  for (const x of [15,29]) box('station-marker',x,1.8,157,.3,3.6,.3,'machine');
  let skyToken = null;
  {
    const pad = COURTYARD_SKIP_PAD;
    box('delivery-pad', pad.x, .35, pad.z, pad.halfWidth * 2, .3, pad.halfDepth * 2, 'machine');
    for (let x = -5; x <= 5; x += 2) box('pad-stripe', pad.x + x, .51, pad.z, .55, .04, pad.halfDepth * 1.8, 'boost');
    for (const x of [-1, 1]) box('pad-edge', pad.x + x * pad.halfWidth, .32, pad.z, .18, .3, pad.halfDepth * 2, 'boost');
  }
  if (hole.id === 'mill-delivery' || options.lineLab) {
    skyToken = MeshBuilder.CreatePolyhedron('delivery-sky-token', { type: 1, size: 1.25 }, scene);
    skyToken.parent = root; skyToken.position.set(SKY_TOKEN.x, SKY_TOKEN.y, SKY_TOKEN.z); skyToken.material = materials.amber;
    for (const angle of [0, Math.PI/2]) {
      const ring = MeshBuilder.CreateTorus('sky-token-halo', { diameter: SKY_TOKEN.radius * 2, thickness: .14, tessellation: 48 }, scene);
      ring.parent = skyToken; ring.rotation.x = angle; ring.material = materials.amber;
    }
  }
  // The mill occupies the edge of the yard; the two launch corridors stay open.
  box('mill-wall', -35, 7, 104, 18, 14, 54, 'bark', true);
  for (let bay = 0; bay < 7; bay++) {
    const z = 79 + bay * 8;
    box('mill-column', -25.8, 8, z, .65, 16, .65, 'timber', true);
    box('mill-window', -25.85, 9.5, z + 2.7, .08, 3.2, 3.6, 'sand');
    box('window-mullion', -25.75, 9.5, z + 2.7, .13, 3.35, .16, 'machine');
    box('mill-sill', -25.6, 7.85, z + 2.7, .5, .2, 4, 'timber');
  }
  for (const side of [-1, 1]) {
    const roof = box('mill-roof', -35 + side * 5.1, 16, 104, 12, .45, 57, 'machine');
    roof.rotation.z = side * -.37;
    register(new PhysicsAggregate(roof, PhysicsShapeType.BOX, { mass: 0, friction: .8, restitution: .1 }, scene));
  }
  if(options.lineLab){
    // Internal triangular-prism fill closes the roof cavity, below the unchanged panels.
    // The original wall overlaps its bottom. Endcaps sit inside the roof silhouette.
    const fill=new Mesh('courtyard-roof-interior-safety',scene),data=new VertexData();
    data.positions=[-45.5,13.65,75.55, -24.5,13.65,75.55, -35,17.72,75.55,
                    -45.5,13.65,132.45, -24.5,13.65,132.45, -35,17.72,132.45];
    data.indices=[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5];
    data.applyToMesh(fill);fill.parent=root;fill.isVisible=false;fill.isPickable=false;fill.metadata={lineSafety:true};
    register(new PhysicsAggregate(fill,PhysicsShapeType.CONVEX_HULL,{mass:0,friction:.8,restitution:.1},scene));
  }
  box('ridge', -35, 18.1, 104, .35, .35, 58, 'steel');
  if (!options.loadingPlatformOverlay) box('loading-platform', -28, .55, 63, 15, 1.1, 17, 'timber', true);
  // Lumber bays: warm end grain, dark straps, low silhouettes along the right.
  for (let bay = 0; bay < 4; bay++) {
    const x = 33 + (bay % 2) * 8, z = 60 + bay * 22;
    box('stack-body', x, 2, z, 5.8, 4, 12, 'timber', true);
    for (let layer = 0; layer < 5; layer++) {
      box('stack-gap', x, .65 + layer * .72, z - 6.015, 5.85, .09, .035, 'bark');
      for (let plank = 0; plank < 5; plank++) box('end-grain', x - 2.3 + plank * 1.15, .35 + layer * .72, z - 6.04, 1.04, .59, .04, (plank + layer) % 3 ? 'brick' : 'sand');
    }
    for (const dz of [-3.5, 3.5]) box('stack-strap', x, 4.035, z + dz, 5.95, .07, .2, 'machine');
  }
  // Saw carriage and short work rails, away from the player's launch tracks.
  for (const x of [-21, -18]) box('work-track', x, .16, 108, .15, .14, 54, 'steel');
  box('saw-carriage', -19.5, 1, 110, 5, 1.6, 7, 'machine', true);
  const saw = MeshBuilder.CreateCylinder('courtyard-saw', { diameter: 5, height: .16, tessellation: 40 }, scene);
  saw.metadata={lineFeature:{id:'saw-blade',kind:'saw',label:'SAW BLADE REJECT',assembly:'saw'}};
  saw.parent = root; saw.position.set(-19.5, 3, 110); saw.rotation.z = Math.PI / 2; saw.material = materials.steel;
  register(new PhysicsAggregate(saw, PhysicsShapeType.CYLINDER, { mass: 0, friction: .8, restitution: .1 }, scene));
  // A bell gantry beyond the long landing gives the flight a destination silhouette.
  for (const x of [-9, 9]) box('bell-post', x, 8, 159, .8, 16, .8, 'timber', true);
  box('bell-beam', 0, 15.6, 159, 20, .9, 1, 'timber', true);
  const bell = MeshBuilder.CreateCylinder('courtyard-mill-bell', { diameterTop: 1, diameterBottom: 2.8, height: 2.6, tessellation: 24 }, scene);
  bell.parent = root; bell.position.set(0, 13.8, 159); bell.material = materials.brick; shadows.addShadowCaster(bell);
  register(new PhysicsAggregate(bell, PhysicsShapeType.CYLINDER, { mass: 0, friction: .5, restitution: .3 }, scene));
  for (const side of [-1, 1]) for (let bay = 0; bay < 15; bay++) {
    box('fence-post', side * 48, 1.1, bay * 12, .3, 2.2, .3, 'timber');
    if (bay < 14) box('fence-rail', side * 48, 1.5, bay * 12 + 6, .15, .2, 12, 'brick');
  }
  // Transverse delivery marks supply scale along the otherwise unmarked long carry.
  for (const z of [50, 100, 140]) for (const x of [-11, 11]) {
    box('distance-sleeper', x, .07, z, 3, .08, .3, 'timber');
  }
  return { skyToken };
}
