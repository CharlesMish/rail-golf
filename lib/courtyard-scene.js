import { MeshBuilder, PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core';

/** Shared yard, with all playable bank colliders sourced from the hole record. */
export function buildCourtyard(scene, root, materials, shadows, register, hole) {
  let serial = 0;
  const box = (name, x, y, z, width, height, depth, material, solid = false) => {
    const mesh = MeshBuilder.CreateBox(`courtyard-${name}-${serial++}`, { width, height, depth }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = materials[material];
    mesh.receiveShadows = true; shadows.addShadowCaster(mesh);
    if (solid) register(new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: .8, restitution: .1 }, scene));
    return mesh;
  };
  for (const bank of hole.banks ?? []) {
    const face = box(bank.id, bank.x, (bank.minY + bank.maxY) / 2, bank.z, bank.halfWidth * 2, bank.maxY - bank.minY, bank.halfDepth * 2, 'timber');
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
  box('ridge', -35, 18.1, 104, .35, .35, 58, 'steel');
  box('loading-platform', -28, .55, 63, 15, 1.1, 17, 'timber', true);
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
}
